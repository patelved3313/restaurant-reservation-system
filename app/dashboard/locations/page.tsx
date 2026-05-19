import { LocationsManager, type LocationCardData } from "@/components/LocationsManager";
import { listDemoLocations } from "@/lib/demo-store";
import { hasDatabaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const locations = hasDatabaseUrl()
    ? await prisma.location.findMany({
        include: { hours: { orderBy: { dayOfWeek: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
    : await listDemoLocations();

  const serializedLocations: LocationCardData[] = locations.map((location) => ({
    id: location.id,
    name: location.name,
    street: location.street,
    city: location.city,
    region: location.region,
    postalCode: location.postalCode,
    phone: location.phone,
    timezone: location.timezone,
    isActive: location.isActive,
    hours: location.hours.map((hour) => ({
      id: hour.id,
      dayOfWeek: hour.dayOfWeek,
      openTime: hour.openTime,
      closeTime: hour.closeTime,
      isClosed: hour.isClosed,
    })),
  }));

  const params = searchParams ? await searchParams : {};

  return (
    <div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-neutral-500">
          Operations
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">
          Locations
        </h1>
      </div>

      <LocationsManager
        locations={serializedLocations}
        initialMessage={params?.success ?? params?.error}
      />
    </div>
  );
}
