import { fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { sendStaffPasswordReset } from "@/lib/staff-store";
import { rateLimit } from "@/lib/security";

// "Change my password": emails the signed-in admin a link to choose a new one
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  const limited = await rateLimit(req, "admin-password-reset", 5, 60 * 60_000);
  if (limited) return limited;
  try {
    await sendStaffPasswordReset(session.admin.email);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
