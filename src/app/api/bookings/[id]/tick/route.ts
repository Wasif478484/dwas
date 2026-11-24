// Spec §8.1 / D10: POST /api/bookings/:id/tick — lazy expiry + quick-book cascade.
import { NextResponse } from "next/server";
import { getActor, handleError, logEvent, readBooking } from "../../route";
import { quickBookNext, transition } from "@/lib/booking/machine";
import type { BookingDoc } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await getActor(request); // token verified when present, demo fallback otherwise
    const { id } = await context.params;
    const { ref, booking } = await readBooking(id);
    const now = Date.now();
    let updated: BookingDoc = booking;

    if (booking.status === "requested" && now > booking.expiresAt) {
      const next = quickBookNext(booking, "expired", now);
      updated = next ?? transition(booking, "expired", "system", { now });
      await ref.set(updated);
      await logEvent("booking_expired", "system", { bookingId: id });
    }
    return NextResponse.json({ booking: updated });
  } catch (error) {
    return handleError(error);
  }
}
