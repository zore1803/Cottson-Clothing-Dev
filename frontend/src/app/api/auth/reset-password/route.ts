import { medusa, isEmail, fail, AuthError, MIN_PASSWORD } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "reset", 10, 60 * 60_000);
  if (limited) return limited;
  try {
    const { token, email, password, actor } = await req.json();
    const actorType = actor === "user" ? "user" : "customer";
    if (!token || !isEmail(email)) throw new AuthError("This reset link is invalid. Request a new one.");
    if (String(password ?? "").length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters`);
    try {
      await medusa(`/auth/${actorType}/emailpass/update`, { token, body: { email: email.trim().toLowerCase(), password } });
    } catch (e) {
      if (e instanceof AuthError && e.status < 500) throw new AuthError("This reset link has expired. Request a new one.", 401);
      throw e;
    }
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
