import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  const current = await prisma.location.findFirst({
    where: auth.role === "ADMIN" ? { id } : { id, profileId: { in: auth.restaurantIds } },
  });
  if (!current) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  const input = locationSchema.parse(await request.json());

  const location = await prisma.$transaction(async (tx) => {
    await tx.location.update({
      where: { id },
      data: {
        name: input.name,
        street: input.street,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        phone: input.phone || null,
        timezone: input.timezone,
        isActive: input.isActive,
      },
    });

    for (const hour of input.hours) {
      await tx.openingHour.upsert({
        where: { locationId_dayOfWeek: { locationId: id, dayOfWeek: hour.dayOfWeek } },
        update: hour,
        create: { ...hour, locationId: id },
      });
    }

    return tx.location.findUniqueOrThrow({
      where: { id },
      include: { hours: { orderBy: { dayOfWeek: "asc" } } },
    });
  });

  return NextResponse.json({ location });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  const current = await prisma.location.findFirst({
    where: auth.role === "ADMIN" ? { id } : { id, profileId: { in: auth.restaurantIds } },
  });
  if (!current) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  await prisma.location.update({ where: { id: current.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
