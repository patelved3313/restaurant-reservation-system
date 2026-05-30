import { PrismaClient, ReservationStatus } from "@prisma/client";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  : null;

async function upsertAuthUser(email, password) {
  if (!email) {
    return null;
  }

  if (!supabaseAdmin) {
    console.warn(
      `Skipping Supabase Auth user for ${email}. Set SUPABASE_SERVICE_ROLE_KEY to create or look up seed users.`,
    );
    return null;
  }

  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existing = users.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    return existing.id;
  }

  if (!password) {
    console.warn(`Skipping ${email}. Provide a password to create this Supabase Auth user.`);
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  return data.user.id;
}

function hoursFor(locationId) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    locationId,
    dayOfWeek,
    openTime: dayOfWeek === 0 ? "10:00" : "09:00",
    closeTime: dayOfWeek === 0 ? "21:00" : "22:00",
    isClosed: false,
  }));
}

async function upsertLocation(restaurantId, input) {
  const existing = await prisma.location.findFirst({
    where: { profileId: restaurantId, name: input.name },
  });

  const location = existing
    ? await prisma.location.update({ where: { id: existing.id }, data: input })
    : await prisma.location.create({ data: { ...input, profileId: restaurantId } });

  for (const hour of hoursFor(location.id)) {
    await prisma.openingHour.upsert({
      where: {
        locationId_dayOfWeek: {
          locationId: location.id,
          dayOfWeek: hour.dayOfWeek,
        },
      },
      update: hour,
      create: hour,
    });
  }

  return location;
}

async function upsertReservation(locationId, input) {
  const existing = await prisma.reservation.findFirst({
    where: {
      locationId,
      customerName: input.customerName,
      date: input.date,
      time: input.time,
    },
  });

  const data = { ...input, locationId };
  return existing
    ? prisma.reservation.update({ where: { id: existing.id }, data })
    : prisma.reservation.create({ data });
}

async function main() {
  const restaurant = await prisma.restaurantProfile.upsert({
    where: { slug: "maison-reserve" },
    update: {
      name: "Maison Reserve",
      phone: "+1 416 555 0188",
      email: "hello@maisonreserve.example",
      website: "https://maisonreserve.example",
      address: "18 West Market Street, Toronto, ON",
      notes: "Premium dining room configured for ReserveOS demos.",
    },
    create: {
      name: "Maison Reserve",
      slug: "maison-reserve",
      phone: "+1 416 555 0188",
      email: "hello@maisonreserve.example",
      website: "https://maisonreserve.example",
      address: "18 West Market Street, Toronto, ON",
      notes: "Premium dining room configured for ReserveOS demos.",
    },
  });

  const downtown = await upsertLocation(restaurant.id, {
    name: "Downtown Dining Room",
    street: "18 West Market Street",
    city: "Toronto",
    region: "ON",
    postalCode: "M5V 1A1",
    phone: "+1 416 555 0188",
    timezone: "America/Toronto",
    isActive: true,
  });

  const yorkville = await upsertLocation(restaurant.id, {
    name: "Yorkville Terrace",
    street: "92 Cumberland Street",
    city: "Toronto",
    region: "ON",
    postalCode: "M5R 1A3",
    phone: "+1 416 555 0199",
    timezone: "America/Toronto",
    isActive: true,
  });

  await Promise.all([
    upsertReservation(downtown.id, {
      customerName: "Ava Stone",
      customerEmail: "ava.stone@example.com",
      phoneNumber: "+1 416 555 0101",
      partySize: 4,
      date: new Date("2026-06-12T00:00:00.000Z"),
      time: "19:30",
      status: ReservationStatus.CONFIRMED,
      notes: "Prefers a quiet table.",
      source: "seed",
    }),
    upsertReservation(downtown.id, {
      customerName: "Marcus Chen",
      customerEmail: "marcus.chen@example.com",
      phoneNumber: "+1 416 555 0144",
      partySize: 2,
      date: new Date("2026-06-13T00:00:00.000Z"),
      time: "18:00",
      status: ReservationStatus.CONFIRMED,
      notes: "Anniversary dinner.",
      source: "seed",
    }),
    upsertReservation(yorkville.id, {
      customerName: "Priya Shah",
      customerEmail: "priya.shah@example.com",
      phoneNumber: "+1 416 555 0175",
      partySize: 6,
      date: new Date("2026-06-14T00:00:00.000Z"),
      time: "20:00",
      status: ReservationStatus.CONFIRMED,
      notes: "Chef's tasting menu.",
      source: "seed",
    }),
  ]);

  const adminAuthUserId = await upsertAuthUser(
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_ADMIN_PASSWORD,
  );
  if (adminAuthUserId && process.env.SEED_ADMIN_EMAIL) {
    await prisma.adminUser.upsert({
      where: { authUserId: adminAuthUserId },
      update: { email: process.env.SEED_ADMIN_EMAIL.toLowerCase(), role: "ADMIN" },
      create: {
        authUserId: adminAuthUserId,
        email: process.env.SEED_ADMIN_EMAIL.toLowerCase(),
        role: "ADMIN",
      },
    });
  }

  const ownerAuthUserId = await upsertAuthUser(
    process.env.SEED_OWNER_EMAIL,
    process.env.SEED_OWNER_PASSWORD,
  );
  if (ownerAuthUserId && process.env.SEED_OWNER_EMAIL) {
    await prisma.restaurantOwner.upsert({
      where: {
        authUserId_profileId: {
          authUserId: ownerAuthUserId,
          profileId: restaurant.id,
        },
      },
      update: { email: process.env.SEED_OWNER_EMAIL.toLowerCase(), role: "OWNER" },
      create: {
        authUserId: ownerAuthUserId,
        email: process.env.SEED_OWNER_EMAIL.toLowerCase(),
        role: "OWNER",
        profileId: restaurant.id,
      },
    });
  }

  console.log("Seed data is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
