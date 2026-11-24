// Spec §8.1: GET /api/bookings/:id — participants only, phone only after accept.
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import type { BookingDoc } from "@/lib/types";
import { assertParticipant, getActor, handleError, readBooking } from "../route";

// One missing or unreadable contact doc must not fail the booking GET.
async function readContactPhone(uid: string): Promise<string | null> {
  try {
    const snap = await db.collection("users").doc(uid).collection("private").doc("contact").get();
    const stored = snap.get("phone");
    return typeof stored === "string" ? stored : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const actor = await getActor(request);
    const { booking } = await readBooking(id);
    assertParticipant(booking, actor.uid, actor.role);

    const revealed = booking.phoneRevealed === true;
    // Firestore keeps the full booking; only this client-readable response is redacted.
    const location = { ...booking.location };
    if (!revealed) delete location.note;
    const safeBooking: BookingDoc = revealed ? booking : { ...booking, location };

    let contact: { clientPhone?: string; technicianPhone?: string } | null = null;
    let legacyPhone: string | null = null;
    if (revealed) {
      const [clientPhone, technicianPhone] = await Promise.all([
        readContactPhone(booking.clientId),
        readContactPhone(booking.technicianId),
      ]);
      contact = {
        ...(clientPhone ? { clientPhone } : {}),
        ...(technicianPhone ? { technicianPhone } : {}),
      };
      legacyPhone = clientPhone;
    }
    return NextResponse.json({
      ...safeBooking,
      booking: safeBooking,
      contact,
      ...(legacyPhone ? { clientPhone: legacyPhone } : {}),
    });
  } catch (error) {
    return handleError(error);
  }
}
