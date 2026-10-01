import { medusa, setSession, isEmail, fail, AuthError } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!isEmail(email) || !password) throw new AuthError("Enter your email and password");
    let token: string;
    try {
      ({ token } = await medusa<{ token: string }>("/auth/customer/emailpass", {
        body: { email: email.trim().toLowerCase(), password },
      }));
    } catch (e) {
      if (e instanceof AuthError && e.status < 500) throw new AuthError("Incorrect email or password", 401);
      throw e;
    }
    await setSession(token);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
