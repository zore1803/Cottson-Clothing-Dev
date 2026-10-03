import { NextResponse } from "next/server";
import { connectMongo, Design, Payment } from "@/lib/mongo";
import { getProduct } from "@/lib/catalog";
import { garmentUnitPrice, CUSTOMIZATION_FEE } from "@/lib/pricing";
import { store } from "@/lib/medusa-store";
import { rateLimit, readJson } from "@/lib/security";
import { verifySignature } from "@/lib/razorpay-dummy";
import { getSession } from "@/lib/authz";

// Step 2 of checkout: the browser reports the payment result (Razorpay's three fields). Only a payment
// whose signature verifies places the order; the cart then becomes a Medusa order exactly once.

type Order = { id: string; display_id: number; total: number; item_total: number; shipping_total: number };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const limited = rateLimit(req, "checkout-confirm", 20, 10 * 60_000);
  if (limited) return limited;

  if ((await getSession()).role === "admin") return fail("You are signed in as an admin. Sign out to place an order.", 403);

  const b = await readJson(req);
  const orderId = typeof b?.razorpay_order_id === "string" ? b.razorpay_order_id : "";
  const paymentId = typeof b?.razorpay_payment_id === "string" ? b.razorpay_payment_id : "";
  const signature = typeof b?.razorpay_signature === "string" ? b.razorpay_signature : "";
  if (!orderId || !paymentId || !signature) return fail("Missing payment details", 400);

  await connectMongo();
  const pay = await Payment.findOne({ razorpayOrderId: orderId });
  if (!pay) return fail("Unknown payment", 404);

  // Replays of an already-completed payment just return the same order
  if (pay.status === "paid" && pay.medusaOrderId) {
    return NextResponse.json({ orderId: pay.medusaOrderId, displayId: pay.displayId, total: pay.orderTotal });
  }

  if (!verifySignature(orderId, paymentId, signature)) {
    await Payment.updateOne({ _id: pay._id, status: "created" }, { status: "failed", error: "Signature mismatch" });
    return fail("Payment could not be verified", 400);
  }

  // Claim the payment so two concurrent confirms can't both place an order
  const claimed = await Payment.findOneAndUpdate({ _id: pay._id, status: "created" }, { status: "processing", razorpayPaymentId: paymentId }, { new: true });
  if (!claimed) return fail("This payment can no longer be used", 409);

  try {
    const { payment_collection } = await store<{ payment_collection: { id: string } }>("/payment-collections", { cart_id: pay.cartId });
    await store(`/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" });
    // Medusa only completes a cart for requests carrying this secret (backend src/api/middlewares.ts), so
    // an order can't be created without going through this verified payment.
    const done = await store<{ type: string; order?: Order; error?: { message: string } }>(`/carts/${pay.cartId}/complete`, {}, undefined, { "x-checkout-secret": process.env.CHECKOUT_SECRET ?? "" });
    if (done.type !== "order" || !done.order) throw new Error(done.error?.message ?? "Could not complete the order");
    const order = done.order;

    await Payment.updateOne({ _id: pay._id }, { status: "paid", medusaOrderId: order.id, displayId: order.display_id, orderTotal: order.total });

    // Link saved designs to the order and move them into the production queue
    if (pay.designIds.length) await Design.updateMany({ _id: { $in: pay.designIds } }, { medusaOrderId: order.id, status: "ordered" });

    // Safety net: Medusa's charge should equal the storefront's pricing rules; a mismatch means the
    // backend price tiers drifted from lib/pricing.ts.
    const lines = pay.lines as { slug: string; qty: number; designId?: string }[];
    const expected = lines.reduce((n, i) => n + i.qty * (garmentUnitPrice(getProduct(i.slug)!.price, i.qty) + (i.designId ? CUSTOMIZATION_FEE : 0)), 0);
    if (order.item_total !== expected) console.warn(`[checkout] price drift on order ${order.display_id}: Medusa ${order.item_total} vs expected ${expected}`);

    return NextResponse.json({ orderId: order.id, displayId: order.display_id, total: order.total, itemTotal: order.item_total, shippingTotal: order.shipping_total });
  } catch (e) {
    // The payment went through but the order didn't: keep it flagged so staff can reconcile
    console.error(`[checkout] order failed after payment ${paymentId}`, e);
    await Payment.updateOne({ _id: pay._id }, { status: "order_failed", error: e instanceof Error ? e.message : "Order failed" });
    return fail(`Your payment (${paymentId}) was received but we couldn't place the order. Please contact us with this reference.`, 500);
  }
}
