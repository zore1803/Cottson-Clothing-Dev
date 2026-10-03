import { NextResponse } from "next/server";
import { connectMongo, Design } from "@/lib/mongo";
import { isValidObjectId } from "mongoose";
import { COLORS, getProduct } from "@/lib/catalog";
import { summarizeDesign } from "@/lib/designs";
import { garmentUnitPrice, CUSTOMIZATION_FEE } from "@/lib/pricing";
import { rateLimit, readJson } from "@/lib/security";
import { getToken } from "@/lib/auth";

// Turns the browser cart into a Medusa order:
// cart -> line items -> address -> shipping method -> payment session -> complete.
// Payment uses Medusa's system provider for now; Razorpay replaces it in the next phase.

const MEDUSA = process.env.NEXT_PUBLIC_MEDUSA_URL!;
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;
const REGION = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID!;

async function store<T = Record<string, unknown>>(path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(`${MEDUSA}/store${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-publishable-api-key": KEY, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Medusa ${path}: ${json?.message ?? res.status}`);
  return json as T;
}

type Item = { slug: string; colorId: string; size: string; qty: number; designId?: string };
type Variant = { id: string; options: { value: string; option?: { title: string } }[] };

const MAX_LINES = 50;
const MAX_QTY = 10_000;
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: Request) {
  const limited = rateLimit(req, "checkout", 10, 10 * 60_000);
  if (limited) return limited;
  try {
    const body = await readJson(req);
    const items = body?.items as Item[] | undefined;
    const customer = body?.customer as { name: string; email: string; phone: string; address: string; city: string; pincode: string } | undefined;
    if (!Array.isArray(items) || !items.length) return bad("Cart is empty");
    if (items.length > MAX_LINES) return bad("Too many items in one order, please split it");
    if (!customer || ["name", "email", "phone", "address", "city", "pincode"].some((k) => typeof (customer as Record<string, unknown>)[k] !== "string" || !(customer as Record<string, string>)[k].trim()))
      return bad("Please fill in all delivery details");

    // Never trust the browser's cart: check every line against the catalog. Prices are not
    // taken from the request at all; Medusa prices each variant (incl. bulk tiers) itself.
    const designIds = new Set<string>();
    for (const i of items) {
      const p = typeof i?.slug === "string" ? getProduct(i.slug) : undefined;
      if (!p) return bad("An item in your cart is no longer available");
      if (!COLORS.some((c) => c.id === i.colorId) || !p.sizes.includes(i.size)) return bad(`Invalid colour or size for ${p.title}`);
      if (!Number.isInteger(i.qty) || i.qty < 1 || i.qty > MAX_QTY) return bad("Invalid quantity");
      if (i.designId !== undefined) {
        if (typeof i.designId !== "string" || !isValidObjectId(i.designId)) return bad("Invalid design reference");
        designIds.add(i.designId);
      }
    }
    // Minimum order applies per product across its colours and sizes
    const perProduct = new Map<string, number>();
    for (const i of items) perProduct.set(i.slug, (perProduct.get(i.slug) ?? 0) + i.qty);
    for (const [slug, n] of perProduct) {
      const p = getProduct(slug)!;
      if (n < p.minBulk) return bad(`Minimum order for ${p.title} is ${p.minBulk} pieces`);
    }

    const token = await getToken();
    const savedDesigns = new Map<string, { product: string; color: string; customerId?: string | null; elements: unknown[] }>();
    if (designIds.size) {
      await connectMongo();
      const docs = await Design.find({ _id: { $in: [...designIds] } }, "product color customerId elements").lean();
      for (const d of docs) savedDesigns.set(String(d._id), d);
      for (const i of items) {
        const d = i.designId ? savedDesigns.get(i.designId) : undefined;
        if (i.designId && (!d || d.product !== i.slug || d.color !== i.colorId)) return bad("A saved design no longer matches your cart, please re-add it");
      }
    }

    // Map (product, color, size) to Medusa variant ids
    const handles = [...new Set(items.map((i) => i.slug))];
    const { products } = await store<{ products: { handle: string; variants: Variant[] }[] }>(
      `/products?${[...handles, "customization"].map((h) => `handle[]=${h}`).join("&")}&fields=handle,*variants,*variants.options,*variants.options.option&limit=50`
    );
    const feeVariant = products.find((p) => p.handle === "customization")?.variants[0];
    const variantFor = (i: Item) => {
      const color = COLORS.find((c) => c.id === i.colorId)?.name;
      const p = products.find((x) => x.handle === i.slug);
      return p?.variants.find((v) => {
        const opt = (t: string) => v.options.find((o) => o.option?.title === t)?.value;
        return opt("Garment Color") === color && opt("Garment Size") === i.size;
      });
    };

    const [first, ...last] = customer.name.trim().split(/\s+/);
    const address = {
      first_name: first,
      last_name: last.join(" ") || "-",
      address_1: customer.address,
      city: customer.city,
      postal_code: customer.pincode,
      country_code: "in",
      phone: customer.phone,
    };

    // Signed-in customers: attach the cart to their account so the order shows in their history
    const { cart } = await store<{ cart: { id: string } }>(
      "/carts",
      { region_id: REGION, email: customer.email, shipping_address: address, billing_address: address },
      token
    );

    for (const i of items) {
      const v = variantFor(i);
      if (!v) throw new Error(`No variant for ${i.slug} / ${i.colorId} / ${i.size}`);
      await store(`/carts/${cart.id}/line-items`, {
        variant_id: v.id,
        quantity: i.qty,
        metadata: i.designId ? { design_id: i.designId, design_summary: summarizeDesign(savedDesigns.get(i.designId)!) } : undefined,
      });
      // Customized pieces: add the logo fee as its own line, linked to the same design
      if (i.designId) {
        if (!feeVariant) throw new Error("Customization product missing in Medusa");
        await store(`/carts/${cart.id}/line-items`, {
          variant_id: feeVariant.id,
          quantity: i.qty,
          metadata: { design_id: i.designId, for: `${i.slug}-${i.colorId}-${i.size}` },
        });
      }
    }

    const { shipping_options } = await store<{ shipping_options: { id: string }[] }>(`/shipping-options?cart_id=${cart.id}`);
    if (!shipping_options.length) throw new Error("No shipping option for this address");
    await store(`/carts/${cart.id}/shipping-methods`, { option_id: shipping_options[0].id });

    const { payment_collection } = await store<{ payment_collection: { id: string } }>("/payment-collections", { cart_id: cart.id });
    await store(`/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" });

    const done = await store<{ type: string; order?: { id: string; display_id: number; total: number; item_total: number; shipping_total: number }; error?: { message: string } }>(
      `/carts/${cart.id}/complete`,
      {}
    );
    if (done.type !== "order" || !done.order) throw new Error(done.error?.message ?? "Could not complete the order");

    // Link saved designs to the order and move them into the production queue
    if (designIds.size) {
      await connectMongo();
      await Design.updateMany({ _id: { $in: [...designIds] } }, { medusaOrderId: done.order.id, status: "ordered" });
    }

    // Safety net: compare Medusa's charge with the storefront's pricing rules. They should match
    // exactly; a mismatch means the backend price tiers drifted from lib/pricing.ts.
    const expectedItems = items.reduce((n, i) => n + i.qty * (garmentUnitPrice(getProduct(i.slug)!.price, i.qty) + (i.designId ? CUSTOMIZATION_FEE : 0)), 0);
    if (done.order.item_total !== expectedItems) console.warn(`[checkout] price drift on order ${done.order.display_id}: Medusa ${done.order.item_total} vs expected ${expectedItems}`);

    return NextResponse.json({
      orderId: done.order.id,
      displayId: done.order.display_id,
      total: done.order.total,
      itemTotal: done.order.item_total,
      shippingTotal: done.order.shipping_total,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 500 });
  }
}
