import { ReservationsManager, type ReservationRowData } from "@/components/ReservationsManager";
import { requireAuthContext, restaurantScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const auth = await requireAuthContext();
  const [reservations, locations] = await Promise.all([
    prisma.reservation.findMany({
      where:
        auth.role === "ADMIN"
          ? {}
          : { location: { profileId: { in: auth.restaurantIds } } },
      include: { location: true },
      orderBy: [{ date: "desc" }, { time: "asc" }],
    }),
    prisma.location.findMany({
      where: { ...restaurantScopeWhere(auth), isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const params = searchParams ? await searchParams : {};
  const activeLocations = locations.filter((location) => location.isActive);
  const serializedReservations: ReservationRowData[] = reservations.map((reservation) => ({
    id: reservation.id,
    customerName: reservation.customerName,
    customerEmail: reservation.customerEmail,
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
    />
  );
}
