import { NextResponse } from "next/server";
import { createReservation } from "@/lib/reservations";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    include: { location: true },
    orderBy: [{ date: "desc" }, { time: "asc" }],
  });

  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  const result = await createReservation({
    ...(await request.json()),
    source: "dashboard",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ reservation: result.reservation }, { status: 201 });
}
