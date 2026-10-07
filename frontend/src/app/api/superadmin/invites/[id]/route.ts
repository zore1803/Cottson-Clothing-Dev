import { fail } from "@/lib/auth";
import { requireSuperadmin } from "@/lib/authz";
import { revokeInvite } from "@/lib/staff-store";
import { audit } from "@/lib/audit";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperadmin();
  if (session instanceof Response) return session;
  try {
    const email = await revokeInvite(session.token, (await params).id);
    await audit(session, "staff.invite_cancelled", email);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
