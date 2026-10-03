import { NextResponse, type NextRequest } from "next/server";

// First line of defence, running before any page or API route. It only looks at cookie presence and
// request headers; every route still verifies the session against Medusa itself (lib/authz.ts).
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("cottson_session");
  const isAdmin = req.cookies.has("cottson_admin");
  const { pathname, search, searchParams } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    // CSRF: a state-changing request must come from this site. Browsers always send Origin on
    // cross-site POSTs, so a foreign Origin (or a cross-site fetch) is refused outright.
    if (UNSAFE.has(req.method)) {
      const origin = req.headers.get("origin");
      const foreign = origin ? new URL(origin).host !== req.headers.get("host") : req.headers.get("sec-fetch-site") === "cross-site";
      if (foreign) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
    // The admin API answers 401 to anyone without an admin session before it reaches the route
    if (pathname.startsWith("/api/admin") && !isAdmin) return NextResponse.json({ error: "Admin sign-in required" }, { status: 401 });
    return NextResponse.next();
  }

  // Admins manage the store; they don't use the storefront. Every page outside /admin sends them to the dashboard.
  if (isAdmin && !pathname.startsWith("/admin")) return NextResponse.redirect(new URL("/admin", req.url));

  const toLogin = (next: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin") && !isAdmin) return toLogin(pathname + search);
  if (pathname.startsWith("/account") && !signedIn) return toLogin(pathname + search);

  if (pathname === "/login" || pathname === "/register") {
    // A signed-in customer sent here to reach /admin must be able to sign in as staff instead
    const wantsAdmin = pathname === "/login" && (searchParams.get("next") ?? "").startsWith("/admin");
    if (signedIn && !wantsAdmin) return NextResponse.redirect(new URL("/account", req.url));
  }
  return NextResponse.next();
}

// API routes, plus every page (but not Next internals or files with an extension such as images)
export const config = { matcher: ["/api/:path*", "/((?!_next/|api/|.*\\..*).*)"] };
