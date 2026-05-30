"use server";

import { ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canAccessRestaurant,
  requireAuthContext,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assertLocationAvailability,
  createReservation,
  dateFromInput,
} from "@/lib/reservations";

function scopedRestaurantIds(auth: Awaited<ReturnType<typeof requireAuthContext>>) {
  return auth.role === "ADMIN" ? undefined : auth.restaurantIds;
}

async function getScopedReservation(id: string, auth: Awaited<ReturnType<typeof requireAuthContext>>) {
  return prisma.reservation.findFirst({
    where:
      auth.role === "ADMIN"
        ? { id }
        : { id, location: { profileId: { in: auth.restaurantIds } } },
  });
}

async function getScopedLocation(id: string, auth: Awaited<ReturnType<typeof requireAuthContext>>) {
  return prisma.location.findFirst({
    where: auth.role === "ADMIN" ? { id } : { id, profileId: { in: auth.restaurantIds } },
  });
}

export async function createReservationAction(formData: FormData) {
  const auth = await requireAuthContext();
  const result = await createReservation(
    {
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      phoneNumber: formData.get("phoneNumber"),
      partySize: formData.get("partySize"),
      date: formData.get("date"),
      time: formData.get("time"),
      locationId: formData.get("locationId"),
      notes: formData.get("notes"),
      status: formData.get("status"),
      source: "dashboard",
    },
    { restaurantIds: scopedRestaurantIds(auth) },
  );

  if (!result.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Reservation created.");
}

export async function updateReservationStatusAction(formData: FormData) {
  const auth = await requireAuthContext();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReservationStatus;
  const reservation = await getScopedReservation(id, auth);

  if (!reservation) {
    redirect("/dashboard?error=Reservation not found.");
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status },
  });

  revalidatePath("/dashboard");
  redirect(
    `/dashboard?success=${
      status === "CANCELLED"
        ? "Reservation cancelled."
        : status === "COMPLETED"
          ? "Reservation completed."
          : "Reservation updated."
    }`,
  );
}

export async function updateReservationAction(formData: FormData) {
  const auth = await requireAuthContext();
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const status = String(formData.get("status") ?? "CONFIRMED") as ReservationStatus;
  const reservation = await getScopedReservation(id, auth);

  if (!reservation) {
    redirect("/dashboard?error=Reservation not found.");
  }

  if (status !== "CANCELLED") {
    const availability = await assertLocationAvailability({
      locationId,
      date,
      time,
      restaurantIds: scopedRestaurantIds(auth),
    });
    if (!availability.ok) {
      redirect(`/dashboard?error=${encodeURIComponent(availability.reason)}`);
    }
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      customerName: String(formData.get("customerName") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? "") || null,
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      partySize: Number(formData.get("partySize") ?? 1),
      date: dateFromInput(date),
      time,
      locationId,
      notes: String(formData.get("notes") ?? "") || null,
      status,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Reservation updated.");
}

export async function deleteReservationAction(formData: FormData) {
  const auth = await requireAuthContext();
  const id = String(formData.get("id") ?? "");
  const reservation = await getScopedReservation(id, auth);

  if (!reservation) {
    redirect("/dashboard?error=Reservation not found.");
  }

  await prisma.reservation.delete({ where: { id: reservation.id } });

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Reservation deleted.");
}

export async function saveProfileAction(formData: FormData) {
  const auth = await requireAuthContext();
  const currentRestaurantId = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    website: String(formData.get("website") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  };

  if (auth.role === "ADMIN") {
    const existing = currentRestaurantId
      ? await prisma.restaurantProfile.findUnique({ where: { id: currentRestaurantId } })
      : await prisma.restaurantProfile.findFirst();

    if (existing) {
      await prisma.restaurantProfile.update({ where: { id: existing.id }, data });
    } else {
      await prisma.restaurantProfile.create({ data });
    }
  } else {
    const restaurantId = auth.restaurantIds[0];
    if (!restaurantId || !(await canAccessRestaurant(auth, restaurantId))) {
      redirect("/dashboard/profile?error=You do not have access to that restaurant.");
    }
    await prisma.restaurantProfile.update({ where: { id: restaurantId }, data });
  }

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?success=Profile saved.");
}

export async function saveLocationAction(formData: FormData) {
  const auth = await requireAuthContext();
  const id = String(formData.get("id") ?? "");
  const current = id ? await getScopedLocation(id, auth) : null;
  const restaurantId =
    current?.profileId ??
    (auth.role === "ADMIN"
      ? (await prisma.restaurantProfile.findFirst({ orderBy: { createdAt: "asc" } }))?.id
      : auth.restaurantIds[0]);

  if (!restaurantId || !(await canAccessRestaurant(auth, restaurantId))) {
    redirect("/dashboard/locations?error=You do not have access to that restaurant.");
  }

  const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: String(formData.get(`openTime-${dayOfWeek}`) ?? "09:00"),
    closeTime: String(formData.get(`closeTime-${dayOfWeek}`) ?? "22:00"),
    isClosed: formData.get(`isClosed-${dayOfWeek}`) === "on",
  }));

  const data = {
    name: String(formData.get("name") ?? ""),
    street: String(formData.get("street") ?? ""),
    city: String(formData.get("city") ?? ""),
    region: String(formData.get("region") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    timezone: String(formData.get("timezone") ?? "America/New_York"),
    isActive: formData.get("isActive") === "on",
  };

  if (id) {
    if (!current) {
      redirect("/dashboard/locations?error=Location not found.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.location.update({ where: { id: current.id }, data });
      for (const hour of hours) {
        await tx.openingHour.upsert({
          where: { locationId_dayOfWeek: { locationId: current.id, dayOfWeek: hour.dayOfWeek } },
          update: hour,
          create: { ...hour, locationId: current.id },
        });
      }
    });
  } else {
    await prisma.location.create({
      data: {
        ...data,
        profileId: restaurantId,
        hours: { create: hours },
      },
    });
  }

  revalidatePath("/dashboard/locations");
  redirect(`/dashboard/locations?success=${id ? "Location updated." : "Location added."}`);
}

export async function deleteLocationAction(formData: FormData) {
  const auth = await requireAuthContext();
  const id = String(formData.get("id") ?? "");
  const location = await getScopedLocation(id, auth);

  if (!location) {
    redirect("/dashboard/locations?error=Location not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.deleteMany({ where: { locationId: location.id } });
    await tx.openingHour.deleteMany({ where: { locationId: location.id } });
    await tx.location.delete({ where: { id: location.id } });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  redirect("/dashboard/locations?success=Location deleted.");
}

export async function updateLocationStatusAction(formData: FormData) {
  const auth = await requireAuthContext();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  const location = await getScopedLocation(id, auth);

  if (!location) {
    redirect("/dashboard/locations?error=Location not found.");
  }

  await prisma.location.update({
    where: { id: location.id },
    data: { isActive },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  redirect(
    `/dashboard/locations?success=${isActive ? "Location enabled." : "Location disabled."}`,
  );
}
