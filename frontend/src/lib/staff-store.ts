import "server-only";
import { medusa, AuthError, MIN_PASSWORD, isEmail } from "@/lib/auth";
import { isOwnerEmail, type Admin, type StaffRoleName } from "@/lib/admin-auth";
import { StaffInvite, StaffRole, connectMongo } from "@/lib/mongo";
import { sendMail, siteUrl } from "@/lib/mailer";

// Staff management through Medusa's Admin API, always with the signed-in superadmin's own token.
// A staff member is a Medusa admin user. Their role (admin or superadmin) is kept in our own
// database (StaffRole), never in Medusa, because any Medusa admin could edit their own Medusa
// record. New staff are invited by email and choose their own password.

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  role: StaffRoleName;
  /** Listed in SUPERADMIN_EMAILS: cannot be demoted or removed from the UI */
  owner: boolean;
  createdAt: string;
};
export type PendingInvite = { id: string; email: string; role: StaffRoleName; invitedBy?: string; createdAt: string; expired: boolean };

type RawUser = Admin & { created_at: string };
const FIELDS = "id,email,first_name,last_name,created_at";

export async function listStaff(token: string): Promise<StaffMember[]> {
  const { users } = await medusa<{ users: RawUser[] }>(`/admin/users?limit=200&order=created_at&fields=${FIELDS}`, { token });
  await connectMongo();
  const rows = await StaffRole.find({ userId: { $in: users.map((u) => u.id) } }).lean();
  const byId = new Map(rows.map((r) => [String(r.userId), r]));
  return users
    .map((u): StaffMember => {
      const row = byId.get(u.id);
      const owner = !!row?.owner || isOwnerEmail(u.email);
      return { id: u.id, email: u.email, name: [u.first_name, u.last_name].filter(Boolean).join(" "), role: row || owner ? "superadmin" : "admin", owner, createdAt: u.created_at };
    })
    .sort((a, b) => Number(b.role === "superadmin") - Number(a.role === "superadmin") || a.email.localeCompare(b.email));
}

async function getUser(token: string, id: string) {
  const { user } = await medusa<{ user: RawUser }>(`/admin/users/${encodeURIComponent(id)}?fields=${FIELDS}`, { token });
  return user;
}

type MedusaInvite = { id: string; email: string; token: string; accepted: boolean; expires_at: string; created_at: string };

export async function listInvites(token: string): Promise<PendingInvite[]> {
  const { invites } = await medusa<{ invites: MedusaInvite[] }>("/admin/invites?limit=100", { token });
  const open = invites.filter((i) => !i.accepted);
  await connectMongo();
  const rows = await StaffInvite.find({ email: { $in: open.map((i) => i.email.toLowerCase()) } }).lean();
  const byEmail = new Map(rows.map((r) => [String(r.email), r]));
  return open.map((i) => {
    const row = byEmail.get(i.email.toLowerCase());
    return {
      id: i.id,
      email: i.email,
      role: (row?.role as StaffRoleName) ?? "admin",
      invitedBy: row?.invitedBy ?? undefined,
      createdAt: i.created_at,
      expired: new Date(i.expires_at).getTime() < Date.now(),
    };
  });
}

/**
 * Invites someone to the admin. They get an email with a link to choose their own password (or, if
 * email isn't configured, the link is returned so the superadmin can pass it on). Inviting an email
 * again replaces the old invite, which is also how "resend" works.
 */
export async function inviteStaff(token: string, invitedBy: string, input: { email: string; role: StaffRoleName }) {
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) throw new AuthError("Enter a valid email address");

  const { users } = await medusa<{ users: { id: string }[] }>(`/admin/users?email=${encodeURIComponent(email)}&fields=id`, { token });
  if (users.length) throw new AuthError("A staff account with this email already exists", 409);

  const { invites } = await medusa<{ invites: MedusaInvite[] }>(`/admin/invites?email=${encodeURIComponent(email)}&limit=20`, { token });
  for (const old of invites.filter((i) => !i.accepted)) await medusa(`/admin/invites/${old.id}`, { token, method: "DELETE" }).catch(() => {});

  const { invite } = await medusa<{ invite: MedusaInvite }>("/admin/invites", { token, body: { email } });
  await connectMongo();
  await StaffInvite.updateOne({ email }, { email, role: input.role, inviteId: invite.id, invitedBy }, { upsert: true });

  const link = `${siteUrl()}/accept-invite?token=${encodeURIComponent(invite.token)}&email=${encodeURIComponent(email)}`;
  const emailed = await sendMail({
    to: email,
    subject: "You have been invited to the COTTSON admin",
    text: `${invitedBy} invited you to the COTTSON admin as ${input.role === "superadmin" ? "a superadmin" : "an admin"}. Use the link below to choose your password and sign in.`,
    action: { label: "Accept invite", url: link },
  });
  return { email, role: input.role, emailed, link: emailed ? undefined : link };
}

export async function revokeInvite(token: string, id: string) {
  const { invite } = await medusa<{ invite: MedusaInvite }>(`/admin/invites/${encodeURIComponent(id)}`, { token });
  await medusa(`/admin/invites/${encodeURIComponent(id)}`, { token, method: "DELETE" });
  await connectMongo();
  await StaffInvite.deleteOne({ email: invite.email.toLowerCase() });
}

/**
 * Called from the public accept-invite page. Medusa checks the invite token; the role comes from
 * what the inviter chose (our database), never from the request. If the email already has a login
 * (for example a customer account), its existing password is used instead of creating one.
 */
export async function acceptInvite(input: { token: string; email: string; password: string; firstName?: string; lastName?: string }) {
  const email = input.email.trim().toLowerCase();
  if (!input.token || !isEmail(email)) throw new AuthError("This invite link is invalid. Ask for a new one.");
  if (input.password.length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters`);

  await connectMongo();
  const invite = await StaffInvite.findOne({ email }).lean();
  if (!invite) throw new AuthError("This invite link is invalid or was cancelled. Ask for a new one.", 401);

  let identityToken: string;
  try {
    ({ token: identityToken } = await medusa<{ token: string }>("/auth/user/emailpass/register", { body: { email, password: input.password } }));
  } catch (e) {
    if (!(e instanceof AuthError && e.status < 500 && /exist/i.test(e.message))) throw e;
    try {
      ({ token: identityToken } = await medusa<{ token: string }>("/auth/user/emailpass", { body: { email, password: input.password } }));
    } catch {
      throw new AuthError("This email already has an account. Enter its current password to continue.", 401);
    }
  }

  let user: RawUser;
  try {
    ({ user } = await medusa<{ user: RawUser }>(`/admin/invites/accept?token=${encodeURIComponent(input.token)}`, {
      token: identityToken,
      body: { email, first_name: input.firstName?.trim() || undefined, last_name: input.lastName?.trim() || undefined },
    }));
  } catch (e) {
    if (e instanceof AuthError && e.status < 500) throw new AuthError("This invite has expired or was already used. Ask for a new one.", 401);
    throw e;
  }

  if (invite.role === "superadmin") await StaffRole.updateOne({ userId: user.id }, { userId: user.id, email, role: "superadmin", owner: false }, { upsert: true });
  await StaffInvite.deleteOne({ email });
  return { email };
}

/** Promotes or demotes a staff member. Never touches owners or yourself, so a superadmin always remains. */
export async function setStaffRole(token: string, actorId: string, id: string, role: StaffRoleName) {
  if (id === actorId) throw new AuthError("You can't change your own role", 400);
  const target = await getUser(token, id);
  await connectMongo();
  const existing = await StaffRole.findOne({ userId: id }).lean();
  if (existing?.owner || isOwnerEmail(target.email)) throw new AuthError("This account is an owner and can't be changed here", 400);
  if (role === "superadmin") await StaffRole.updateOne({ userId: id }, { userId: id, email: target.email.toLowerCase(), role: "superadmin", owner: false }, { upsert: true });
  else await StaffRole.deleteOne({ userId: id });
  return { id, role };
}

/** Removes a staff member's access. Superadmins must be demoted first so a promotion is never lost by accident. */
export async function removeStaff(token: string, actorId: string, id: string) {
  if (id === actorId) throw new AuthError("You can't remove your own account", 400);
  const target = await getUser(token, id);
  await connectMongo();
  const row = await StaffRole.findOne({ userId: id }).lean();
  if (row?.owner || isOwnerEmail(target.email)) throw new AuthError("This account is an owner and can't be removed here", 400);
  if (row) throw new AuthError("Demote this superadmin to admin before removing them", 400);
  await medusa(`/admin/users/${encodeURIComponent(id)}`, { token, method: "DELETE" });
}

/** Emails a password reset link to a staff member (the same link they get from "Forgot password") */
export async function sendStaffPasswordReset(email: string) {
  await medusa("/auth/user/emailpass/reset-password", { body: { identifier: email.trim().toLowerCase() } });
}
