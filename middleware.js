import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/maintenance")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico).*)",
};
