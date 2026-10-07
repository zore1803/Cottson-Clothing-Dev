import { connectMongo, Payment } from "@/lib/mongo";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { placeOrderForPayment } from "@/lib/place-order";

// Razorpay calls this when a payment is captured, whether or not the customer's browser made it back
// (closed tab, lost connection). Configure it in the Razorpay dashboard (Settings > Webhooks) for the
// events payment.captured and order.paid, with the secret in RAZORPAY_WEBHOOK_SECRET.
// It answers 200 for anything it has handled or deliberately ignores so Razorpay doesn't retry it.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) return Response.json({ error: "Invalid signature" }, { status: 400 });

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  if (event.event !== "payment.captured" && event.event !== "order.paid") return Response.json({ ok: true, ignored: true });

  const p = event.payload?.payment?.entity;
  if (!p?.id || !p.order_id) return Response.json({ ok: true, ignored: true });

  await connectMongo();
  const pay = await Payment.findOne({ razorpayOrderId: p.order_id });
  if (!pay || pay.mode !== "razorpay") return Response.json({ ok: true, ignored: true });
  if (p.amount !== pay.amount) {
    console.error(`[razorpay webhook] amount mismatch on ${p.order_id}: paid ${p.amount}, expected ${pay.amount}`);
    return Response.json({ ok: true, ignored: true });
  }
  if (pay.status !== "created") return Response.json({ ok: true }); // already placed (or being placed) by the browser confirm

  try {
    await placeOrderForPayment(pay, p.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Order could not be placed" }, { status: 500 }); // flagged order_failed for staff; Razorpay will retry
  }
}
