import { clearSession } from "@/lib/auth";

export async function POST() {
  await clearSession();
  return Response.json({ ok: true });
}

// Used when a stale cookie would otherwise bounce between /login and /account
export async function GET(req: Request) {
  await clearSession();
  return Response.redirect(new URL("/login", req.url));
}
