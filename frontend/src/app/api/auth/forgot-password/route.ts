import { medusa, isEmail, fail, AuthError } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

// Always answers the same way so the form cannot be used to discover which emails have accounts.
export async function POST(req: Request) {
  const limited = rateLimit(req, "forgot", 5, 60 * 60_000);
  if (limited) return limited;
  try {
    const { email } = await req.json();
    if (!isEmail(email)) throw new AuthError("Enter a valid email address");
    await medusa("/auth/customer/emailpass/reset-password", { body: { identifier: email.trim().toLowerCase() } }).catch((e) => {
      if (e instanceof AuthError && e.status >= 500) throw e;
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
