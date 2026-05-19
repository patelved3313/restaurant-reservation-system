import { ReservationStatus } from "@prisma/client";
import { z } from "zod";
import {
  createDemoReservation,
  findDemoLocation,
} from "@/lib/demo-store";
import { hasDatabaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const reservationInputSchema = z.object({
  customerName: z.string().trim().min(2),
  phoneNumber: z.string().trim().min(7),
  partySize: z.coerce.number().int().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  locationId: z.string().min(1),
  notes: z.string().trim().optional().nullable(),
  status: z.nativeEnum(ReservationStatus).optional(),
  source: z.string().trim().optional(),
});

export const reservationUpdateSchema = reservationInputSchema.partial().extend({
  status: z.nativeEnum(ReservationStatus).optional(),
});

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function dateFromInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function assertLocationAvailability(input: {
  locationId: string;
  date: string;
  time: string;
}) {
  const location = hasDatabaseUrl()
    ? await prisma.location.findUnique({
        where: { id: input.locationId },
        include: { hours: true },
      })
    : await findDemoLocation(input.locationId);

  if (!location || !location.isActive) {
    return { ok: false as const, reason: "Location is not available." };
  }

  const dayOfWeek = dateFromInput(input.date).getUTCDay();
  const hours = location.hours.find((entry) => entry.dayOfWeek === dayOfWeek);

  if (!hours || hours.isClosed) {
    return { ok: false as const, reason: "The location is closed on that date." };
  }

  const requested = timeToMinutes(input.time);
  const opens = timeToMinutes(hours.openTime);
  const closes = timeToMinutes(hours.closeTime);

  if (requested < opens || requested >= closes) {
    return {
      ok: false as const,
      reason: `Reservation time must be between ${hours.openTime} and ${hours.closeTime}.`,
    };
  }

  return { ok: true as const, location };
}

export async function createReservation(rawInput: unknown) {
  const input = reservationInputSchema.parse(rawInput);
  const availability = await assertLocationAvailability(input);

  if (!availability.ok) {
    return { ok: false as const, error: availability.reason };
  }

  const data = {
    customerName: input.customerName,
    phoneNumber: input.phoneNumber,
    partySize: input.partySize,
    time: input.time,
    locationId: input.locationId,
    notes: input.notes || null,
    status: input.status ?? ReservationStatus.CONFIRMED,
    source: input.source ?? "dashboard",
  };

  const reservation = hasDatabaseUrl()
    ? await prisma.reservation.create({
        data: {
          ...data,
          date: dateFromInput(input.date),
        },
        include: { location: true },
      })
    : await createDemoReservation({
        ...data,
        date: input.date,
      });

  return { ok: true as const, reservation };
}
