import { describe, expect, it } from "vitest";
import { rankTechnicians } from "@/lib/match/rank";
import { bayesianRating, haversineKm, roundDistance } from "@/lib/match/score";
import type { TechnicianDoc } from "@/lib/types";

const NOW = new Date("2026-11-24T10:00:00Z");
const KM = 1 / 111.32; // roughly one km in degrees of longitude at the equator

function tech(id: string, over: Partial<TechnicianDoc> = {}, km = 0): TechnicianDoc {
  return {
    id,
    name: id,
    workPhotos: [],
    trades: ["plumber"],
    yearsExperience: 10,
    center: { lat: 0, lng: km * KM },
    radiusKm: 15,
    isOnline: true,
    lastActiveAt: NOW.getTime() / 1000,
    approvalStatus: "approved",
    badges: ["admin_approved"],
    stats: { jobsCompleted: 20, ratingSum: 20, ratingCount: 5, avgResponseSec: 120, noShowCount: 0 },
    ...over,
  };
}

function rank(technicians: TechnicianDoc[], urgency: "now" | "today" | "tomorrow" | "flexible" = "today") {
  return rankTechnicians({ trade: "plumber", urgency, client: { lat: 0, lng: 0 }, technicians, now: NOW });
}

describe("ranking helpers (§7.2)", () => {
  it("computes great-circle distance and the Bayesian prior", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1);
    expect(bayesianRating(0, 0)).toBe(4);
    // Bayesian with C=5, prior=4.0: (25 + 5*4) / (5 + 5) = 4.5
    expect(bayesianRating(25, 5)).toBe(4.5);
  });

  it("rounds displayed distance to the nearest half kilometre", () => {
    expect(roundDistance(1.24)).toBe(1);
    expect(roundDistance(1.3)).toBe(1.5);
    expect(roundDistance(1.75)).toBe(2);
    const [result] = rank([tech("near", {}, 1.3)]);
    expect(result.distanceKmRounded).toBe(1.5);
    expect(result).not.toHaveProperty("center");
  });
});

describe("rankTechnicians (§7.2)", () => {
  it("filters by approval, trade, radius and online state", () => {
    const technicians = [
      tech("ok", {}, 0.5),
      tech("pending", { approvalStatus: "pending" }, 0.2),
      tech("suspended", { approvalStatus: "suspended" }, 0.2),
      tech("other-trade", { trades: ["electrician"] }, 0.2),
      tech("too-far", {}, 22),
      tech("offline", { isOnline: false }, 0.3),
    ];
    expect(rank(technicians, "today").map((r) => r.technicianId)).toEqual(["ok"]);
    expect(rank(technicians, "now").map((r) => r.technicianId)).toEqual(["ok"]);
  });

  it("sorts by score, then distance, then most recent activity", () => {
    const a = tech("a", {}, 3);
    const b = tech("b", {}, 1);
    const c = tech("c", {}, 2);
    expect(rank([a, b, c]).map((r) => r.technicianId)).toEqual(["b", "c", "a"]);

    const older = tech("older", { lastActiveAt: 100 }, 1);
    const newer = tech("newer", { lastActiveAt: 9999 }, 1);
    expect(rank([older, newer]).map((r) => r.technicianId)).toEqual(["newer", "older"]);
  });

  it("subtracts a penalty per no-show", () => {
    const clean = tech("clean", {}, 1);
    const noShows = tech("no-shows", { stats: { ...clean.stats, noShowCount: 2 } }, 1);
    const [first, second] = rank([noShows, clean]);
    expect(first.technicianId).toBe("clean");
    expect(second.technicianId).toBe("no-shows");
  });

  it("weights proximity and reply speed more for 'now' than for 'flexible'", () => {
    const nearSlow = tech("near-slow", {
      yearsExperience: 0,
      stats: { jobsCompleted: 50, ratingSum: 0, ratingCount: 0, avgResponseSec: 600, noShowCount: 0 },
    }, 0.5);
    const farFast = tech("far-fast", {
      yearsExperience: 15,
      stats: { jobsCompleted: 50, ratingSum: 25, ratingCount: 5, avgResponseSec: 60, noShowCount: 0 },
    }, 4);
    expect(rank([nearSlow, farFast], "now")[0].technicianId).toBe("near-slow");
    expect(rank([nearSlow, farFast], "flexible")[0].technicianId).toBe("far-fast");
  });

  it("reserves rank five for the best newcomer when the top five has none", () => {
    const established = Array.from({ length: 6 }, (_, i) => tech(`t${i}`, {}, i + 1));
    const newcomer = tech("newbie", {
      stats: { jobsCompleted: 2, ratingSum: 5, ratingCount: 1, avgResponseSec: 300, noShowCount: 0 },
    }, 7);
    const results = rank([...established, newcomer]);
    expect(results).toHaveLength(7);
    expect(results[4].technicianId).toBe("newbie");
    expect(results[4].isNewcomerSlot).toBe(true);
    expect(results[4].reasons.map((r) => r.key)).toContain("newcomer");
    expect(results.filter((r) => r.isNewcomerSlot)).toHaveLength(1);
  });

  it("does not add a newcomer slot when the top five already has a newcomer", () => {
    const mixed = [
      tech("new-in-top", { stats: { jobsCompleted: 2, ratingSum: 25, ratingCount: 5, avgResponseSec: 10, noShowCount: 0 } }, 1),
      ...Array.from({ length: 5 }, (_, i) => tech(`t${i}`, {}, i + 2)),
    ];
    const results = rank(mixed);
    expect(results.slice(0, 5).some((r) => r.jobsCompleted < 5)).toBe(true);
    expect(results.some((r) => r.isNewcomerSlot)).toBe(false);
  });
});
