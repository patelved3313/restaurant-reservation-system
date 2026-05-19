import { promises as fs } from "fs";
import path from "path";
import { ReservationStatus } from "@prisma/client";

const dbPath = path.join(process.cwd(), "data", "reserveos-demo.json");

type DemoProfile = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
};

export type DemoHour = {
  id: string;
  locationId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type DemoLocation = {
  id: string;
  profileId: string;
  name: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string | null;
  timezone: string;
  isActive: boolean;
  hours: DemoHour[];
  createdAt: string;
};

export type DemoReservation = {
  id: string;
  customerName: string;
  phoneNumber: string;
  partySize: number;
  date: string;
  time: string;
  status: ReservationStatus;
  notes: string | null;
  locationId: string;
  location: DemoLocation;
  source: string;
  createdAt: string;
};

type DemoDb = {
  profile: DemoProfile;
  locations: DemoLocation[];
  reservations: Omit<DemoReservation, "location">[];
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultHours(locationId: string) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: id("hour"),
    locationId,
    dayOfWeek,
    openTime: dayOfWeek === 0 ? "10:00" : "09:00",
    closeTime: dayOfWeek === 0 ? "21:00" : "22:00",
    isClosed: false,
  }));
}

function seedDb(): DemoDb {
  const locationId = "loc_demo";
  return {
    profile: {
      id: "profile_demo",
      name: "Maison Reserve",
      slug: "maison-reserve",
      phone: "+1 555 0188",
      email: "hello@maisonreserve.com",
      website: "https://example.com",
      address: "18 West Market Street",
      notes: "Demo restaurant profile. Replace with Supabase for production.",
    },
    locations: [
      {
        id: locationId,
        profileId: "profile_demo",
        name: "Downtown Dining Room",
        street: "18 West Market Street",
        city: "New York",
        region: "NY",
        postalCode: "10001",
        phone: "+1 555 0188",
        timezone: "America/New_York",
        isActive: true,
        hours: defaultHours(locationId),
        createdAt: new Date().toISOString(),
      },
    ],
    reservations: [
      {
        id: "res_demo",
        customerName: "Ava Stone",
        phoneNumber: "+1 555 0123",
        partySize: 4,
        date: new Date().toISOString().slice(0, 10),
        time: "19:30",
        status: ReservationStatus.CONFIRMED,
        notes: "Prefers a quiet table.",
        locationId,
        source: "demo",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

async function readDb(): Promise<DemoDb> {
  try {
    return JSON.parse(await fs.readFile(dbPath, "utf8")) as DemoDb;
  } catch {
    const db = seedDb();
    await writeDb(db);
    return db;
  }
}

async function writeDb(db: DemoDb) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

function attachLocation(db: DemoDb, reservation: Omit<DemoReservation, "location">) {
  const location = db.locations.find((item) => item.id === reservation.locationId);
  if (!location) {
    throw new Error("Location not found.");
  }
  return { ...reservation, date: new Date(reservation.date), location };
}

export async function listDemoReservations() {
  const db = await readDb();
  return db.reservations
    .map((reservation) => attachLocation(db, reservation))
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
}

export async function listDemoLocations() {
  return (await readDb()).locations;
}

export async function getDemoProfile() {
  return (await readDb()).profile;
}

export async function saveDemoProfile(data: Omit<DemoProfile, "id">) {
  const db = await readDb();
  db.profile = { id: db.profile.id, ...data };
  await writeDb(db);
}

export async function saveDemoLocation(data: Omit<DemoLocation, "id" | "createdAt" | "hours"> & { id?: string; hours: Omit<DemoHour, "id" | "locationId">[] }) {
  const db = await readDb();
  const existing = data.id ? db.locations.find((location) => location.id === data.id) : null;
  const locationId = existing?.id ?? id("loc");
  const location = {
    ...data,
    id: locationId,
    profileId: db.profile.id,
    hours: data.hours.map((hour) => ({
      ...hour,
      id: id("hour"),
      locationId,
    })),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  db.locations = existing
    ? db.locations.map((item) => (item.id === existing.id ? location : item))
    : [...db.locations, location];
  await writeDb(db);
}

export async function findDemoLocation(locationId: string) {
  return (await readDb()).locations.find((location) => location.id === locationId) ?? null;
}

export async function createDemoReservation(input: {
  customerName: string;
  phoneNumber: string;
  partySize: number;
  date: string;
  time: string;
  locationId: string;
  notes?: string | null;
  status?: ReservationStatus;
  source?: string;
}) {
  const db = await readDb();
  const reservation = {
    id: id("res"),
    customerName: input.customerName,
    phoneNumber: input.phoneNumber,
    partySize: input.partySize,
    date: input.date,
    time: input.time,
    status: input.status ?? ReservationStatus.CONFIRMED,
    notes: input.notes || null,
    locationId: input.locationId,
    source: input.source ?? "dashboard",
    createdAt: new Date().toISOString(),
  };
  db.reservations.unshift(reservation);
  await writeDb(db);
  return attachLocation(db, reservation);
}

export async function updateDemoReservation(
  reservationId: string,
  data: Partial<Omit<DemoReservation, "id" | "location" | "createdAt">>,
) {
  const db = await readDb();
  db.reservations = db.reservations.map((reservation) =>
    reservation.id === reservationId ? { ...reservation, ...data } : reservation,
  );
  await writeDb(db);
}

export async function deleteDemoReservation(reservationId: string) {
  const db = await readDb();
  db.reservations = db.reservations.filter(
    (reservation) => reservation.id !== reservationId,
  );
  await writeDb(db);
}

export async function deleteDemoLocation(locationId: string) {
  const db = await readDb();
  db.locations = db.locations.filter((location) => location.id !== locationId);
  db.reservations = db.reservations.filter(
    (reservation) => reservation.locationId !== locationId,
  );
  await writeDb(db);
}

export async function updateDemoLocationStatus(locationId: string, isActive: boolean) {
  const db = await readDb();
  db.locations = db.locations.map((location) =>
    location.id === locationId ? { ...location, isActive } : location,
  );
  await writeDb(db);
}
