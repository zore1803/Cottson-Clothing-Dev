import { medusa, setSession, clearSession, isEmail, fail, AuthError } from "@/lib/auth";
import { adminLogin, setAdminSession, clearAdminSession, roleOf } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/security";

// One login screen for everyone. Staff (Medusa admin users) are checked first, so a staff email
// always signs in as admin even if the same email also has a customer account; everyone else
// falls through to the normal customer login. The response says which one it was so the form
// can send admins to /admin.
export async function POST(req: Request) {
  const limited = await rateLimit(req, "login", 10, 10 * 60_000);
  if (limited) return limited;
  try {
    const { email, password } = await req.json();
    if (!isEmail(email) || !password) throw new AuthError("Enter your email and password");
    const address = email.trim().toLowerCase();

    try {
      const { token, admin } = await adminLogin(address, password);
      await clearSession(); // signing in as staff replaces any customer session
      await setAdminSession(token);
      return Response.json({ ok: true, admin: true, superadmin: (await roleOf(admin)) === "superadmin" });
    } catch (e) {
      if (!(e instanceof AuthError) || e.status >= 500) throw e;
    }

    try {
      const { token } = await medusa<{ token: string }>("/auth/customer/emailpass", { body: { email: address, password } });
      await clearAdminSession();
      await setSession(token);
      return Response.json({ ok: true, admin: false });
    } catch (e) {
      if (e instanceof AuthError && e.status < 500) throw new AuthError("Incorrect email or password", 401);
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
