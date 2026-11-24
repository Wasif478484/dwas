// DWAS C07 — match result card plus the tiny client helpers the server-rendered
// technician page uses for language-dependent labels.
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Lang, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { MatchCard } from "@/lib/match/rank";

const REASON_KEYS: Record<string, TranslationKey> = {
  nearest: "reasons.nearest",
  top_rated: "reasons.top_rated",
  many_jobs: "reasons.many_jobs",
  fast_replies: "reasons.fast_replies",
  newcomer: "reasons.newcomer",
};

export function T({ k }: { k: TranslationKey }) {
  const lang = useLang();
  return <>{t(lang, k)}</>;
}

export function LangDir({ children }: { children: ReactNode }) {
  const lang = useLang();
  return (
    <div dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      {children}
    </div>
  );
}

export function LocalizedText({ en, ur }: { en?: string; ur?: string }) {
  const lang = useLang();
  return <>{(lang === "ur" ? ur || en : en || ur) ?? ""}</>;
}

function replyText(lang: Lang, sec: number | null): string {
  if (sec === null) return t(lang, "card.repliesUnknown");
  return `${Math.max(1, Math.round(sec / 60))} ${t(lang, "unit.min")}`;
}

export default function TechCard({ result }: { result: MatchCard }) {
  const lang = useLang();
  return (
    <Link
      href={`/client/technician/${result.technicianId}`}
      className="pressable block rounded-md border border-hairline bg-background p-4 hover:border-primary"
    >
      <div className="flex gap-3">
        {result.photoUrl ? (
          // Static demo photos: a plain img avoids remote-image host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.photoUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-md bg-surface object-cover" />
        ) : (
          <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface text-xl text-ink-muted">
            {result.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-title font-display text-ink">{result.name}</h2>
            {result.isNewcomerSlot && (
              <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {t(lang, "card.new")}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {result.trades.map((trade) => (
              <span key={trade} className="rounded-pill bg-surface px-2 py-0.5 text-xs text-ink-muted">
                {t(lang, `trade.${trade}`)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink" aria-label={t(lang, "tech.rating")}>
            ★ {result.ratingAvg ?? "—"} · {result.jobsCompleted} {t(lang, "card.jobs")}
          </p>
          <p className="text-sm text-ink-muted">
            {result.distanceKmRounded} {t(lang, "unit.km")} · {t(lang, "card.replies")} {replyText(lang, result.avgResponseSec)}
          </p>
          {result.reasons.length > 0 && (
            <p className="mt-1 text-xs text-primary">
              {result.reasons.map((reason) => t(lang, REASON_KEYS[reason.key] ?? "reasons.nearest")).join(" · ")}
            </p>
          )}
          <p className="mt-2 text-sm font-medium text-ink">
            {result.priceBand
              ? `${t(lang, "price.pkr")} ${result.priceBand.min}–${result.priceBand.max}`
              : t(lang, "card.priceMissing")}
          </p>
          <p className="text-xs text-ink-subtle">{t(lang, "results.indicative")}</p>
        </div>
      </div>
    </Link>
  );
}
