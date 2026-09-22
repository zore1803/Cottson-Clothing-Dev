import { NextResponse } from "next/server";
import { connectMongo, Design } from "@/lib/mongo";
import { COLORS } from "@/lib/catalog";

// Turns the browser cart into a Medusa order:
// cart -> line items -> address -> shipping method -> payment session -> complete.
// Payment uses Medusa's system provider for now; Razorpay replaces it in the next phase.

const MEDUSA = process.env.NEXT_PUBLIC_MEDUSA_URL!;
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!;
const REGION = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID!;

async function store<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${MEDUSA}/store${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-publishable-api-key": KEY },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Medusa ${path}: ${json?.message ?? res.status}`);
  return json as T;
}

type Item = { slug: string; colorId: string; size: string; qty: number; designId?: string };
type Variant = { id: string; options: { value: string; option?: { title: string } }[] };

export async function POST(req: Request) {
  try {
    const { items, customer } = (await req.json()) as {
      items: Item[];
      customer: { name: string; email: string; phone: string; address: string; city: string; pincode: string };
    };
    if (!items?.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

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

    const { cart } = await store<{ cart: { id: string } }>("/carts", {
      region_id: REGION,
      email: customer.email,
      shipping_address: address,
      billing_address: address,
    });

    for (const i of items) {
      const v = variantFor(i);
      if (!v) throw new Error(`No variant for ${i.slug} / ${i.colorId} / ${i.size}`);
      await store(`/carts/${cart.id}/line-items`, {
        variant_id: v.id,
        quantity: i.qty,
        metadata: i.designId ? { design_id: i.designId } : undefined,
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

    // Link saved designs to the order, for print-file generation later
    const designIds = items.map((i) => i.designId).filter(Boolean);
    if (designIds.length) {
      await connectMongo();
      await Design.updateMany({ _id: { $in: designIds } }, { medusaOrderId: done.order.id });
    }

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
