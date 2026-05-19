# ReserveOS

Production-ready MVP foundation for an AI restaurant reservation system.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Prisma ORM
- Cookie-based admin login
- API routes for dashboard and voice AI reservation intake

## Features

- Admin login at `/login`
- Premium black, white, and gray restaurant SaaS dashboard
- Restaurant profile management
- Multiple locations with active/inactive state
- Opening and closing hours per location
- Reservation book with customer, phone, party size, date, time, location, status, and notes
- Availability checks that reject reservations outside location business hours
- Dashboard actions to create, complete, and cancel reservations
- Voice AI endpoint at `POST /api/voice/reservation`

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase PostgreSQL connection string and admin credentials.

```bash
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres"
ADMIN_EMAIL="admin@restaurant.com"
ADMIN_PASSWORD="change-this-password"
SESSION_SECRET="replace-with-a-long-random-secret"
```

## Voice AI Endpoint

`POST /api/voice/reservation`

```json
{
  "customerName": "Ava Stone",
  "phoneNumber": "+15551234567",
  "partySize": 4,
  "date": "2026-06-12",
  "time": "19:30",
  "locationId": "location_id_from_dashboard",
  "notes": "Window table if available"
}
```

Successful response:

```json
{
  "accepted": true,
  "reservation": {}
}
```

Invalid availability response:

```json
{
  "accepted": false,
  "error": "Reservation time must be between 09:00 and 22:00."
}
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:push
npm run db:studio
```

## Project Structure

```text
app/
  api/
    admin/
    auth/
    voice/reservation/
  dashboard/
  login/
components/
lib/
prisma/schema.prisma
```
