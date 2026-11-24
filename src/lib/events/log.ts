// Spec §6 / D08: one shared, best-effort event writer for every API route.
import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { EVENT_TYPES, type EventActorRole, type EventType } from "./types";

// Validates an EventDoc-shaped object; used by tests (§6).
export const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  ts: z.number(),
  actorRole: z.enum(["client", "technician", "admin", "system"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function logEvent(
  type: EventType,
  actorRole: EventActorRole,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.collection("events").add({ type, ts: Date.now(), actorRole, ...(meta ?? {}) });
  } catch {
    // Events are best-effort: analytics must never fail the caller.
  }
}
