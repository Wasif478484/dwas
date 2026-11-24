// Admin technician list for the approval queue (A02).
import { type Query } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";

const filtersSchema = z.object({
  approval: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = filtersSchema.safeParse({
      approval: request.nextUrl.searchParams.get("approval") ?? undefined,
      trade: request.nextUrl.searchParams.get("trade") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid filters" } }, { status: 400 });
    }

    let query: Query = db.collection("technicians").limit(200);
    if (parsed.data.approval) query = query.where("approvalStatus", "==", parsed.data.approval);
    if (parsed.data.trade) query = query.where("trades", "array-contains", parsed.data.trade);
    const snap = await query.get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ items });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
