import { describe, expect, it } from "vitest";
import type { LocationData } from "@/components/LocationScreen";
import { bookingPrefill } from "@/lib/booking/prefill";
import type { IntakeResult } from "@/lib/types";

const intake: IntakeResult = {
  trade: "plumber",
  jobType: "tap_leak",
  urgency: "today",
  emergency: { is_emergency: false, kind: "none" },
  summary_en: "Tap is leaking",
  summary_ur: "نل ٹپک رہا ہے",
  confidence: 0.9,
  language_detected: "en",
  needs_clarification: false,
  clarifying_question_ur: null,
  source: "rules",
};

describe("bookingPrefill (C08)", () => {
  it("builds the POST /api/bookings payload", () => {
    expect(bookingPrefill(intake, { areaId: "saddar", lat: 33.595, lng: 73.049 }, "tech-1")).toEqual({
      technicianId: "tech-1",
      quick: false,
      intake,
      location: { areaId: "saddar", lat: 33.595, lng: 73.049 },
      note: "",
      photoUrls: [],
    });
  });

  it("returns null when intake or technician is missing", () => {
    expect(bookingPrefill(null, null, "tech-1")).toBeNull();
    expect(bookingPrefill(intake, null, null)).toBeNull();
  });

  it("drops volatile location fields and keeps only present coordinates", () => {
    const volatile = { areaId: "g-11", lat: 33.668, lng: 72.998, note: "near the shop", accuracy: 9 };
    const payload = bookingPrefill(intake, volatile as unknown as LocationData, "tech-1");
    expect(payload?.location).toEqual({ areaId: "g-11", lat: 33.668, lng: 72.998 });
    expect(payload?.location).not.toHaveProperty("note");
    expect(payload?.note).toBe("");
    // Area-only fallback (spec C05) uses the seeded area's rounded coordinates.
    expect(bookingPrefill(intake, { areaId: "g-11" }, "tech-1")?.location).toEqual({
      areaId: "g-11",
      lat: 33.668,
      lng: 72.998,
    });
  });
});
