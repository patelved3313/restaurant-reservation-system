import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: {
    id: string;
    email: string;
  };
  role: "ADMIN" | "OWNER";
  restaurantIds: string[];
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const [adminUser, ownerRows] = await Promise.all([
    prisma.adminUser.findUnique({ where: { authUserId: user.id } }),
    prisma.restaurantOwner.findMany({
      where: { authUserId: user.id },
      select: { profileId: true },
    }),
  ]);

  if (adminUser?.role === "ADMIN") {
    return {
      user: { id: user.id, email: user.email },
      role: "ADMIN",
      restaurantIds: [],
    };
  }

  if (ownerRows.length > 0) {
    return {
      user: { id: user.id, email: user.email },
      role: "OWNER",
      restaurantIds: ownerRows.map((owner) => owner.profileId),
    };
  }

  return null;
}

export async function requireAuthContext() {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login?error=unauthorized");
  }

  return context;
}

export function restaurantScopeWhere(context: AuthContext) {
  return context.role === "ADMIN" ? {} : { profileId: { in: context.restaurantIds } };
}

export function locationScopeWhere(context: AuthContext) {
  return context.role === "ADMIN"
    ? {}
    : { location: { profileId: { in: context.restaurantIds } } };
}

export async function canAccessRestaurant(context: AuthContext, restaurantId: string) {
  return context.role === "ADMIN" || context.restaurantIds.includes(restaurantId);
}
