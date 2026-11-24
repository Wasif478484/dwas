// Spec C03 (confirm screen) + C04 (editable urgency chip).
"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { IntakeResult, Urgency } from "@/lib/types";

const URGENCIES: Urgency[] = ["now", "today", "tomorrow", "flexible"];

export default function ConfirmScreen({
  result,
  onConfirm,
  onPickTrade,
  onUrgencyChange,
}: {
  result: IntakeResult;
  onConfirm: () => void;
  onPickTrade: () => void;
  onUrgencyChange: (urgency: Urgency) => void;
}) {
  const lang: Lang = useLang();
  const [urgency, setUrgency] = useState<Urgency>(result.urgency);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-hairline bg-background p-4">
      <p className="text-ink">{result.summary_ur || result.summary_en}</p>
      {result.trade !== "unknown" && (
        <p className="rounded-pill border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
          {t(lang, `trade.${result.trade}`)}
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t(lang, "client.urgencyLabel")}>
        {URGENCIES.map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={urgency === u}
            onClick={() => {
              setUrgency(u);
              onUrgencyChange(u);
            }}
            className={`rounded-pill border px-3 py-1.5 text-xs ${
              urgency === u ? "border-primary bg-primary text-white" : "border-hairline text-ink-muted"
            }`}
          >
            {t(lang, `urgency.${u}`)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={result.trade === "unknown"}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {t(lang, "client.haan")}
        </button>
        <button type="button" onClick={onPickTrade} className="rounded-lg border border-hairline px-6 py-2 text-sm font-medium">
          {t(lang, "client.nahi")}
        </button>
      </div>
    </section>
  );
}
