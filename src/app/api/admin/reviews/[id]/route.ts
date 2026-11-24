// A03: hide/unhide a review and recompute the technician's rating aggregates
// from the remaining visible reviews (spec 7.3).
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";

const inputSchema = z.object({ hidden: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input" } }, { status: 400 });
    }
    const { id } = await params;
    const reviewRef = db.collection("reviews").doc(id);
    const review = await reviewRef.get();
    if (!review.exists) {
      return NextResponse.json({ error: { code: "not_found", message: "Review not found" } }, { status: 404 });
    }

    const hidden = parsed.data.hidden;
    const technicianId = review.get("technicianId");
    const batch = db.batch();
    batch.update(reviewRef, { hidden });

    if (typeof technicianId === "string") {
      const all = await db.collection("reviews").where("technicianId", "==", technicianId).get();
      let ratingSum = 0;
      let ratingCount = 0;
      all.forEach((doc) => {
        const isHidden = doc.id === id ? hidden : doc.get("hidden") === true;
        const stars = doc.get("stars");
        if (!isHidden && typeof stars === "number") {
          ratingSum += stars;
          ratingCount += 1;
        }
      });
      batch.update(db.collection("technicians").doc(technicianId), {
        "stats.ratingSum": ratingSum,
        "stats.ratingCount": ratingCount,
      });
    }

    batch.set(db.collection("audit").doc(), {
      actor: admin.uid,
      action: hidden ? "review_hide" : "review_unhide",
      target: `reviews/${id}`,
      note: null,
      ts: Timestamp.now(),
    });
    await batch.commit();
    return NextResponse.json({ id, hidden });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
