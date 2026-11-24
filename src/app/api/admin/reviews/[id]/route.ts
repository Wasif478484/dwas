// A03: hide/unhide a review and recompute the technician's rating aggregates
// from the remaining visible reviews (spec 7.3).
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";
import { recomputeTechnicianTrust } from "@/lib/trust/score";

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

    batch.set(db.collection("audit").doc(), {
      actor: admin.uid,
      action: hidden ? "review_hide" : "review_unhide",
      target: `reviews/${id}`,
      note: null,
      ts: Timestamp.now(),
    });
    await batch.commit();
    // The helper re-reads the review's new hidden state and rebuilds aggregates,
    // badges and trustScore without touching manual badges.
    if (typeof technicianId === "string") await recomputeTechnicianTrust(db, technicianId);
    return NextResponse.json({ id, hidden });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
