import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  website: z.string().trim().url().optional().nullable().or(z.literal("")),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export async function PUT(request: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const input = profileSchema.parse(await request.json());
  const existing =
    auth.role === "ADMIN"
      ? await prisma.restaurantProfile.findFirst({ orderBy: { createdAt: "asc" } })
      : await prisma.restaurantProfile.findFirst({
          where: { id: { in: auth.restaurantIds } },
          orderBy: { createdAt: "asc" },
        });

  if (auth.role !== "ADMIN" && !existing) {
    return NextResponse.json({ error: "Restaurant profile not found." }, { status: 403 });
  }

  const profile = existing
    ? await prisma.restaurantProfile.update({
        where: { id: existing.id },
        data: {
          ...input,
          email: input.email || null,
          website: input.website || null,
        },
      })
    : await prisma.restaurantProfile.create({
        data: {
          ...input,
          email: input.email || null,
          website: input.website || null,
        },
      });

  return NextResponse.json({ profile });
}
