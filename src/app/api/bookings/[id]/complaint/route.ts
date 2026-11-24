// Spec §7.4: POST /api/bookings/:id/complaint — price rejection opens a dispute.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { transition } from "@/lib/booking/machine";
import type { BookingDoc } from "@/lib/types";
import { ApiError, getActor, handleError, readBooking } from "../../route";

const schema = z.object({
  kind: z.enum(["price", "no_show", "quality", "other"]),
  text: z.string().min(1),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const actor = await getActor(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input", message: "Invalid complaint input" } }, { status: 400 });
    const { ref, booking } = await readBooking(id);
    if (actor.role !== "admin" && booking.clientId !== actor.uid) {
      throw new ApiError("forbidden", 403, "Not the client on this booking");
    }
    if (booking.status !== "completed" && booking.status !== "disputed") {
      throw new ApiError("invalid_state", 409, "Booking cannot be disputed in this state");
    }

    const now = Date.now();
    const complaintRef = db.collection("complaints").doc();
    const updated: BookingDoc = booking.status === "completed" && actor.role === "client"
      ? transition(booking, "disputed", "client", { now, reason: `complaint:${parsed.data.kind}` })
      : booking;
    const complaint = {
      id: complaintRef.id,
      bookingId: id,
      clientId: booking.clientId,
      technicianId: booking.technicianId,
      kind: parsed.data.kind,
      text: parsed.data.text,
      status: "open",
      createdAt: now,
    };
    const batch = db.batch();
    batch.set(complaintRef, complaint);
    batch.set(ref, updated);
    await batch.commit();
    return NextResponse.json({ booking: updated, complaint }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
