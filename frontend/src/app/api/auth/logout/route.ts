import { clearSession } from "@/lib/auth";
import { clearAdminSession } from "@/lib/admin-auth";

export async function POST() {
  await Promise.all([clearSession(), clearAdminSession()]);
  return Response.json({ ok: true });
}

// Used when a stale cookie would otherwise bounce between /login and /account
export async function GET(req: Request) {
  await Promise.all([clearSession(), clearAdminSession()]);
  return Response.redirect(new URL("/login", req.url));
}
