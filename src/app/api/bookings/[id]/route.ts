// Spec §8.1: GET /api/bookings/:id — participants only, phone only after accept.
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { assertParticipant, getActor, handleError, readBooking } from "../route";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const actor = await getActor(request);
    const { booking } = await readBooking(id);
    assertParticipant(booking, actor.uid, actor.role);

    // Phone comes from the client's user doc and is never sent before accept.
    let phone: string | null = null;
    if (booking.phoneRevealed) {
      // Spec §6/C12: phone lives only in users/{uid}/private/contact.
      const snap = await db.collection("users").doc(booking.clientId).collection("private").doc("contact").get();
      const stored = snap.get("phone");
      if (typeof stored === "string") phone = stored;
    }
    // Flat booking fields are kept for the technician job page; `booking` and
    // `contact` are the client page's shape. Phone is absent until accept.
    return NextResponse.json({
      ...booking,
      booking,
      contact: phone ? { phone } : null,
      ...(phone ? { clientPhone: phone } : {}),
    });
  } catch (error) {
    return handleError(error);
  }
}
