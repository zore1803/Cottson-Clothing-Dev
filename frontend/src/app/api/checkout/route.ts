import { NextResponse } from "next/server";
import { connectMongo, Design, Payment } from "@/lib/mongo";
import { isValidObjectId } from "mongoose";
import { COLORS, getProduct } from "@/lib/catalog";
import { summarizeDesign } from "@/lib/designs";
import { rateLimit, readJson } from "@/lib/security";
import { store, REGION } from "@/lib/medusa-store";
import { createOrderId, paymentMode, razorpayKeyId } from "@/lib/razorpay-dummy";
import { createRazorpayOrder } from "@/lib/razorpay";
import { getToken } from "@/lib/auth";
import { getSession } from "@/lib/authz";
import { hiddenSlugs } from "@/lib/catalog-server";

// Step 1 of checkout: validates the browser cart, builds it in Medusa (items, address, shipping),
// and opens a payment order for the exact amount Medusa computed. The order itself is only placed
// in /api/checkout/confirm once the payment is verified.

type Item = { slug: string; colorId: string; size: string; qty: number; designId?: string };
type Variant = { id: string; options: { value: string; option?: { title: string } }[] };

const MAX_LINES = 50;
const MAX_QTY = 10_000;
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: Request) {
  const limited = await rateLimit(req, "checkout", 10, 10 * 60_000);
  if (limited) return limited;
  if (paymentMode() === "off") return NextResponse.json({ error: "Online payments are not available right now" }, { status: 503 });
  // Staff accounts manage orders; they do not place them
  if ((await getSession()).role === "admin") return NextResponse.json({ error: "You are signed in as an admin. Sign out to place an order." }, { status: 403 });
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
    const hidden = await hiddenSlugs(); // products a superadmin removed can't be bought, even from an old cart
    for (const i of items) {
      const p = typeof i?.slug === "string" && !hidden.has(i.slug) ? getProduct(i.slug) : undefined;
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

    // The amount comes from Medusa's priced cart, never from the browser
    const { cart: priced } = await store<{ cart: { total: number } }>(`/carts/${cart.id}?fields=total`);
    const amount = Math.round(priced.total * 100); // paise
    if (!(amount > 0)) throw new Error("Could not price your order");

    const razorpayOrderId = paymentMode() === "razorpay" ? await createRazorpayOrder(amount, cart.id) : createOrderId();
    await connectMongo();
    await Payment.create({
      razorpayOrderId,
      mode: paymentMode(),
      cartId: cart.id,
      amount,
      email: customer.email,
      lines: items.map((i) => ({ slug: i.slug, qty: i.qty, designId: i.designId })),
      designIds: [...designIds],
    });

    return NextResponse.json({ razorpayOrderId, amount, currency: "INR", keyId: razorpayKeyId(), mode: paymentMode() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    // Medusa refuses cart lines beyond the tracked stock of a variant
    if (/inventory/i.test(message)) return NextResponse.json({ error: "Some items in your cart are out of stock in the quantity you chose. Please reduce the quantity and try again." }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
