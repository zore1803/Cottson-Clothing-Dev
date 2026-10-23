import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Outgoing email over SMTP (any provider: Resend, SendGrid, SES, Gmail app password...). Configure
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM. Without them nothing is sent and callers
// fall back to showing or logging the link.

export const mailConfigured = () => !!process.env.SMTP_HOST && !!process.env.SMTP_FROM;

let transport: Transporter | undefined;
const getTransport = () =>
  (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  }));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Sends one email; returns false (and logs why) instead of throwing so a mail outage never breaks the action that triggered it */
export async function sendMail({ to, subject, text, action }: { to: string; subject: string; text: string; action?: { label: string; url: string } }) {
  if (!mailConfigured()) return false;
  try {
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0f172a;max-width:480px">
      <p>${esc(text).replace(/\n/g, "<br>")}</p>
      ${action ? `<p><a href="${esc(action.url)}" style="display:inline-block;background:#113858;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${esc(action.label)}</a></p><p style="color:#64748b;font-size:13px">Or paste this link into your browser:<br>${esc(action.url)}</p>` : ""}
      <p style="color:#64748b;font-size:13px">COTTSON Clothing</p></div>`;
    await getTransport().sendMail({ from: process.env.SMTP_FROM, to, subject, text: action ? `${text}\n\n${action.url}` : text, html });
    return true;
  } catch (e) {
    console.error("[mail] send failed", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Public base URL for links in emails */
export const siteUrl = () => (process.env.STOREFRONT_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
