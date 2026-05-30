import { ReservationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const reservationInputSchema = z.object({
  customerName: z.string().trim().min(2),
  customerEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  phoneNumber: z.string().trim().min(7),
  partySize: z.coerce.number().int().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  locationId: z.string().uuid(),
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
  restaurantIds?: string[];
}) {
  const location = await prisma.location.findFirst({
    where: {
      id: input.locationId,
      ...(input.restaurantIds ? { profileId: { in: input.restaurantIds } } : {}),
    },
    include: { hours: true },
  });

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

export async function createReservation(
  rawInput: unknown,
  options: { restaurantIds?: string[] } = {},
) {
  const input = reservationInputSchema.parse(rawInput);

  try {
    const availability = await assertLocationAvailability({
      ...input,
      restaurantIds: options.restaurantIds,
    });

    if (!availability.ok) {
      return { ok: false as const, error: availability.reason };
    }

    const reservation = await prisma.reservation.create({
      data: {
        customerName: input.customerName,
        customerEmail: input.customerEmail || null,
        phoneNumber: input.phoneNumber,
        partySize: input.partySize,
        date: dateFromInput(input.date),
        time: input.time,
        locationId: input.locationId,
        notes: input.notes || null,
        status: input.status ?? ReservationStatus.CONFIRMED,
        source: input.source ?? "dashboard",
      },
      include: { location: true },
    });

    return { ok: true as const, reservation };
  } catch {
    return {
      ok: false as const,
      error: "Unable to save the reservation. Please try again.",
    };
  }
}
