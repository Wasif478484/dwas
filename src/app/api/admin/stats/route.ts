// A04: admin dashboard numbers, derived from stored bookings/events/reviews.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { loadStats } from "@/lib/admin/stats";
import { db } from "@/lib/firebase/admin";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = querySchema.safeParse({ days: request.nextUrl.searchParams.get("days") ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid days" } }, { status: 400 });
    }
    return NextResponse.json(await loadStats(db, parsed.data.days));
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
