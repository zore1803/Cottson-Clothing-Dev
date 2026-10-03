import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getCustomer, getToken, type Customer } from "@/lib/auth";
import { ADMIN_COOKIE, getAdmin, type Admin } from "@/lib/admin-auth";

// Roles, lowest to highest. An admin is a separate kind of account (a Medusa admin user, not a
// customer) and sits above customers: it may read anything a customer owns, but it has no
// customer profile of its own, so customer-only actions (own account, own designs, checkout) are
// not available to it. Every protected route goes through here instead of checking cookies itself.
export type Role = "guest" | "customer" | "admin";
const RANK: Record<Role, number> = { guest: 0, customer: 1, admin: 2 };

export type Session =
  | { role: "guest" }
  | { role: "customer"; customer: Customer; token: string }
  | { role: "admin"; admin: Admin; token: string };

/** Who is making this request. Admin wins if both cookies are somehow present. Verified against Medusa, never trusted from the cookie alone. */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  if (jar.has(ADMIN_COOKIE)) {
    const a = await getAdmin();
    if (a) return { role: "admin", admin: a.admin, token: a.token };
  }
  if (jar.has(SESSION_COOKIE)) {
    const [customer, token] = await Promise.all([getCustomer(), getToken()]);
    if (customer && token) return { role: "customer", customer, token };
  }
  return { role: "guest" };
}

export const atLeast = (s: Session, min: Role) => RANK[s.role] >= RANK[min];

const deny = (status: 401 | 403, error: string) => Response.json({ error }, { status });

/** Route guard for the admin API: only admins pass (401 for anyone not signed in as one) */
export async function requireAdmin() {
  const s = await getSession();
  return s.role === "admin" ? s : deny(401, "Admin sign-in required");
}

/** Route guard for customer-only actions (own account, own designs). Admins are refused: they have no customer profile. */
export async function requireCustomer() {
  const s = await getSession();
  if (s.role === "customer") return s;
  return s.role === "admin" ? deny(403, "This action is for customer accounts") : deny(401, "Please sign in");
}

/** Whether the session may read a resource owned by `ownerId` (a customer id): the owner, or anyone above customers */
export const canRead = (s: Session, ownerId?: string | null) => s.role === "admin" || (s.role === "customer" && !!ownerId && s.customer.id === ownerId);
