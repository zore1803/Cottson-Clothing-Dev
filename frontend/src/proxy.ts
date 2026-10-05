import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic gate for the admin dashboard: no session cookie → straight to the login page.
// This only checks that a cookie EXISTS (cheap, runs before rendering). The real checks — valid
// session, staff role — happen on the server in every admin page and API route (lib/admin-guard.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response =
    pathname === "/admin/login" || getSessionCookie(request)
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/admin/login", request.url));
  // The dashboard is private: never indexed, never cached by shared caches
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
