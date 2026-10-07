import "server-only";
import { medusa, AuthError, MIN_PASSWORD, isEmail } from "@/lib/auth";
import { isOwnerEmail, roleOf, type Admin, type StaffRole } from "@/lib/admin-auth";

// Staff management through Medusa's Admin API, always with the signed-in superadmin's own token.
// A staff member is a Medusa admin user; their role (admin or superadmin) is kept in the user's
// metadata. Emails in SUPERADMIN_EMAILS are owners: always superadmin and never removable here.

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  /** Listed in SUPERADMIN_EMAILS: cannot be demoted or removed from the UI */
  owner: boolean;
  createdAt: string;
};

type RawUser = Admin & { created_at: string };
const FIELDS = "id,email,first_name,last_name,metadata,created_at";

const toMember = (u: RawUser): StaffMember => ({
  id: u.id,
  email: u.email,
  name: [u.first_name, u.last_name].filter(Boolean).join(" "),
  role: roleOf(u),
  owner: isOwnerEmail(u.email),
  createdAt: u.created_at,
});

export async function listStaff(token: string): Promise<StaffMember[]> {
  const { users } = await medusa<{ users: RawUser[] }>(`/admin/users?limit=200&order=created_at&fields=${FIELDS}`, { token });
  return users.map(toMember).sort((a, b) => Number(b.role === "superadmin") - Number(a.role === "superadmin") || a.email.localeCompare(b.email));
}

async function getUser(token: string, id: string) {
  const { user } = await medusa<{ user: RawUser }>(`/admin/users/${encodeURIComponent(id)}?fields=${FIELDS}`, { token });
  return user;
}

/**
 * Creates a staff login. Medusa only creates admin users through an invite, so this invites the
 * email, registers the password and accepts the invite on the new staff member's behalf.
 */
export async function createStaff(token: string, input: { email: string; password: string; firstName?: string; lastName?: string; role: StaffRole }) {
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) throw new AuthError("Enter a valid email address");
  if (input.password.length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters`);

  // A customer account on the same email would share this login, so refuse rather than hand a customer admin access
  const { users } = await medusa<{ users: { id: string }[] }>(`/admin/users?email=${encodeURIComponent(email)}&fields=id`, { token });
  if (users.length) throw new AuthError("A staff account with this email already exists", 409);

  const { invite } = await medusa<{ invite: { id: string; token: string } }>("/admin/invites", { token, body: { email } });
  try {
    const { token: registration } = await medusa<{ token: string }>("/auth/user/emailpass/register", { body: { email, password: input.password } });
    const { user } = await medusa<{ user: RawUser }>(`/admin/invites/accept?token=${encodeURIComponent(invite.token)}`, {
      token: registration,
      body: { email, first_name: input.firstName?.trim() || undefined, last_name: input.lastName?.trim() || undefined },
    });
    await medusa(`/admin/users/${user.id}`, { token, body: { metadata: { role: input.role } } });
    return toMember({ ...user, metadata: { ...user.metadata, role: input.role } });
  } catch (e) {
    await medusa(`/admin/invites/${invite.id}`, { token, method: "DELETE" }).catch(() => {});
    if (e instanceof AuthError && e.status < 500 && /exist/i.test(e.message)) throw new AuthError("This email already has an account, so it can't be made staff", 409);
    throw e;
  }
}

/** Promotes or demotes a staff member. Never leaves the store without a superadmin, and never touches owners or yourself. */
export async function setStaffRole(token: string, actorId: string, id: string, role: StaffRole) {
  if (id === actorId) throw new AuthError("You can't change your own role", 400);
  const target = await getUser(token, id);
  if (isOwnerEmail(target.email)) throw new AuthError("This account is an owner and can't be changed here", 400);
  await medusa(`/admin/users/${encodeURIComponent(id)}`, { token, body: { metadata: { role } } });
  return toMember({ ...target, metadata: { ...target.metadata, role } });
}

/** Removes a staff member's access. Superadmins must be demoted first so a promotion is never lost by accident. */
export async function removeStaff(token: string, actorId: string, id: string) {
  if (id === actorId) throw new AuthError("You can't remove your own account", 400);
  const target = await getUser(token, id);
  if (isOwnerEmail(target.email)) throw new AuthError("This account is an owner and can't be removed here", 400);
  if (roleOf(target) === "superadmin") throw new AuthError("Demote this superadmin to admin before removing them", 400);
  await medusa(`/admin/users/${encodeURIComponent(id)}`, { token, method: "DELETE" });
}
