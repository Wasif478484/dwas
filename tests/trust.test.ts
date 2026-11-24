import { describe, expect, it } from "vitest";
import {
  computeBadges,
  deriveTechnicianTrust,
  nonDerivedBadges,
  rating01,
  ratingsFromReviews,
  trustScore,
} from "@/lib/trust/score";
import type { TechnicianDoc } from "@/lib/types";

type Stats = TechnicianDoc["stats"];

function stats(over: Partial<Stats> = {}): Stats {
  return { jobsCompleted: 10, ratingSum: 50, ratingCount: 10, avgResponseSec: null, noShowCount: 0, ...over };
}

function badges(over: Partial<Stats> = {}, approvalStatus: "approved" | "pending" = "approved") {
  return computeBadges(stats(over), { approvalStatus });
}

describe("rating01 and trustScore (§7.3)", () => {
  it("normalises the Bayesian rating onto 0..1", () => {
    expect(rating01({ ratingSum: 0, ratingCount: 0 })).toBeCloseTo(0.75); // (4-1)/4
    expect(rating01({ ratingSum: 25, ratingCount: 5 })).toBeCloseTo(0.875); // (4.5-1)/4
  });

  it("clamps rating01 at both ends", () => {
    expect(rating01({ ratingSum: -100, ratingCount: 0 })).toBe(0);
    expect(rating01({ ratingSum: 1000, ratingCount: 1 })).toBe(1);
  });

  it("weights rating 70% and experience 30%, capping volume at 50 jobs", () => {
    expect(trustScore(stats({ jobsCompleted: 0, ratingSum: 0, ratingCount: 0 }))).toBe(53);
    expect(trustScore(stats({ jobsCompleted: 50 }))).toBe(trustScore(stats({ jobsCompleted: 100 })));
    expect(trustScore(stats({ jobsCompleted: 50 }))).toBe(94);
  });
});

describe("computeBadges (§7.3)", () => {
  it("switches newcomer to five_jobs at 5 jobs, not 4", () => {
    expect(badges({ jobsCompleted: 4 })).toContain("newcomer");
    expect(badges({ jobsCompleted: 4 })).not.toContain("five_jobs");
    expect(badges({ jobsCompleted: 5 })).toContain("five_jobs");
    expect(badges({ jobsCompleted: 5 })).not.toContain("newcomer");
  });

  it("requires 10 reviews for top_rated", () => {
    expect(badges({ ratingSum: 45, ratingCount: 9 })).not.toContain("top_rated");
    expect(badges({ ratingSum: 50, ratingCount: 10 })).toContain("top_rated");
    expect(badges({ ratingSum: 44, ratingCount: 10 })).not.toContain("top_rated");
  });

  it("grants fast_replies at 180s and 5 jobs, not at 181s or 4 jobs", () => {
    expect(badges({ jobsCompleted: 5, avgResponseSec: 180 })).toContain("fast_replies");
    expect(badges({ jobsCompleted: 5, avgResponseSec: 181 })).not.toContain("fast_replies");
    expect(badges({ jobsCompleted: 4, avgResponseSec: 180 })).not.toContain("fast_replies");
    expect(badges({ jobsCompleted: 5, avgResponseSec: null })).not.toContain("fast_replies");
  });

  it("adds admin_approved only when approved", () => {
    expect(badges({}, "approved")).toContain("admin_approved");
    expect(badges({}, "pending")).not.toContain("admin_approved");
  });

  it("keeps manual badges and drops stale derived ones", () => {
    expect(computeBadges(stats(), { approvalStatus: "approved", manualBadges: ["id_checked_demo"] }))
      .toEqual(expect.arrayContaining(["admin_approved", "five_jobs", "id_checked_demo"]));
    expect(nonDerivedBadges(["admin_approved", "five_jobs", "top_rated", "fast_replies", "newcomer", "id_checked_demo"]))
      .toEqual(["id_checked_demo"]);
  });

  it("never emits the word 'verified'", () => {
    const result = computeBadges(stats(), { approvalStatus: "approved", manualBadges: ["verified", "id_checked_demo"] });
    expect(result.some((badge) => /verified/i.test(badge))).toBe(false);
    expect(result).toContain("id_checked_demo");
  });
});

describe("recompute inputs (§7.3)", () => {
  it("excludes hidden reviews from rating sums", () => {
    expect(ratingsFromReviews([
      { stars: 5, hidden: false },
      { stars: 1, hidden: true },
      { stars: 4 }, // a missing hidden flag is visible
      { stars: 5, hidden: false },
    ])).toEqual({ ratingSum: 14, ratingCount: 3 });
  });

  it("does not award top_rated when the qualifying review is hidden", () => {
    const ratings = ratingsFromReviews([
      ...Array.from({ length: 9 }, () => ({ stars: 5, hidden: false })),
      { stars: 1, hidden: true },
    ]);
    const derived = deriveTechnicianTrust({
      jobsCompleted: 20,
      ...ratings,
      avgResponseSec: 120,
      noShowCount: 1,
      approvalStatus: "approved",
      manualBadges: ["id_checked_demo"],
    });
    expect(derived.stats.ratingSum).toBe(45);
    expect(derived.badges).not.toContain("top_rated");
    expect(derived.badges).toContain("id_checked_demo");
    expect(derived.stats.noShowCount).toBe(1);
    expect(derived.trustScore).toBe(trustScore(derived.stats));
  });
});
