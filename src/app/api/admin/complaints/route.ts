// A06: admin complaints queue. Filter/sort/limit in JS — no Firestore index needed.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { filterAndSortComplaints, type ComplaintDoc } from "@/lib/admin/complaints";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/firebase/admin";

const querySchema = z.object({ status: z.enum(["open", "resolved"]).optional() });

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = querySchema.safeParse({ status: request.nextUrl.searchParams.get("status") ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "invalid_input", message: "Invalid filters" } }, { status: 400 });
    }

    const snap = await db.collection("complaints").get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ComplaintDoc[];
    return NextResponse.json({ items: filterAndSortComplaints(items, parsed.data.status) });
  } catch (error) {
    const response = adminErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
