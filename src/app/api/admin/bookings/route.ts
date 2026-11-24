// Admin booking list for the bookings table and the review-moderation screen.
import { type Query } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";

const filtersSchema = z.object({
  status: z.enum([
    "requested", "accepted", "declined", "expired", "cancelled_client", "cancelled_tech",
    "on_the_way", "in_progress", "completed", "reviewed", "disputed", "no_show",
  ]).optional(),
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"]).optional(),
  technician: z.string().max(128).optional(),
  withReviews: z.enum(["1", "true"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = filtersSchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      trade: request.nextUrl.searchParams.get("trade") ?? undefined,
      technician: request.nextUrl.searchParams.get("technician") ?? undefined,
      withReviews: request.nextUrl.searchParams.get("withReviews") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid filters" } }, { status: 400 });
    }

    let query: Query = db.collection("bookings").limit(200);
    if (parsed.data.status) query = query.where("status", "==", parsed.data.status);
    if (parsed.data.trade) query = query.where("trade", "==", parsed.data.trade);
    if (parsed.data.technician) query = query.where("technicianId", "==", parsed.data.technician);
    const snap = await query.get();
    const bookings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (parsed.data.withReviews) {
      const refs = snap.docs.map((doc) => db.collection("reviews").doc(doc.id));
      const reviews = refs.length > 0 ? await db.getAll(...refs) : [];
      const byBooking = new Map(
        reviews.filter((r) => r.exists).map((r) => [r.id, { id: r.id, ...(r.data() ?? {}) }] as const),
      );
      return NextResponse.json({ items: bookings.map((b) => ({ ...b, review: byBooking.get(b.id) ?? null })) });
    }
    return NextResponse.json({ items: bookings });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
