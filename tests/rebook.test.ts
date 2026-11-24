import { describe, expect, it } from "vitest";
import { rebookPrefill } from "@/lib/booking/rebook";
import type { BookingDoc, IntakeResult } from "@/lib/types";

const booking: BookingDoc = {
  id: "b-1",
  clientId: "c-1",
  technicianId: "t-1",
  trade: "plumber",
  jobType: "tap_leak",
  problemRaw: "tap is leaking",
  summary_en: "Tap is leaking",
  summary_ur: "نل ٹپک رہا ہے",
  urgency: "today",
  location: { lat: 33.6, lng: 73.0, areaId: "saddar", note: "near the shop" },
  priceBand: { min: 500, max: 900 },
  finalPrice: 700,
  status: "completed",
  statusHistory: [{ status: "requested", at: 1, actor: "client" }],
  candidates: ["t-1", "t-2"],
  attempts: [{ technicianId: "t-2", at: 2, result: "timeout" }],
  expiresAt: 3,
  photoUrls: [],
  phoneRevealed: true,
  shareToken: "secret-token",
  createdAt: 1,
};

const expectedIntake: IntakeResult = {
  trade: "plumber",
  jobType: "tap_leak",
  urgency: "today",
  emergency: { is_emergency: false, kind: "none" },
  summary_en: "Tap is leaking",
  summary_ur: "نل ٹپک رہا ہے",
  confidence: 1,
  language_detected: "en",
  needs_clarification: false,
  clarifying_question_ur: null,
  source: "rules",
};

describe("rebookPrefill (C15)", () => {
  it("maps a past booking to a fresh intake and the same technician", () => {
    expect(rebookPrefill(booking)).toEqual({
      intake: expectedIntake,
      selectedTech: "t-1",
      rebook: true,
    });
  });

  it("returns null when the technician or trade is missing", () => {
    expect(rebookPrefill({ ...booking, technicianId: "" })).toBeNull();
    expect(rebookPrefill({ ...booking, trade: undefined as unknown as BookingDoc["trade"] })).toBeNull();
  });

  it("drops volatile booking fields from the produced intake", () => {
    const prefill = rebookPrefill(booking);
    expect(prefill).not.toBeNull();
    for (const key of [
      "status",
      "statusHistory",
      "phoneRevealed",
      "shareToken",
      "expiresAt",
      "finalPrice",
      "candidates",
      "attempts",
      "location",
      "id",
      "clientId",
    ]) {
      expect(prefill?.intake).not.toHaveProperty(key);
    }
    expect(Object.keys(prefill!)).toEqual(["intake", "selectedTech", "rebook"]);
  });
});
