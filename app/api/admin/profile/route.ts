import { NextResponse } from "next/server";
import { z } from "zod";
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
  const input = profileSchema.parse(await request.json());
  const existing = await prisma.restaurantProfile.findFirst();

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
