import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createReservation } from "@/lib/reservations";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    where:
      auth.role === "ADMIN"
        ? {}
        : { location: { profileId: { in: auth.restaurantIds } } },
    include: { location: true },
    orderBy: [{ date: "desc" }, { time: "asc" }],
  });

  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const result = await createReservation(
    {
      ...(await request.json()),
      source: "dashboard",
    },
    { restaurantIds: auth.role === "ADMIN" ? undefined : auth.restaurantIds },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ reservation: result.reservation }, { status: 201 });
}
