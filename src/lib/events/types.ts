// Spec §6 / D08: event log shapes. Kept out of lib/types.ts so Appendix A stays exact.
export const EVENT_TYPES = [
  "intake_started", "voice_ok", "voice_failed", "fallback_used", "match_shown",
  "booking_created", "accepted", "completed", "reviewed", "booking_expired", "quick_book",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventActorRole = "client" | "technician" | "admin" | "system";

export interface EventDoc {
  type: EventType;
  ts: number;
  actorRole: EventActorRole;
  meta?: Record<string, unknown>;
}
