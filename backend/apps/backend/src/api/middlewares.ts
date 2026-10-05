import { defineMiddlewares } from "@medusajs/framework/http"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { timingSafeEqual } from "node:crypto"

// The Store API is public (anyone with the publishable key can call it), and Medusa's default
// payment provider authorizes any cart without taking money. So orders may only be created
// through the storefront server, which verifies the payment first and then sends this shared
// secret. Without it, completing a cart directly against Medusa is refused.
function requireCheckoutSecret(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const expected = process.env.CHECKOUT_SECRET
  if (!expected || expected.length < 24) {
    // Fail closed: a missing secret must never mean "open"
    return res.status(503).json({ type: "not_allowed", message: "Order placement is not configured" })
  }
  const given = String(req.headers["x-checkout-secret"] ?? "")
  const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) return res.status(403).json({ type: "not_allowed", message: "Orders can only be placed through the storefront checkout" })
  return next()
}

export default defineMiddlewares({
  routes: [{ matcher: "/store/carts/:id/complete", method: ["POST"], middlewares: [requireCheckoutSecret] }],
})
