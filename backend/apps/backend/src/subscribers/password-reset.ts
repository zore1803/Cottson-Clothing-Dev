import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

// Medusa emits this when a customer asks to reset their password. No email provider is
// configured yet, so the reset link is logged; swap this for a notification-module send
// once one (Resend, SendGrid, ...) is set up.
export default async function passwordResetHandler({
  event: { data },
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  if (data.actor_type !== "customer") return

  const base = process.env.STOREFRONT_URL || "http://localhost:3000"
  const link = `${base}/reset-password?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.entity_id)}`
  console.log(`[password-reset] ${data.entity_id}: ${link}`)
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
