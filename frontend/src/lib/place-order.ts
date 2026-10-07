import "server-only";
import { Design, Payment } from "@/lib/mongo";
import { getProduct } from "@/lib/catalog";
import { garmentUnitPrice, CUSTOMIZATION_FEE } from "@/lib/pricing";
import { store } from "@/lib/medusa-store";

type Order = { id: string; display_id: number; total: number; item_total: number; shipping_total: number };
type PaymentDoc = { _id: unknown; cartId: string; designIds: string[]; lines: unknown[] };

export type Placed = { orderId: string; displayId: number; total: number; itemTotal: number; shippingTotal: number };

/**
 * Turns a verified payment into a Medusa order, exactly once. The caller has already proven the
 * payment is genuine (signature and/or Razorpay's own record). Claiming the payment first means the
 * browser confirm and the webhook can both arrive and only one of them places the order.
 * Returns null when someone else already claimed it.
 */
export async function placeOrderForPayment(pay: PaymentDoc, paymentId: string): Promise<Placed | null> {
  const claimed = await Payment.findOneAndUpdate({ _id: pay._id, status: "created" }, { status: "processing", razorpayPaymentId: paymentId }, { new: true });
  if (!claimed) return null;

  try {
    const { payment_collection } = await store<{ payment_collection: { id: string } }>("/payment-collections", { cart_id: pay.cartId });
    await store(`/payment-collections/${payment_collection.id}/payment-sessions`, { provider_id: "pp_system_default" });
    // Medusa only completes a cart for requests carrying this secret (backend src/api/middlewares.ts), so
    // an order can't be created without going through a verified payment.
    const done = await store<{ type: string; order?: Order; error?: { message: string } }>(`/carts/${pay.cartId}/complete`, {}, undefined, { "x-checkout-secret": process.env.CHECKOUT_SECRET ?? "" });
    if (done.type !== "order" || !done.order) throw new Error(done.error?.message ?? "Could not complete the order");
    const order = done.order;

    await Payment.updateOne({ _id: pay._id }, { status: "paid", medusaOrderId: order.id, displayId: order.display_id, orderTotal: order.total });

    // Link saved designs to the order and move them into the production queue
    if (pay.designIds.length) await Design.updateMany({ _id: { $in: pay.designIds } }, { medusaOrderId: order.id, status: "ordered" });

    // Safety net: Medusa's charge should equal the storefront's pricing rules; a mismatch means the
    // backend price tiers drifted from lib/pricing.ts.
    const lines = pay.lines as { slug: string; qty: number; designId?: string; price?: number }[];
    const expected = lines.reduce((n, i) => n + i.qty * (garmentUnitPrice(i.price ?? getProduct(i.slug)?.price ?? 0, i.qty) + (i.designId ? CUSTOMIZATION_FEE : 0)), 0);
    if (order.item_total !== expected) console.warn(`[checkout] price drift on order ${order.display_id}: Medusa ${order.item_total} vs expected ${expected}`);

    return { orderId: order.id, displayId: order.display_id, total: order.total, itemTotal: order.item_total, shippingTotal: order.shipping_total };
  } catch (e) {
    // The payment went through but the order didn't: keep it flagged so staff can reconcile
    console.error(`[checkout] order failed after payment ${paymentId}`, e);
    await Payment.updateOne({ _id: pay._id }, { status: "order_failed", error: e instanceof Error ? e.message : "Order failed" });
    throw new OrderFailedError(paymentId);
  }
}

export class OrderFailedError extends Error {
  constructor(public paymentId: string) {
    super(`Your payment (${paymentId}) was received but we couldn't place the order. Please contact us with this reference.`);
  }
}
