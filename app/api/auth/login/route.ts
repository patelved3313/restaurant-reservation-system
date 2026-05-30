import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function loginUrl(request: Request, error?: string) {
  const url = new URL("/login", request.url);
  if (error) {
    url.searchParams.set("error", error);
  }
  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(loginUrl(request, "missing"), 303);
  }

  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth
    .signInWithPassword({ email, password })
    .catch(() => null);

  if (!authResult) {
    return NextResponse.redirect(loginUrl(request, "config"), 303);
  }

  const { data, error } = authResult;

  if (error || !data.user) {
    return NextResponse.redirect(loginUrl(request, "credentials"), 303);
  }

  const [adminUser, ownerCount] = await Promise.all([
    prisma.adminUser.findUnique({ where: { authUserId: data.user.id } }),
    prisma.restaurantOwner.count({ where: { authUserId: data.user.id } }),
  ]);

  if (!adminUser && ownerCount === 0) {
    await supabase.auth.signOut();
    return NextResponse.redirect(loginUrl(request, "unauthorized"), 303);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
