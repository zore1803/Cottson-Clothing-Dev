import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/superadmin";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(ADMIN_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
