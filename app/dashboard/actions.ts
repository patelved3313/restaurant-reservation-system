"use server";

import { ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteDemoLocation,
  deleteDemoReservation,
  saveDemoLocation,
  saveDemoProfile,
  updateDemoLocationStatus,
  updateDemoReservation,
} from "@/lib/demo-store";
import { hasDatabaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  assertLocationAvailability,
  createReservation,
  dateFromInput,
} from "@/lib/reservations";

export async function createReservationAction(formData: FormData) {
  const result = await createReservation({
    customerName: formData.get("customerName"),
    phoneNumber: formData.get("phoneNumber"),
    partySize: formData.get("partySize"),
    date: formData.get("date"),
    time: formData.get("time"),
    locationId: formData.get("locationId"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    source: "dashboard",
  });

  if (!result.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Reservation created.");
}

export async function updateReservationStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReservationStatus;

  if (hasDatabaseUrl()) {
    await prisma.reservation.update({
      where: { id },
      data: { status },
    });
  } else {
    await updateDemoReservation(id, { status });
  }

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
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const status = String(formData.get("status") ?? "CONFIRMED") as ReservationStatus;

  if (status !== "CANCELLED") {
    const availability = await assertLocationAvailability({ locationId, date, time });
    if (!availability.ok) {
      redirect(`/dashboard?error=${encodeURIComponent(availability.reason)}`);
    }
  }

  const data = {
    customerName: String(formData.get("customerName") ?? ""),
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    partySize: Number(formData.get("partySize") ?? 1),
    time,
    locationId,
    notes: String(formData.get("notes") ?? "") || null,
    status,
  };

  if (hasDatabaseUrl()) {
    await prisma.reservation.update({
      where: { id },
      data: { ...data, date: dateFromInput(date) },
    });
  } else {
    await updateDemoReservation(id, { ...data, date });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Reservation updated.");
}

export async function deleteReservationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/dashboard");
  }

  if (hasDatabaseUrl()) {
    await prisma.reservation.delete({ where: { id } });
  } else {
    await deleteDemoReservation(id);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Reservation deleted.");
}

export async function saveProfileAction(formData: FormData) {
  const data = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    website: String(formData.get("website") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  };

  if (hasDatabaseUrl()) {
    const existing = await prisma.restaurantProfile.findFirst();
    if (existing) {
      await prisma.restaurantProfile.update({ where: { id: existing.id }, data });
    } else {
      await prisma.restaurantProfile.create({ data });
    }
  } else {
    await saveDemoProfile(data);
  }

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile");
}

export async function saveLocationAction(formData: FormData) {
  const profile = hasDatabaseUrl() ? await prisma.restaurantProfile.findFirst() : null;
  const id = String(formData.get("id") ?? "");
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

  if (!hasDatabaseUrl()) {
    await saveDemoLocation({
      id: id || undefined,
      ...data,
      profileId: "profile_demo",
      hours,
    });
  } else if (id) {
    await prisma.$transaction(async (tx) => {
      await tx.location.update({ where: { id }, data });
      for (const hour of hours) {
        await tx.openingHour.upsert({
          where: { locationId_dayOfWeek: { locationId: id, dayOfWeek: hour.dayOfWeek } },
          update: hour,
          create: { ...hour, locationId: id },
        });
      }
    });
  } else {
    await prisma.location.create({
      data: {
        ...data,
        profileId: profile?.id,
        hours: { create: hours },
      },
    });
  }

  revalidatePath("/dashboard/locations");
  redirect(`/dashboard/locations?success=${id ? "Location updated." : "Location added."}`);
}

export async function deleteLocationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/dashboard/locations");
  }

  if (hasDatabaseUrl()) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.deleteMany({ where: { locationId: id } });
      await tx.openingHour.deleteMany({ where: { locationId: id } });
      await tx.location.delete({ where: { id } });
    });
  } else {
    await deleteDemoLocation(id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  redirect("/dashboard/locations?success=Location deleted.");
}

export async function updateLocationStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  if (!id) {
    redirect("/dashboard/locations");
  }

  if (hasDatabaseUrl()) {
    await prisma.location.update({
      where: { id },
      data: { isActive },
    });
  } else {
    await updateDemoLocationStatus(id, isActive);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  redirect(
    `/dashboard/locations?success=${isActive ? "Location enabled." : "Location disabled."}`,
  );
}
