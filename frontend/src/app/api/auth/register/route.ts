import { medusa, setSession, isEmail, fail, AuthError, MIN_PASSWORD } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

export async function POST(req: Request) {
  const limited = await rateLimit(req, "register", 5, 60 * 60_000);
  if (limited) return limited;
  try {
    const b = await req.json();
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    if (!String(b.firstName ?? "").trim()) throw new AuthError("Enter your first name");
    if (!isEmail(email)) throw new AuthError("Enter a valid email address");
    if (password.length < MIN_PASSWORD) throw new AuthError(`Password must be at least ${MIN_PASSWORD} characters`);

    // 1. create the login identity, 2. create the customer profile with that token, 3. sign in
    let reg: { token: string };
    try {
      reg = await medusa<{ token: string }>("/auth/customer/emailpass/register", { body: { email, password } });
    } catch (e) {
      if (e instanceof AuthError && e.status < 500) throw new AuthError("An account with this email already exists. Try signing in.", 409);
      throw e;
    }
    await medusa("/store/customers", {
      token: reg.token,
      body: {
        email,
        first_name: String(b.firstName).trim(),
        last_name: String(b.lastName ?? "").trim(),
        phone: String(b.phone ?? "").trim() || undefined,
      },
    });
    const { token } = await medusa<{ token: string }>("/auth/customer/emailpass", { body: { email, password } });
    await setSession(token);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
