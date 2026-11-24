import { describe, expect, it } from "vitest";
import { aggregateStats, type StatsInput } from "@/lib/admin/stats";

const NOW = Date.UTC(2026, 0, 3, 12, 0, 0);
const DAY = 86_400_000;

function input(overrides: Partial<StatsInput> = {}): StatsInput {
  return { bookings: [], reviews: [], events: [], complaints: [], now: NOW, days: 3, ...overrides };
}

function booking(createdAt: number, extra: Partial<StatsInput["bookings"][number]> = {}) {
  return { createdAt, trade: "plumber", statusHistory: [{ status: "requested", at: createdAt }], ...extra };
}

describe("admin stats aggregation (A04)", () => {
  it("excludes hidden and out-of-range reviews from the average", () => {
    const stats = aggregateStats(input({
      reviews: [
        { createdAt: NOW - DAY, stars: 5, hidden: false },
        { createdAt: NOW - DAY, stars: 4, hidden: false },
        { createdAt: NOW - DAY, stars: 1, hidden: true },
        { createdAt: NOW - 5 * DAY, stars: 1, hidden: false },
      ],
    }));
    expect(stats.avgRating).toBe(4.5);
    expect(stats.totals.reviews).toBe(3);
  });

  it("buckets bookings into UTC days and drops out-of-range timestamps", () => {
    const stats = aggregateStats(input({
      bookings: [
        booking(Date.UTC(2026, 0, 1, 0, 5)),
        booking(Date.UTC(2026, 0, 1, 23, 59)),
        booking(Date.UTC(2026, 0, 2, 12, 0)),
        booking(Date.UTC(2026, 0, 3, 11, 59)),
        booking(Date.UTC(2025, 11, 31, 11, 59)),
        booking(Date.UTC(2026, 0, 3, 12, 1)),
      ],
    }));
    expect(stats.bookingsPerDay).toEqual([
      { day: "2026-01-01", count: 2 },
      { day: "2026-01-02", count: 1 },
      { day: "2026-01-03", count: 1 },
    ]);
    expect(stats.totals.bookings).toBe(4);
  });

  it("returns zeros and nulls when there is no data", () => {
    const stats = aggregateStats(input());
    expect(stats.totals).toEqual({ bookings: 0, reviews: 0, complaints: 0 });
    expect(stats.acceptanceRate).toBe(0);
    expect(stats.avgTimeToAcceptSec).toBeNull();
    expect(stats.avgRating).toBeNull();
    expect(stats.voiceSuccessRate).toBeNull();
    expect(stats.fallbackUsage).toBe(0);
    expect(stats.bookingsPerDay.every((day) => day.count === 0)).toBe(true);
    expect(stats.bookingsPerDay).toHaveLength(3);
    expect(stats.byTrade).toEqual([]);
    expect(stats.demandMap).toEqual([]);
  });

  it("computes acceptance, accept time, voice, fallback and demand from stored records", () => {
    const b1 = booking(NOW - DAY, {
      statusHistory: [
        { status: "requested", at: NOW - DAY },
        { status: "accepted", at: NOW - DAY + 60_000 },
      ],
    });
    const b2 = booking(NOW - DAY, {
      trade: "electrician",
      statusHistory: [
        { status: "requested", at: NOW - DAY },
        { status: "accepted", at: NOW - DAY + 180_000 },
      ],
    });
    const stats = aggregateStats(input({
      bookings: [b1, b2, booking(NOW - DAY, { trade: "plumber" }), booking(NOW - 2 * DAY, { trade: "carpenter" })],
      events: [
        ...Array.from({ length: 3 }, () => ({ type: "voice_ok", ts: NOW - 1_000 })),
        { type: "voice_failed", ts: NOW - 900 },
        { type: "voice_failed", ts: NOW - 10 * DAY },
        ...Array.from({ length: 8 }, () => ({ type: "intake_started", ts: NOW - 600 })),
        ...Array.from({ length: 2 }, () => ({ type: "fallback_used", ts: NOW - 100 })),
        ...Array.from({ length: 2 }, () => ({ type: "booking_created", ts: NOW - 500, meta: { areaId: "saddar" } })),
        { type: "booking_created", ts: NOW - 400, meta: { areaId: "g-11" } },
        { type: "booking_created", ts: NOW - 300, meta: {} },
        { type: "booking_created", ts: NOW - 200, areaId: "f-10" },
      ],
    }));

    expect(stats.acceptanceRate).toBe(50);
    expect(stats.avgTimeToAcceptSec).toBe(120);
    expect(stats.voiceSuccessRate).toBe(75);
    expect(stats.fallbackUsage).toBe(25);
    expect(stats.byTrade).toEqual([
      { trade: "plumber", count: 2 },
      { trade: "carpenter", count: 1 },
      { trade: "electrician", count: 1 },
    ]);
    expect(stats.demandMap).toEqual([
      { areaId: "saddar", count: 2 },
      { areaId: "f-10", count: 1 },
      { areaId: "g-11", count: 1 },
    ]);
  });
});
