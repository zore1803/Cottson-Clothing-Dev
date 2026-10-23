import { timingSafeEqual } from "node:crypto";
import { sendMail, siteUrl } from "@/lib/mailer";

// Called by the Medusa backend (src/subscribers/password-reset.ts) when someone asks to reset a
// password, with the one-time token Medusa made. Authenticated with the secret both sides share.
// Emails the link; without SMTP configured the link is logged, as the backend did before.
export async function POST(req: Request) {
  const expected = process.env.CHECKOUT_SECRET ?? "";
  const given = req.headers.get("x-internal-secret") ?? "";
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { email, token, actor } = (await req.json().catch(() => ({}))) as { email?: string; token?: string; actor?: string };
  if (!email || !token || (actor !== "user" && actor !== "customer")) return Response.json({ error: "Invalid request" }, { status: 400 });

  const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&actor=${actor}`;
  const sent = await sendMail({
    to: email,
    subject: "Reset your COTTSON password",
    text: "We received a request to reset your password. Use the link below to choose a new one. If you did not ask for this, you can ignore this email.",
    action: { label: "Reset password", url },
  });
  if (!sent) console.log(`[password-reset] email not configured, link for ${email}: ${url}`);
  return Response.json({ ok: true, emailed: sent });
}
