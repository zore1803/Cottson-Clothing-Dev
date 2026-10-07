import { fail } from "@/lib/auth";
import { acceptInvite } from "@/lib/staff-store";
import { rateLimit, readJson, clean } from "@/lib/security";

// Public: a new staff member chooses their password from the emailed invite link
export async function POST(req: Request) {
  const limited = await rateLimit(req, "accept-invite", 10, 60 * 60_000);
  if (limited) return limited;
  try {
    const b = await readJson(req);
    await acceptInvite({
      token: clean(b?.token, 2000),
      email: clean(b?.email, 200),
      password: typeof b?.password === "string" ? b.password : "",
      firstName: clean(b?.firstName, 80),
      lastName: clean(b?.lastName, 80),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
