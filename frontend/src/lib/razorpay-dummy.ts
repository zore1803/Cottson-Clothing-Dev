import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Stand-in for Razorpay while there is no merchant account. It follows Razorpay's real contract so
// swapping it out later is small:
//   1. server creates an order (id + amount in paise)             -> createOrderId / checkout "start"
//   2. the browser's checkout returns payment_id + signature      -> the dummy modal + /api/payments/dummy/pay
//   3. server verifies signature = HMAC_SHA256(secret, "<order_id>|<payment_id>")   -> verifySignature
// For the real thing: create the order with Razorpay's Orders API, open Razorpay's checkout.js with the
// order id, and keep verifySignature + /api/checkout/confirm exactly as they are (using the live secret).

const DEV_SECRET = "dummy_razorpay_secret_not_for_production";

/** True when real Razorpay credentials are configured */
export const razorpayConfigured = () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

/**
 * "razorpay": real payments (RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set).
 * "dummy": the simulated checkout, the default in development when there are no keys.
 * "off": checkout disabled, the default in production until keys are set.
 * PAYMENT_MODE overrides, but "razorpay" without keys is refused (treated as off).
 */
export const paymentMode = (): "razorpay" | "dummy" | "off" => {
  const forced = process.env.PAYMENT_MODE;
  if (forced === "razorpay") return razorpayConfigured() ? "razorpay" : "off";
  if (forced === "dummy" || forced === "off") return forced;
  if (razorpayConfigured()) return "razorpay";
  return process.env.NODE_ENV === "production" ? "off" : "dummy";
};

const secret = () => {
  if (process.env.RAZORPAY_KEY_SECRET) return process.env.RAZORPAY_KEY_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("RAZORPAY_KEY_SECRET is not set");
  return DEV_SECRET;
};

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "rzp_test_dummy";

const rzpId = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url").replace(/[-_]/g, "x").slice(0, 14)}`;
export const createOrderId = () => rzpId("order");
export const createPaymentId = () => rzpId("pay");

export const sign = (orderId: string, paymentId: string) => createHmac("sha256", secret()).update(`${orderId}|${paymentId}`).digest("hex");

export function verifySignature(orderId: string, paymentId: string, signature: string) {
  const expected = Buffer.from(sign(orderId, paymentId));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
