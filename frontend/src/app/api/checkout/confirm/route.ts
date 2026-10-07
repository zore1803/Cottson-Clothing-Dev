import { NextResponse } from "next/server";
import { connectMongo, Payment } from "@/lib/mongo";
import { rateLimit, readJson } from "@/lib/security";
import { paymentMode, verifySignature } from "@/lib/razorpay-dummy";
import { verifyPaymentWithRazorpay } from "@/lib/razorpay";
import { OrderFailedError, placeOrderForPayment } from "@/lib/place-order";
import { getSession } from "@/lib/authz";

// Step 2 of checkout: the browser reports the payment result (Razorpay's three fields). Only a payment
// whose signature verifies places the order; the cart then becomes a Medusa order exactly once.

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const limited = await rateLimit(req, "checkout-confirm", 20, 10 * 60_000);
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

  try {
    // With real Razorpay, also ask Razorpay whether this payment really covers this order and amount
    if (paymentMode() === "razorpay") await verifyPaymentWithRazorpay(paymentId, orderId, pay.amount);
  } catch (e) {
    // Left open on purpose: if Razorpay was just unreachable the customer can retry, and the webhook still covers a real payment
    console.error("[checkout] could not verify payment with Razorpay", e);
    return fail("We could not verify your payment yet. If money was taken, your order will still be placed; otherwise please try again.", 502);
  }

  try {
    const placed = await placeOrderForPayment(pay, paymentId);
    // The webhook may have placed it a moment ago: report that order instead of an error
    if (!placed) {
      const again = await Payment.findOne({ _id: pay._id });
      if (again?.status === "paid" && again.medusaOrderId) return NextResponse.json({ orderId: again.medusaOrderId, displayId: again.displayId, total: again.orderTotal });
      return fail("This payment can no longer be used", 409);
    }
    return NextResponse.json(placed);
  } catch (e) {
    return fail(e instanceof OrderFailedError ? e.message : "Could not place your order", 500);
  }
}
