// Spec §8.1: POST /api/bookings/:id/review — atomic review + technician aggregates.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { transition } from "@/lib/booking/machine";
import type { BookingDoc, ReviewDoc } from "@/lib/types";
import { ApiError, getActor, handleError, logEvent, readBooking } from "../../route";

const schema = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(5).optional(),
  comment: z.string().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const actor = await getActor(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input", message: "Invalid review input" } }, { status: 400 });
    if (actor.role !== "client") throw new ApiError("forbidden", 403, "Only the client may review");
    const { ref, booking } = await readBooking(id);
    if (booking.clientId !== actor.uid) throw new ApiError("forbidden", 403, "Only the client may review");

    const now = Date.now();
    const stars = parsed.data.stars as ReviewDoc["stars"];
    const review: ReviewDoc = {
      bookingId: id,
      clientId: actor.uid,
      technicianId: booking.technicianId,
      stars,
      tags: parsed.data.tags ?? [],
      ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
      hidden: false,
      createdAt: now,
    };

    // Absolute count keeps jobsCompleted correct even if the completion route
    // already incremented it.
    const done = await db.collection("bookings")
      .where("technicianId", "==", booking.technicianId)
      .where("status", "in", ["completed", "reviewed", "disputed"])
      .count().get();
    const jobsCompleted = done.data().count;

    const techRef = db.collection("technicians").doc(booking.technicianId);
    const reviewRef = db.collection("reviews").doc(id);
    let reviewed: BookingDoc | undefined;
    await db.runTransaction(async (tx) => {
      // Firestore requires every read before the first write.
      const freshSnap = await tx.get(ref);
      if (!freshSnap.exists) throw new ApiError("not_found", 404, "Booking not found");
      const current = freshSnap.data() as BookingDoc;
      if (current.status === "reviewed") throw new ApiError("already_reviewed", 409, "Booking already reviewed");
      if (current.status !== "completed") throw new ApiError("invalid_state", 409, "Booking is not completed");
      const reviewsSnap = await tx.get(db.collection("reviews").where("technicianId", "==", booking.technicianId));
      const techSnap = await tx.get(techRef);
      reviewed = transition(current, "reviewed", "client", { now, stars });

      const all = [...reviewsSnap.docs.map((d) => d.data() as ReviewDoc), review];
      const techData = techSnap.data() ?? {};
      tx.set(reviewRef, review);
      tx.set(ref, reviewed);
      tx.set(techRef, {
        ...techData,
        stats: {
          ...(techData.stats ?? {}),
          jobsCompleted,
          ratingSum: all.reduce((sum, r) => sum + r.stars, 0),
          ratingCount: all.length,
        },
      }, { merge: true });
    });

    if (!reviewed) throw new ApiError("invalid_state", 409, "Booking is not completed");
    await logEvent("reviewed", "client", { bookingId: id });
    return NextResponse.json({ booking: reviewed, review });
  } catch (error) {
    return handleError(error);
  }
}
