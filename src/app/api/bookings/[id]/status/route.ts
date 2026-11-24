// Spec §8.1: PATCH /api/bookings/:id/status — the only HTTP status change entry.
import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { noShowEligible, quickBookNext, transition } from "@/lib/booking/machine";
import type { BookingDoc } from "@/lib/types";
import { ApiError, assertParticipant, getActor, handleError, logEvent, readBooking } from "../../route";

const schema = z.object({
  to: z.enum([
    "requested", "accepted", "declined", "expired", "cancelled_client", "cancelled_tech",
    "on_the_way", "in_progress", "completed", "reviewed", "disputed", "no_show",
  ]),
  finalPrice: z.number().nonnegative().optional(),
  reason: z.string().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const actor = await getActor(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input", message: "Invalid status input" } }, { status: 400 });
    const { to, finalPrice, reason } = parsed.data;
    const { ref, booking } = await readBooking(id);
    assertParticipant(booking, actor.uid, actor.role);
    const now = Date.now();
    if (to === "no_show") {
      if (actor.actor !== "client" || booking.clientId !== actor.uid) {
        throw new ApiError("forbidden", 403, "Only the client may report a no-show");
      }
      if (!noShowEligible(booking, now)) {
        throw new ApiError("too_early", 409, "No-show can only be reported 30 minutes after the scheduled time");
      }
    }

    let updated: BookingDoc;
    let requeued = false;
    if (to === "declined" && booking.status === "requested") {
      const next = quickBookNext(booking, "declined", now);
      requeued = next !== null;
      updated = next ?? transition(booking, to, actor.actor, { now, reason });
    } else {
      updated = transition(booking, to, actor.actor, { now, finalPrice, reason });
    }

    const batch = db.batch();
    batch.set(ref, updated);
    if (updated.status === "completed") {
      const techRef = db.collection("technicians").doc(booking.technicianId);
      const snap = await techRef.get();
      const data = snap.data() ?? {};
      const stats = data.stats ?? {};
      batch.set(techRef, { ...data, stats: { ...stats, jobsCompleted: (stats.jobsCompleted ?? 0) + 1 } }, { merge: true });
    }
    if (to === "no_show") {
      const complaintRef = db.collection("complaints").doc();
      batch.set(complaintRef, {
        id: complaintRef.id,
        kind: "no_show",
        text: reason ?? "Client reported no-show",
        bookingId: id,
        clientId: booking.clientId,
        technicianId: booking.technicianId,
        status: "open",
        raisedBy: actor.uid,
        createdAt: now,
      });
      // Numeric transforms are omitted from the merge mask, so other stats survive.
      const techRef = db.collection("technicians").doc(booking.technicianId);
      batch.set(techRef, { stats: { noShowCount: FieldValue.increment(1) } }, { merge: true });
    }
    await batch.commit();

    if (requeued) await logEvent("quick_book", actor.actor, { bookingId: id });
    if (to === "accepted" || to === "completed") {
      await logEvent(to, actor.actor, { bookingId: id, technicianId: booking.technicianId });
    }
    return NextResponse.json({ booking: updated });
  } catch (error) {
    return handleError(error);
  }
}
