import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isRole } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const role = request.cookies.get(SESSION_COOKIE)?.value;

  if (!isRole(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role === "user" && request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
