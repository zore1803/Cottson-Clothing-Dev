import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Real Razorpay (https://razorpay.com/docs/api/). The browser opens Razorpay's checkout.js with an
// order created here; it comes back with payment id + signature, which /api/checkout/confirm
// verifies. A webhook (/api/payments/razorpay/webhook) covers the case where the customer closes
// the tab after paying, so a paid cart still becomes an order.

const API = "https://api.razorpay.com/v1";
const auth = () => `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;

type RzpError = { error?: { description?: string } };
async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: auth(), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & RzpError;
  if (!res.ok) throw new Error(`Razorpay: ${json.error?.description ?? res.statusText}`);
  return json;
}

/** Creates the payment order for an amount in paise; its id is what the browser checkout pays against */
export async function createRazorpayOrder(amount: number, receipt: string) {
  const o = await call<{ id: string }>("/orders", { amount, currency: "INR", receipt: receipt.slice(0, 40) });
  return o.id;
}

export type RazorpayPayment = { id: string; order_id: string; status: string; amount: number; currency: string; method?: string };

/**
 * Asks Razorpay itself whether this payment really paid this order for this amount, capturing it
 * if the account is set to manual capture. A valid signature alone proves the browser got the ids
 * from Razorpay; this also proves the amount.
 */
export async function verifyPaymentWithRazorpay(paymentId: string, orderId: string, amount: number): Promise<RazorpayPayment> {
  let p = await call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
  if (p.order_id !== orderId) throw new Error("Payment belongs to a different order");
  if (p.amount !== amount || p.currency !== "INR") throw new Error("Payment amount does not match the order");
  if (p.status === "authorized") p = await call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, { amount, currency: "INR" });
  if (p.status !== "captured") throw new Error(`Payment is ${p.status}, not captured`);
  return p;
}

/** Webhook bodies are signed with HMAC-SHA256(RAZORPAY_WEBHOOK_SECRET, raw body) */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
