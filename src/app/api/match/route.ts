// DWAS spec §8.1 / C06: POST /api/match — public, zod-validated input,
// Firestore read + deterministic ranking (§7.2). Prices come only from the
// rate table (D03); the match itself never quotes a price.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { logEvent } from "@/lib/events/log";
import { rankTechnicians, type MatchCard } from "@/lib/match/rank";
import { rateBand, type RateTableRow } from "@/lib/rate-table";
import type { TechnicianDoc } from "@/lib/types";

const inputSchema = z.object({
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"]),
  jobType: z.string().min(1),
  urgency: z.enum(["now", "today", "tomorrow", "flexible"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  areaId: z.string().optional(),
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type TechDocLike = { id: string; data(): Partial<TechnicianDoc> };

function toTechnician(doc: TechDocLike): TechnicianDoc {
  const d = doc.data();
  const stats = d.stats;
  return {
    id: doc.id,
    name: d.name ?? "Technician",
    photoUrl: d.photoUrl,
    workPhotos: Array.isArray(d.workPhotos) ? d.workPhotos : [],
    trades: Array.isArray(d.trades) ? d.trades : [],
    yearsExperience: Number(d.yearsExperience ?? 0),
    bio_ur: d.bio_ur,
    bio_en: d.bio_en,
    visitFeePKR: d.visitFeePKR,
    center: {
      lat: Number(d.center?.lat ?? 0),
      lng: Number(d.center?.lng ?? 0),
      areaId: d.center?.areaId,
    },
    radiusKm: Number(d.radiusKm ?? 15),
    isOnline: Boolean(d.isOnline),
    lastActiveAt: Number(d.lastActiveAt ?? 0),
    approvalStatus: d.approvalStatus ?? "approved",
    badges: Array.isArray(d.badges) ? d.badges : [],
    stats: {
      jobsCompleted: Number(stats?.jobsCompleted ?? 0),
      ratingSum: Number(stats?.ratingSum ?? 0),
      ratingCount: Number(stats?.ratingCount ?? 0),
      avgResponseSec: stats?.avgResponseSec ?? null,
      noShowCount: Number(stats?.noShowCount ?? 0),
    },
    isSeed: d.isSeed,
  };
}

async function loadTechnicians(): Promise<TechnicianDoc[]> {
  try {
    const snap = await db.collection("technicians").where("approvalStatus", "==", "approved").get();
    return snap.docs.map((doc) => toTechnician({ id: doc.id, data: () => doc.data() as Partial<TechnicianDoc> }));
  } catch {
    // Emulator/security-rule setups may reject the filter; rank filters anyway.
    const snap = await db.collection("technicians").get();
    return snap.docs.map((doc) => toTechnician({ id: doc.id, data: () => doc.data() as Partial<TechnicianDoc> }));
  }
}

async function loadRates(): Promise<RateTableRow[]> {
  try {
    const snap = await db.collection("rateTable").get();
    return snap.docs.map((doc) => doc.data() as RateTableRow);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return error("invalid_input", "Invalid input", 400);
  }

  try {
    const { trade, jobType, urgency, lat, lng, areaId } = parsed.data;
    const [technicians, rateRows] = await Promise.all([loadTechnicians(), loadRates()]);
    const ranked = rankTechnicians({ trade, urgency, client: { lat, lng }, technicians, now: new Date() });

    let band: { min: number; max: number } | null = null;
    try {
      band = rateBand(trade, jobType, rateRows);
    } catch {
      band = null; // no rate row: the UI shows "price not available"
    }

    const replyByTech = new Map(technicians.map((t) => [t.id, t.stats.avgResponseSec]));
    const results: MatchCard[] = ranked.map((r) => ({
      ...r,
      priceBand: band,
      avgResponseSec: replyByTech.get(r.technicianId) ?? null,
    }));

    await logEvent("match_shown", "client", {
      trade, jobType, urgency, areaId: areaId ?? null, count: results.length,
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("match failed", err);
    return error("internal_error", "Could not load matches", 500);
  }
}
