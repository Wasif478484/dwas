// DWAS spec §7.3 / §12.2 — trust score and badge derivation.
// Pure maths plus one shared recompute so every writer computes the same values.
import type { Firestore } from "firebase-admin/firestore";
import { NEWCOMER_JOBS } from "@/lib/config";
import { bayesianRating, clamp01 } from "@/lib/match/score";
import type { Approval, TechnicianDoc } from "@/lib/types";

type Stats = TechnicianDoc["stats"];

export interface ReviewLike {
  stars: number;
  hidden?: boolean;
}

// Badges derived here are rebuilt on every recompute; only other keys survive.
const DERIVED = new Set(["admin_approved", "five_jobs", "top_rated", "fast_replies", "newcomer"]);

export function nonDerivedBadges(badges: string[] = []): string[] {
  return badges.filter((badge) => !DERIVED.has(badge) && !/verified/i.test(badge));
}

export function ratingsFromReviews(reviews: ReviewLike[]): { ratingSum: number; ratingCount: number } {
  const visible = reviews.filter((review) => review.hidden !== true && typeof review.stars === "number");
  return {
    ratingSum: visible.reduce((sum, review) => sum + review.stars, 0),
    ratingCount: visible.length,
  };
}

export function rating01(stats: Pick<Stats, "ratingSum" | "ratingCount">): number {
  return clamp01((bayesianRating(stats.ratingSum, stats.ratingCount) - 1) / 4);
}

export function trustScore(stats: Stats): number {
  // Spec §7.3: round(100 * (0.7*r + 0.3*v)). Integer weights avoid the
  // floating-point artifact where 100*(0.7*0.75) rounds down to 52.
  return Math.round(70 * rating01(stats) + 30 * Math.min(stats.jobsCompleted / 50, 1));
}

export function computeBadges(
  stats: Stats,
  opts: { approvalStatus?: Approval; manualBadges?: string[] },
): string[] {
  const derived: string[] = [];
  if (opts.approvalStatus === "approved") derived.push("admin_approved");
  if (stats.jobsCompleted >= NEWCOMER_JOBS) derived.push("five_jobs");
  if (stats.ratingCount >= 10 && stats.ratingSum / stats.ratingCount >= 4.5) derived.push("top_rated");
  if (stats.avgResponseSec !== null && stats.avgResponseSec <= 180 && stats.jobsCompleted >= NEWCOMER_JOBS) {
    derived.push("fast_replies");
  }
  if (stats.jobsCompleted < NEWCOMER_JOBS) derived.push("newcomer");
  return [...new Set([...derived, ...nonDerivedBadges(opts.manualBadges)])];
}

export interface TrustDerivation {
  stats: Stats;
  badges: string[];
  trustScore: number;
}

// Single derivation used by both the transaction in the review route and the
// Firestore helper below, so the maths cannot drift between writers.
export function deriveTechnicianTrust(input: {
  jobsCompleted: number;
  ratingSum: number;
  ratingCount: number;
  avgResponseSec: number | null;
  noShowCount: number;
  approvalStatus?: Approval;
  manualBadges?: string[];
}): TrustDerivation {
  const stats: Stats = {
    jobsCompleted: input.jobsCompleted,
    ratingSum: input.ratingSum,
    ratingCount: input.ratingCount,
    avgResponseSec: input.avgResponseSec,
    noShowCount: input.noShowCount,
  };
  return {
    stats,
    badges: computeBadges(stats, { approvalStatus: input.approvalStatus, manualBadges: input.manualBadges }),
    trustScore: trustScore(stats),
  };
}

// Shared I/O path for admin routes: recompute from visible reviews and the
// absolute completed-booking count, then persist aggregates, badges and score.
export async function recomputeTechnicianTrust(db: Firestore, technicianId: string): Promise<TrustDerivation> {
  const techRef = db.collection("technicians").doc(technicianId);
  const COMPLETED = ["completed", "reviewed", "disputed"] as const;
  const [techSnap, reviewsSnap, doneSnap] = await Promise.all([
    techRef.get(),
    db.collection("reviews").where("technicianId", "==", technicianId).get(),
    db.collection("bookings").where("technicianId", "==", technicianId).where("status", "in", [...COMPLETED]).count().get(),
  ]);

  const tech = (techSnap.data() ?? {}) as Partial<TechnicianDoc>;
  const stats = (tech.stats ?? {}) as Partial<Stats>;
  const ratings = ratingsFromReviews(reviewsSnap.docs.map((doc) => doc.data() as ReviewLike));
  const derived = deriveTechnicianTrust({
    jobsCompleted: doneSnap.data().count,
    ...ratings,
    avgResponseSec: stats.avgResponseSec ?? null,
    noShowCount: stats.noShowCount ?? 0,
    approvalStatus: tech.approvalStatus,
    manualBadges: nonDerivedBadges(Array.isArray(tech.badges) ? tech.badges : []),
  });

  await techRef.update({
    "stats.jobsCompleted": derived.stats.jobsCompleted,
    "stats.ratingSum": derived.stats.ratingSum,
    "stats.ratingCount": derived.stats.ratingCount,
    badges: derived.badges,
    trustScore: derived.trustScore,
  });
  return derived;
}
