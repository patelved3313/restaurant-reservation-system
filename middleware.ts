import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isLogin = request.nextUrl.pathname === "/login";
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isApi) {
      return NextResponse.json(
        { error: "Supabase is not configured for this deployment." },
        { status: 500 },
      );
    }
    return isLogin
      ? response
      : NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !isLogin) {
    if (isApi) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLogin && !request.nextUrl.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*", "/login"],
};
