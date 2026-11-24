import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, noShowEligible, transition, TransitionError, type Actor, type TransitionPayload } from "@/lib/booking/machine";
import type { BookingDoc, BookingStatus } from "@/lib/types";

const NOW = 1_700_000_000_000;
const SCHEDULED = NOW + 3 * 60 * 60_000;

function booking(status: BookingStatus): BookingDoc {
  return {
    id: "b1", clientId: "c1", technicianId: "t1", trade: "plumber", jobType: "repair",
    problemRaw: "tap leaking", summary_en: "Tap leaking", summary_ur: "Tapak raha hai", urgency: "now",
    location: { lat: 0, lng: 0 },
    priceBand: { min: 100, max: 1000 },
    status,
    statusHistory: [{ status: "requested", at: NOW - 1000, actor: "client" }],
    candidates: ["t1"], attempts: [], expiresAt: NOW + 300_000,
    scheduledFor: SCHEDULED, photoUrls: [], phoneRevealed: false,
    shareToken: "token", createdAt: NOW - 1000,
  };
}

type Case = { from: BookingStatus; to: BookingStatus; actor: Actor; payload?: TransitionPayload };

const allowed: Case[] = [
  { from: "requested", to: "accepted", actor: "technician", payload: { now: NOW } },
  { from: "requested", to: "declined", actor: "technician", payload: { now: NOW } },
  { from: "requested", to: "expired", actor: "system", payload: { now: NOW + 300_001 } },
  { from: "requested", to: "cancelled_client", actor: "client", payload: { now: NOW } },
  { from: "accepted", to: "on_the_way", actor: "technician", payload: { now: NOW } },
  { from: "accepted", to: "cancelled_client", actor: "client", payload: { now: NOW } },
  { from: "accepted", to: "cancelled_tech", actor: "technician", payload: { now: NOW } },
  { from: "accepted", to: "no_show", actor: "client", payload: { now: SCHEDULED + 31 * 60_000 } },
  { from: "on_the_way", to: "in_progress", actor: "technician", payload: { now: NOW } },
  { from: "on_the_way", to: "cancelled_client", actor: "client", payload: { now: NOW } },
  { from: "on_the_way", to: "cancelled_tech", actor: "technician", payload: { now: NOW } },
  { from: "on_the_way", to: "no_show", actor: "client", payload: { now: SCHEDULED + 31 * 60_000 } },
  { from: "in_progress", to: "completed", actor: "technician", payload: { now: NOW, finalPrice: 500 } },
  { from: "completed", to: "reviewed", actor: "client", payload: { now: NOW, stars: 5 } },
  { from: "completed", to: "disputed", actor: "client", payload: { now: NOW } },
];

describe("booking state machine", () => {
  it("covers every allowed transition exactly once", () => {
    const table = Object.entries(ALLOWED_TRANSITIONS).flatMap(([from, targets]) =>
      targets.map((to) => `${from}->${to}`),
    );
    expect(table.sort()).toEqual(allowed.map((c) => `${c.from}->${c.to}`).sort());
  });

  it.each(allowed)("allows $from -> $to", ({ from, to, actor, payload }) => {
    const before = booking(from);
    const after = transition(before, to, actor, payload);
    expect(after).not.toBe(before);
    expect(after.status).toBe(to);
    expect(after.statusHistory).toHaveLength(before.statusHistory.length + 1);
    expect(after.statusHistory.at(-1)).toMatchObject({ status: to, actor, at: payload?.now ?? expect.any(Number) });
    if (to === "accepted") expect(after.phoneRevealed).toBe(true);
  });

  const statuses = Object.keys(ALLOWED_TRANSITIONS) as BookingStatus[];
  it.each(statuses.flatMap((from) => statuses.map((to) => ({ from, to }))))(
    "rejects $from -> $to when not in the table",
    ({ from, to }) => {
      if (ALLOWED_TRANSITIONS[from].includes(to)) return;
      expect(() => transition(booking(from), to, "system", { now: NOW + 300_001, finalPrice: 500, stars: 5 }))
        .toThrow(TransitionError);
    },
  );

  it("requires a valid finalPrice on completion", () => {
    const before = booking("in_progress");
    expect(transition(before, "completed", "technician", { now: NOW, finalPrice: 500 }).finalPrice).toBe(500);
    for (const finalPrice of [undefined, -1, Number.NaN]) {
      expect(() => transition(before, "completed", "technician", { now: NOW, finalPrice }))
        .toThrow(TransitionError);
    }
    expect(transition(before, "completed", "technician", { now: NOW, finalPrice: 2000 }).statusHistory.at(-1)?.reason)
      .toBe("over_band_confirmation_required");
  });
});

describe("noShowEligible", () => {
  it("is false 29 minutes after the scheduled time", () => {
    expect(noShowEligible(booking("accepted"), SCHEDULED + 29 * 60_000)).toBe(false);
  });

  it("is true from 30 minutes after the scheduled time in actionable states", () => {
    const at = SCHEDULED + 30 * 60_000;
    expect(noShowEligible(booking("accepted"), at)).toBe(true);
    expect(noShowEligible(booking("on_the_way"), at)).toBe(true);
  });

  it("is false in other statuses", () => {
    const at = SCHEDULED + 31 * 60_000;
    expect(noShowEligible(booking("requested"), at)).toBe(false);
    expect(noShowEligible(booking("in_progress"), at)).toBe(false);
  });

  it("is false without a scheduledFor time", () => {
    const before = booking("accepted");
    delete before.scheduledFor;
    expect(noShowEligible(before, SCHEDULED + 31 * 60_000)).toBe(false);
  });
});
