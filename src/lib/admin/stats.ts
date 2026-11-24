// A04: dashboard numbers. Pure aggregation for tests plus a Firestore loader
// that tolerates missing collections (missing data yields zeros).
import type { Firestore } from "firebase-admin/firestore";

const DAY_MS = 86_400_000;

// Firestore docs are untyped at the boundary; these are the fields we read.
export interface StatsBooking {
  createdAt?: number;
  trade?: string;
  statusHistory?: { status: string; at: number }[];
}
export interface StatsReview {
  createdAt?: number;
  stars?: number;
  hidden?: boolean;
}
export interface StatsEvent {
  type?: string;
  ts?: number;
  meta?: Record<string, unknown>;
  areaId?: unknown; // logEvent flattens meta onto the stored doc
}
export interface StatsComplaint {
  createdAt?: number;
}

export interface StatsInput {
  bookings: StatsBooking[];
  reviews: StatsReview[];
  events: StatsEvent[];
  complaints: StatsComplaint[];
  now: number;
  days: number;
}

export interface AdminStats {
  range: { from: number; to: number; days: number };
  totals: { bookings: number; reviews: number; complaints: number };
  bookingsPerDay: { day: string; count: number }[];
  byTrade: { trade: string; count: number }[];
  acceptanceRate: number;
  avgTimeToAcceptSec: number | null;
  avgRating: number | null;
  voiceSuccessRate: number | null;
  fallbackUsage: number;
  demandMap: { areaId: string; count: number }[];
}

function inRange(ts: number | undefined, from: number, to: number): boolean {
  return typeof ts === "number" && Number.isFinite(ts) && ts >= from && ts <= to;
}

function tally(values: string[]): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function aggregateStats({ bookings, reviews, events, complaints, now, days }: StatsInput): AdminStats {
  const to = now;
  const from = now - days * DAY_MS;
  const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

  const dayCounts = new Map<string, number>();
  const trades: string[] = [];
  const acceptSecs: number[] = [];
  let bookingCount = 0;
  let accepted = 0;

  for (const booking of bookings) {
    const createdAt = booking.createdAt;
    if (typeof createdAt !== "number" || !inRange(createdAt, from, to)) continue;
    bookingCount += 1;
    const day = dayKey(createdAt);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    if (booking.trade) trades.push(booking.trade);

    const history = booking.statusHistory ?? [];
    const requested = history.find((entry) => entry.status === "requested") ?? history[0];
    const acceptance = history.find((entry) => entry.status === "accepted");
    if (requested && acceptance) {
      accepted += 1;
      const seconds = (acceptance.at - requested.at) / 1000;
      if (seconds >= 0) acceptSecs.push(seconds);
    }
  }

  const bookingsPerDay: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = dayKey(now - i * DAY_MS);
    bookingsPerDay.push({ day, count: dayCounts.get(day) ?? 0 });
  }

  let reviewCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  for (const review of reviews) {
    if (!inRange(review.createdAt, from, to)) continue;
    reviewCount += 1;
    if (review.hidden === true || typeof review.stars !== "number") continue;
    ratingSum += review.stars;
    ratingCount += 1;
  }
  const complaintCount = complaints.filter((complaint) => inRange(complaint.createdAt, from, to)).length;

  let intake = 0;
  let fallback = 0;
  let voiceOk = 0;
  let voiceFailed = 0;
  const areas: string[] = [];
  for (const event of events) {
    if (!inRange(event.ts, from, to)) continue;
    switch (event.type) {
      case "intake_started": intake += 1; break;
      case "fallback_used": fallback += 1; break;
      case "voice_ok": voiceOk += 1; break;
      case "voice_failed": voiceFailed += 1; break;
      case "booking_created": {
        const areaId = event.meta?.areaId ?? event.areaId;
        if (typeof areaId === "string" && areaId) areas.push(areaId);
        break;
      }
    }
  }
  const voiceTotal = voiceOk + voiceFailed;

  return {
    range: { from, to, days },
    totals: { bookings: bookingCount, reviews: reviewCount, complaints: complaintCount },
    bookingsPerDay,
    byTrade: tally(trades).map(({ key, count }) => ({ trade: key, count })),
    acceptanceRate: bookingCount ? (accepted / bookingCount) * 100 : 0,
    avgTimeToAcceptSec: acceptSecs.length ? acceptSecs.reduce((sum, secs) => sum + secs, 0) / acceptSecs.length : null,
    avgRating: ratingCount ? ratingSum / ratingCount : null,
    voiceSuccessRate: voiceTotal ? (voiceOk / voiceTotal) * 100 : null,
    fallbackUsage: intake ? (fallback / intake) * 100 : 0,
    demandMap: tally(areas).map(({ key, count }) => ({ areaId: key, count })),
  };
}

async function readCollection<T>(db: Firestore, name: string): Promise<T[]> {
  try {
    const snapshot = await db.collection(name).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[];
  } catch {
    return [];
  }
}

export async function loadStats(db: Firestore, days: number): Promise<AdminStats> {
  const [bookings, reviews, events, complaints] = await Promise.all([
    readCollection<StatsBooking>(db, "bookings"),
    readCollection<StatsReview>(db, "reviews"),
    readCollection<StatsEvent>(db, "events"),
    readCollection<StatsComplaint>(db, "complaints"),
  ]);
  return aggregateStats({ bookings, reviews, events, complaints, now: Date.now(), days });
}
