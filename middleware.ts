import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const expected = await createSessionToken();
  const isAuthed = Boolean(token && token === expected);
  const isLogin = request.nextUrl.pathname === "/login";

  if (!isAuthed && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthed && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*", "/login"],
};
