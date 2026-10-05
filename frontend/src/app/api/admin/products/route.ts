import { fail } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { listCatalog } from "@/lib/admin-store";

// Catalog with per-variant stock for the admin Products tab
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof Response) return session;
  try {
    return Response.json(await listCatalog(session.token));
  } catch (e) {
    return fail(e);
  }
}
