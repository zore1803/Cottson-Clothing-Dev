import "server-only";
import { cookies } from "next/headers";
import { AuthError, medusa } from "@/lib/auth";
import { StaffRole, connectMongo } from "@/lib/mongo";

// Staff accounts are Medusa admin users (created with `npx medusa user`). Signing in with their
// email and password on the normal login screen gives a Medusa JWT, kept in its own httpOnly
// cookie, separate from the customer session.

export const ADMIN_COOKIE = "cottson_admin";
const ADMIN_MAX_AGE = 60 * 60 * 24; // matches Medusa's default 1d JWT lifetime

export type Admin = { id: string; email: string; first_name: string | null; last_name: string | null };
export type StaffRoleName = "admin" | "superadmin";

/** Emails in SUPERADMIN_EMAILS become owners the first time they are seen: always superadmin, never removable from the UI */
export const isOwnerEmail = (email: string) =>
  (process.env.SUPERADMIN_EMAILS ?? "").split(",").some((e) => e.trim() && e.trim().toLowerCase() === email.toLowerCase());

/**
 * Staff role from our own database (see StaffRole in lib/mongo.ts), never from anything an admin can
 * edit in Medusa. If the database can't be reached, the answer is the lower role.
 */
export async function roleOf(a: Pick<Admin, "id" | "email">): Promise<StaffRoleName> {
  try {
    await connectMongo();
    const row = await StaffRole.findOne({ userId: a.id }).lean();
    if (row) return "superadmin";
    if (isOwnerEmail(a.email)) {
      await StaffRole.updateOne({ userId: a.id }, { userId: a.id, email: a.email.toLowerCase(), role: "superadmin", owner: true }, { upsert: true });
      return "superadmin";
    }
  } catch {
    /* fall through to the lower role */
  }
  return "admin";
}

/**
 * Exchanges admin credentials for a Medusa token; throws AuthError when they are not an admin's.
 * Medusa's emailpass identity is shared with customers, so the endpoint also accepts a customer's
 * valid password and returns a token with no admin behind it. Only a token that /admin/users/me
 * accepts counts.
 */
export async function adminLogin(email: string, password: string) {
  const { token } = await medusa<{ token: string }>("/auth/user/emailpass", { body: { email, password } });
  let admin: Admin;
  try {
    ({ user: admin } = await medusa<{ user: Admin }>("/admin/users/me", { token }));
  } catch (e) {
    if (e instanceof AuthError && e.status < 500) throw new AuthError("Not an admin account", 401);
    throw e;
  }
  return { token, admin };
}

export async function setAdminSession(token: string) {
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** The signed-in admin and their Medusa token, or null. The token is verified against Medusa on every call. */
export async function getAdmin(): Promise<{ admin: Admin; token: string } | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { user } = await medusa<{ user: Admin }>("/admin/users/me", { token });
    return { admin: user, token };
  } catch {
    return null;
  }
}

export { AuthError };
