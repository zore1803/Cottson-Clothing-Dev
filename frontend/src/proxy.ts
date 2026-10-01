import { NextResponse, type NextRequest } from "next/server";

// Cheap cookie-presence gate; the real session check happens server-side in /api/auth/me.
export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("cottson_session");
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/account") && !signedIn) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/register") && signedIn) {
    return NextResponse.redirect(new URL("/account", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/account/:path*", "/login", "/register"] };
