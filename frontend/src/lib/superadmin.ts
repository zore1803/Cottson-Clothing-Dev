import "server-only";
import { getAdmin, roleOf } from "@/lib/admin-auth";

/** The signed-in superadmin (verified against Medusa on every call), or null */
export async function getSuperadmin() {
  const session = await getAdmin();
  return session && roleOf(session.admin) === "superadmin" ? session : null;
}

export async function isSuperadmin() {
  return !!(await getSuperadmin());
}
