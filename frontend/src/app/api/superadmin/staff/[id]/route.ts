import { fail, AuthError } from "@/lib/auth";
import { requireSuperadmin } from "@/lib/authz";
import { removeStaff, setStaffRole } from "@/lib/staff-store";

type Ctx = { params: Promise<{ id: string }> };

// Promote (role: "superadmin") or demote (role: "admin")
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    const { role } = await req.json();
    if (role !== "admin" && role !== "superadmin") throw new AuthError("Role must be admin or superadmin");
    return Response.json({ member: await setStaffRole(session.token, session.admin.id, (await params).id, role) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    await removeStaff(session.token, session.admin.id, (await params).id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
