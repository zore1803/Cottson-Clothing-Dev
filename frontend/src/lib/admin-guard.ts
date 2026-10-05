import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, STAFF_ROLES, type StaffRole } from "@/lib/auth";

export type StaffUser = { id: string; name: string; email: string; role: StaffRole };

/** The signed-in staff member, or null (not signed in, banned, or not a staff / admin role) */
export async function getStaff(): Promise<StaffUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  // role / banned come from the admin plugin's extra user fields
  const u = session?.user as { id: string; name: string; email: string; role?: string | null; banned?: boolean | null } | undefined;
  if (!u || u.banned) return null;
  const role = u.role as StaffRole | undefined;
  if (!role || !(STAFF_ROLES as readonly string[]).includes(role)) return null;
  return { id: u.id, name: u.name, email: u.email, role };
}

/** For admin PAGES: send visitors to the login page unless they're staff. Call it in every page/layout that shows data. */
export async function requireStaff(): Promise<StaffUser> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/** For admin API ROUTES: a Response to return when the caller isn't allowed, else null */
export async function denyUnlessStaff(opts: { admin?: boolean } = {}): Promise<Response | null> {
  const staff = await getStaff();
  if (!staff) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (opts.admin && staff.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  return null;
}
