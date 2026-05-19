import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const hourSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.coerce.boolean().default(false),
});

const locationSchema = z.object({
  name: z.string().trim().min(2),
  street: z.string().trim().min(2),
  city: z.string().trim().min(2),
  region: z.string().trim().min(2),
  postalCode: z.string().trim().min(2),
  phone: z.string().trim().optional().nullable(),
  timezone: z.string().trim().default("America/New_York"),
  isActive: z.coerce.boolean().default(true),
  hours: z.array(hourSchema).length(7),
});

export async function GET() {
  const locations = await prisma.location.findMany({
    include: { hours: { orderBy: { dayOfWeek: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const input = locationSchema.parse(await request.json());
  const profile = await prisma.restaurantProfile.findFirst();
  const location = await prisma.location.create({
    data: {
      name: input.name,
      street: input.street,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      phone: input.phone || null,
      timezone: input.timezone,
      isActive: input.isActive,
      profileId: profile?.id,
      hours: { create: input.hours },
    },
    include: { hours: { orderBy: { dayOfWeek: "asc" } } },
  });

  return NextResponse.json({ location }, { status: 201 });
}
