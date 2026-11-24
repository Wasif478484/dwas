// C15: reuse a past booking's intake for "Dubara bulayein" without calling /api/intake.
import type { BookingDoc, IntakeResult } from "@/lib/types";

export interface RebookPrefill {
  intake: IntakeResult;
  selectedTech: string;
  rebook: true;
}

// Only stable booking fields are copied; status, statusHistory, phoneRevealed,
// shareToken, expiresAt, finalPrice, candidates and attempts stay behind.
export function rebookPrefill(booking: BookingDoc): RebookPrefill | null {
  if (!booking.technicianId || !booking.trade) return null;
  return {
    intake: {
      trade: booking.trade,
      jobType: booking.jobType,
      urgency: booking.urgency,
      emergency: { is_emergency: false, kind: "none" },
      summary_en: booking.summary_en,
      summary_ur: booking.summary_ur,
      confidence: 1,
      language_detected: "en",
      needs_clarification: false,
      clarifying_question_ur: null,
      source: "rules",
    },
    selectedTech: booking.technicianId,
    rebook: true,
  };
}
