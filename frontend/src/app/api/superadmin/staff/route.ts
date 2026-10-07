import { fail } from "@/lib/auth";
import { requireSuperadmin } from "@/lib/authz";
import { createStaff, listStaff } from "@/lib/staff-store";
import type { StaffRole } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/security";

export async function GET() {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    return Response.json({ staff: await listStaff(session.token), me: session.admin.id });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  const limited = rateLimit(req, "staff-create", 20, 10 * 60_000);
  if (limited) return limited;
  try {
    const b = await req.json();
    const role: StaffRole = b.role === "superadmin" ? "superadmin" : "admin";
    const member = await createStaff(session.token, { email: String(b.email ?? ""), password: String(b.password ?? ""), firstName: b.firstName, lastName: b.lastName, role });
    return Response.json({ member }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
