import { fail, AuthError } from "@/lib/auth";
import { requireSuperadmin } from "@/lib/authz";
import { removeStaff, sendStaffPasswordReset, setStaffRole } from "@/lib/staff-store";
import { medusa } from "@/lib/auth";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Promote (role: "superadmin") or demote (role: "admin")
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    const { role } = await req.json();
    if (role !== "admin" && role !== "superadmin") throw new AuthError("Role must be admin or superadmin");
    const member = await setStaffRole(session.token, session.admin.id, (await params).id, role);
    await audit(session, role === "superadmin" ? "staff.promoted" : "staff.demoted", member.email ?? member.id);
    return Response.json({ member });
  } catch (e) {
    return fail(e);
  }
}

// Force a password reset: emails the staff member a link to choose a new password
export async function POST(_: Request, { params }: Ctx) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    const { user } = await medusa<{ user: { email: string } }>(`/admin/users/${encodeURIComponent((await params).id)}?fields=email`, { token: session.token });
    await sendStaffPasswordReset(user.email);
    await audit(session, "staff.password_reset", user.email);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    const removed = await removeStaff(session.token, session.admin.id, (await params).id);
    await audit(session, "staff.removed", removed.email);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
