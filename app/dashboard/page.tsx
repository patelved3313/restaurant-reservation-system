import { ReservationsManager, type ReservationRowData } from "@/components/ReservationsManager";
import { listDemoLocations, listDemoReservations } from "@/lib/demo-store";
import { hasDatabaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const [reservations, locations] = hasDatabaseUrl()
    ? await Promise.all([
        prisma.reservation.findMany({
          include: { location: true },
          orderBy: [{ date: "desc" }, { time: "asc" }],
        }),
        prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      ])
    : await Promise.all([listDemoReservations(), listDemoLocations()]);

  const params = searchParams ? await searchParams : {};
  const activeLocations = locations.filter((location) => location.isActive);
  const serializedReservations: ReservationRowData[] = reservations.map((reservation) => ({
    id: reservation.id,
    customerName: reservation.customerName,
    phoneNumber: reservation.phoneNumber,
    partySize: reservation.partySize,
    date: reservation.date.toISOString().slice(0, 10),
    time: reservation.time,
    locationId: reservation.locationId,
    locationName: reservation.location.name,
    status: reservation.status,
    notes: reservation.notes,
  }));

  return (
    <ReservationsManager
      reservations={serializedReservations}
      locations={activeLocations.map((location) => ({
        id: location.id,
        name: location.name,
      }))}
      initialMessage={params.success}
      initialError={params.error}
      isDemoMode={!hasDatabaseUrl()}
    />
  );
}
