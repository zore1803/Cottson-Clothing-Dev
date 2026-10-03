import { NextResponse, type NextRequest } from "next/server";

// Cheap cookie-presence gate; the real session checks happen server-side
// (/api/auth/me for customers, getAdmin() for staff).
export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("cottson_session");
  const isAdmin = req.cookies.has("cottson_admin");
  const { pathname, search, searchParams } = req.nextUrl;
  const toLogin = (next: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin") && !isAdmin) return toLogin(pathname + search);
  if (pathname.startsWith("/account") && !signedIn) return toLogin(pathname + search);

  if (pathname === "/login" || pathname === "/register") {
    if (isAdmin) return NextResponse.redirect(new URL("/admin", req.url));
    // A signed-in customer sent here to reach /admin must be able to sign in as staff instead
    const wantsAdmin = pathname === "/login" && (searchParams.get("next") ?? "").startsWith("/admin");
    if (signedIn && !wantsAdmin) return NextResponse.redirect(new URL("/account", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/account/:path*", "/admin/:path*", "/admin", "/login", "/register"] };
