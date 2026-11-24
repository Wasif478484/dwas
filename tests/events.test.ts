import { describe, expect, it } from "vitest";
import { eventSchema } from "@/lib/events/log";
import { EVENT_TYPES, type EventType } from "@/lib/events/types";

// Spec §6 / D08: the event doc shape and the canonical spec event names.
describe("event log (§6/D08)", () => {
  it("accepts a well-formed event", () => {
    const event = { type: "booking_created", ts: Date.now(), actorRole: "client", meta: { bookingId: "b1" } };
    expect(eventSchema.safeParse(event).success).toBe(true);
    expect(eventSchema.safeParse({ type: "intake_started", ts: 0, actorRole: "system" }).success).toBe(true);
  });

  it("rejects a bad type and a bad ts", () => {
    expect(eventSchema.safeParse({ type: "not_an_event", ts: Date.now(), actorRole: "client" }).success).toBe(false);
    expect(eventSchema.safeParse({ type: "intake_started", ts: "yesterday", actorRole: "client" }).success).toBe(false);
  });

  it("contains all nine §6 event names in EventType", () => {
    const specEvents: EventType[] = [
      "intake_started", "voice_ok", "voice_failed", "fallback_used", "match_shown",
      "booking_created", "accepted", "completed", "reviewed",
    ];
    for (const name of specEvents) expect(EVENT_TYPES).toContain(name);
  });
});
