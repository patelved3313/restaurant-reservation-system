import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertLocationAvailability,
  dateFromInput,
  reservationUpdateSchema,
} from "@/lib/reservations";
import { prisma } from "@/lib/prisma";

const patchSchema = reservationUpdateSchema.extend({
  status: z.nativeEnum(ReservationStatus).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const current = await prisma.reservation.findUniqueOrThrow({ where: { id } });
  const input = patchSchema.parse(await request.json());
  const locationId = input.locationId ?? current.locationId;
  const date = input.date ?? current.date.toISOString().slice(0, 10);
  const time = input.time ?? current.time;

  if (input.status !== ReservationStatus.CANCELLED) {
    const availability = await assertLocationAvailability({ locationId, date, time });
    if (!availability.ok) {
      return NextResponse.json({ error: availability.reason }, { status: 422 });
    }
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      customerName: input.customerName,
      phoneNumber: input.phoneNumber,
      partySize: input.partySize,
      date: input.date ? dateFromInput(input.date) : undefined,
      time: input.time,
      locationId: input.locationId,
      notes: input.notes === undefined ? undefined : input.notes || null,
      status: input.status,
    },
    include: { location: true },
  });

  return NextResponse.json({ reservation });
}
