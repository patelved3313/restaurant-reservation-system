import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createReservation } from "@/lib/reservations";

export async function POST(request: Request) {
  try {
    const result = await createReservation({
      ...(await request.json()),
      source: "voice-ai",
    });

    if (!result.ok) {
      return NextResponse.json(
        { accepted: false, error: result.error },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { accepted: true, reservation: result.reservation },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { accepted: false, error: "Invalid reservation payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { accepted: false, error: "Unable to create reservation." },
      { status: 500 },
    );
  }
}
