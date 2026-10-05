import { NextResponse } from "next/server";
import { connectMongo, Payment } from "@/lib/mongo";
import { rateLimit, readJson } from "@/lib/security";
import { createPaymentId, paymentMode, sign } from "@/lib/razorpay-dummy";

// Plays the part of Razorpay's hosted checkout backend for the dummy modal: given an open payment
// order it "takes" the payment and returns the payment id and signature, or a failure. It exists
// only in dummy mode and is deleted when the real Razorpay checkout replaces the modal.
const METHODS = ["upi", "card", "netbanking"];

export async function POST(req: Request) {
  if (paymentMode() !== "dummy") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limited = rateLimit(req, "dummy-pay", 30, 10 * 60_000);
  if (limited) return limited;

  const b = await readJson(req);
  const orderId = typeof b?.razorpay_order_id === "string" ? b.razorpay_order_id : "";
  const method = typeof b?.method === "string" && METHODS.includes(b.method) ? b.method : "card";
  if (!orderId) return NextResponse.json({ error: { description: "Invalid order" } }, { status: 400 });

  await connectMongo();
  const pay = await Payment.findOne({ razorpayOrderId: orderId });
  if (!pay || pay.status !== "created") return NextResponse.json({ error: { code: "BAD_REQUEST_ERROR", description: "This payment order is not open" } }, { status: 400 });

  if (b?.outcome === "failure") {
    return NextResponse.json({ error: { code: "BAD_REQUEST_ERROR", description: "Payment failed (simulated). No money was charged." } }, { status: 400 });
  }
  await Payment.updateOne({ _id: pay._id }, { method });
  const paymentId = createPaymentId();
  return NextResponse.json({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sign(orderId, paymentId) });
}
