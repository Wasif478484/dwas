// C08: public indicative price lookup. Prices come only from the seeded
// rateTable — the client never computes a quote.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { rateBand, type RateTableRow } from "@/lib/rate-table";

const querySchema = z.object({
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"]),
  jobType: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    trade: url.searchParams.get("trade"),
    jobType: url.searchParams.get("jobType"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid query" } }, { status: 400 });
  }

  let band: { min: number; max: number } | null = null;
  try {
    const snap = await db.collection("rateTable").get();
    band = rateBand(parsed.data.trade, parsed.data.jobType, snap.docs.map((doc) => doc.data() as RateTableRow));
  } catch {
    // No rows (or Firestore unconfigured): the UI shows "price not available".
    band = null;
  }
  return NextResponse.json({ band });
}
