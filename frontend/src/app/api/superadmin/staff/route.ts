import { fail } from "@/lib/auth";
import { requireSuperadmin } from "@/lib/authz";
import { inviteStaff, listInvites, listStaff } from "@/lib/staff-store";
import type { StaffRoleName } from "@/lib/admin-auth";
import { mailConfigured } from "@/lib/mailer";
import { rateLimit } from "@/lib/security";

export async function GET() {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    const [staff, invites] = await Promise.all([listStaff(session.token), listInvites(session.token)]);
    return Response.json({ staff, invites, me: session.admin.id, mailConfigured: mailConfigured() });
  } catch (e) {
    return fail(e);
  }
}

// Invite a new staff member (also used to resend an invite)
export async function POST(req: Request) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  const limited = await rateLimit(req, "staff-invite", 20, 10 * 60_000);
  if (limited) return limited;
  try {
    const b = await req.json();
    const role: StaffRoleName = b.role === "superadmin" ? "superadmin" : "admin";
    const who = [session.admin.first_name, session.admin.last_name].filter(Boolean).join(" ") || session.admin.email;
    return Response.json(await inviteStaff(session.token, who, { email: String(b.email ?? ""), role }), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
