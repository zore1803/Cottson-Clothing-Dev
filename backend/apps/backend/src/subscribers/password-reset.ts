import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

// Medusa emits this when a customer or a staff member asks to reset their password. The storefront
// owns email sending, so the token is handed to it over an authenticated call and it mails the link.
// If that call can't be made, the link is logged so a developer can still use it.
export default async function passwordResetHandler({
  event: { data },
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  if (data.actor_type !== "customer" && data.actor_type !== "user") return

  const base = process.env.STOREFRONT_URL || "http://localhost:3000"
  const actor = data.actor_type
  const link = `${base}/reset-password?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.entity_id)}&actor=${actor}`

  try {
    const res = await fetch(`${base}/api/internal/password-reset`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": process.env.CHECKOUT_SECRET ?? "" },
      body: JSON.stringify({ email: data.entity_id, token: data.token, actor }),
    })
    if (res.ok) return
    console.warn(`[password-reset] storefront answered ${res.status}`)
  } catch (e) {
    console.warn("[password-reset] storefront unreachable", e instanceof Error ? e.message : e)
  }
  console.log(`[password-reset] ${data.entity_id}: ${link}`)
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
