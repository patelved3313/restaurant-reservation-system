# ReserveOS

Production-ready MVP foundation for an AI restaurant reservation system.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Prisma ORM
- API routes for dashboard and voice AI reservation intake

## Features

- Secure admin and restaurant owner login at `/login`
- Dashboard routes protected by Supabase Auth sessions
- Admin access to all restaurants and owner access scoped to assigned restaurants
- Restaurant profile and location management
- Opening and closing hours per location
- Reservation book with customer, email, phone, party size, date, time, location, status, and notes
- Availability checks that reject reservations outside location business hours
- Voice AI endpoint at `POST /api/voice/reservation`
- Repeatable database migrations and seed data

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase project values.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SITE_URL="https://your-production-domain.com"
SUPABASE_SERVICE_ROLE_KEY="optional-for-seed-auth-user-creation"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="replace-with-a-strong-password"
SEED_OWNER_EMAIL="owner@example.com"
SEED_OWNER_PASSWORD="replace-with-a-strong-password"
```

`SUPABASE_SERVICE_ROLE_KEY` and `SEED_*` values are only needed when `npm run db:seed` should create demo Supabase Auth users and link them to admin or owner records.

## Supabase Setup

Create a Supabase project, copy the project URL and anon key into your environment, and add the pooled and direct Postgres URLs. In Supabase Auth, set the Site URL and allowed redirect URLs to your local and production domains, for example `http://localhost:3000` and your Vercel URL.

Run migrations with:

```bash
npm run db:migrate
```

Seed demo restaurant data with:

```bash
npm run db:seed
```

## Voice AI Endpoint

`POST /api/voice/reservation`

```json
{
  "customerName": "Ava Stone",
  "customerEmail": "ava.stone@example.com",
  "phoneNumber": "+15551234567",
  "partySize": 4,
  "date": "2026-06-12",
  "time": "19:30",
  "locationId": "location_uuid_from_dashboard",
  "notes": "Window table if available"
}
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```
