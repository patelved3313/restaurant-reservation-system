CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "reservation_status" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'OWNER');

CREATE TABLE "restaurants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "phone" text,
  "email" text,
  "website" text,
  "address" text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "restaurant_owners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "auth_user_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'OWNER',
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "restaurant_owners_auth_user_id_restaurant_id_key" UNIQUE ("auth_user_id", "restaurant_id")
);

CREATE TABLE "admin_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "auth_user_id" uuid NOT NULL UNIQUE,
  "email" text NOT NULL UNIQUE,
  "role" "user_role" NOT NULL DEFAULT 'ADMIN',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "street" text NOT NULL,
  "city" text NOT NULL,
  "region" text NOT NULL,
  "postal_code" text NOT NULL,
  "phone" text,
  "timezone" text NOT NULL DEFAULT 'America/New_York',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "opening_hours" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "day_of_week" integer NOT NULL CHECK ("day_of_week" BETWEEN 0 AND 6),
  "open_time" text NOT NULL,
  "close_time" text NOT NULL,
  "is_closed" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "opening_hours_location_id_day_of_week_key" UNIQUE ("location_id", "day_of_week")
);

CREATE TABLE "reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
  "customer_name" text NOT NULL,
  "customer_email" text,
  "customer_phone" text NOT NULL,
  "party_size" integer NOT NULL CHECK ("party_size" > 0),
  "reservation_date" date NOT NULL,
  "reservation_time" text NOT NULL,
  "status" "reservation_status" NOT NULL DEFAULT 'CONFIRMED',
  "special_requests" text,
  "source" text NOT NULL DEFAULT 'dashboard',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "restaurant_owners_auth_user_id_idx" ON "restaurant_owners"("auth_user_id");
CREATE INDEX "restaurant_owners_restaurant_id_idx" ON "restaurant_owners"("restaurant_id");
CREATE INDEX "admin_users_auth_user_id_idx" ON "admin_users"("auth_user_id");
CREATE INDEX "locations_restaurant_id_idx" ON "locations"("restaurant_id");
CREATE INDEX "locations_is_active_idx" ON "locations"("is_active");
CREATE INDEX "reservations_reservation_date_reservation_time_idx" ON "reservations"("reservation_date", "reservation_time");
CREATE INDEX "reservations_location_id_reservation_date_idx" ON "reservations"("location_id", "reservation_date");
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "restaurants_set_updated_at"
BEFORE UPDATE ON "restaurants"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "locations_set_updated_at"
BEFORE UPDATE ON "locations"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "opening_hours_set_updated_at"
BEFORE UPDATE ON "opening_hours"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "reservations_set_updated_at"
BEFORE UPDATE ON "reservations"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
