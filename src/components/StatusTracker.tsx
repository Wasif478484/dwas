// Spec C16/D10: five-step live tracker with haptic + spoken step changes.
"use client";

import { useEffect, useRef } from "react";
import { t, type Lang, type TranslationKey } from "@/lib/i18n";
import type { BookingStatus } from "@/lib/types";

// shortcut: new keys are added to en/ur JSON by the integrator; cast keeps strict TS green until then
export function tr(lang: Lang, key: string): string {
  return t(lang, key as TranslationKey);
}

const STEPS = ["requested", "accepted", "on_the_way", "in_progress", "completed"] as const;
const STEP_INDEX: Partial<Record<BookingStatus, number>> = {
  requested: 0,
  accepted: 1,
  on_the_way: 2,
  in_progress: 3,
  completed: 4,
  reviewed: 4,
  disputed: 4,
};

export default function StatusTracker({ status, lang }: { status: BookingStatus; lang: Lang }) {
  const index = STEP_INDEX[status] ?? 0;
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (previous.current === null) {
      previous.current = index;
      return;
    }
    if (previous.current === index) return;
    previous.current = index;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(120);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(tr(lang, `booking.step.${STEPS[index]}`));
      utterance.lang = lang === "ur" ? "ur-PK" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }, [index, lang]);

  return (
    <section className="flex flex-col gap-2" aria-label={tr(lang, "booking.trackerTitle")}>
      <h2 className="text-sm font-medium text-ink-muted">{tr(lang, "booking.trackerTitle")}</h2>
      <ol className="flex flex-col gap-2">
        {STEPS.map((step, i) => (
          <li
            key={step}
            aria-current={i === index ? "step" : undefined}
            className={`flex items-center gap-3 rounded-md border p-3 ${
              i === index ? "border-primary bg-primary/10" : "border-hairline bg-background"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-xs font-medium ${
                i <= index ? "bg-primary text-white" : "border border-hairline text-ink-muted"
              }`}
            >
              {i < index ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${i <= index ? "text-ink" : "text-ink-muted"}`}>
              {tr(lang, `booking.step.${step}`)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
