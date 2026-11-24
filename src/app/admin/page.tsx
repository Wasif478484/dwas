// A04: dashboard reads only /api/admin/stats — every number comes from stored data.
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminStats } from "@/lib/admin/stats";
import { clientAuthHeaders } from "@/lib/auth/client";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

const LINKS = ["technicians", "bookings", "reviews", "complaints"] as const;
const DAYS = 30;

type BarRow = { label: string; count: number };

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <p className="text-2xl font-display text-ink">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}

function BarList({ title, rows, empty }: { title: string; rows: BarRow[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <h2 className="text-base font-display text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-sm">
              <span className="truncate text-ink-muted" title={row.label}>{row.label}</span>
              <span className="h-2 overflow-hidden rounded-pill bg-hairline" aria-hidden="true">
                <span className="block h-full rounded-pill bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className="tabular-nums text-ink">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey) || key;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await clientAuthHeaders();
      const response = await fetch(`/api/admin/stats?days=${DAYS}`, { headers });
      if (!response.ok) throw new Error("stats request failed");
      setStats((await response.json()) as AdminStats);
    } catch {
      setStats(null);
      setError(t(lang, "admin.error" as TranslationKey) || "admin.error");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.title")}</h1>
      {loading && <p role="status" className="text-sm text-ink-muted">{txt("admin.stats.loading")}</p>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm text-ink-muted">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="pressable min-h-11 rounded-md border border-hairline bg-background px-4 text-sm font-medium text-ink"
          >
            {txt("admin.stats.retry")}
          </button>
        </div>
      )}
      {stats && !loading && (
        <>
          {stats.totals.bookings === 0 && (
            <p className="rounded-md border border-hairline bg-surface p-4 text-sm text-ink-muted">{txt("admin.stats.empty")}</p>
          )}
          <p className="text-sm text-ink-muted">
            {txt("admin.stats.period")}: {new Date(stats.range.from).toISOString().slice(0, 10)} – {new Date(stats.range.to).toISOString().slice(0, 10)}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label={txt("admin.metric.bookings")} value={String(stats.totals.bookings)} />
            <Metric label={txt("admin.metric.acceptance")} value={`${stats.acceptanceRate.toFixed(1)}%`} />
            <Metric label={txt("admin.metric.avgRating")} value={stats.avgRating === null ? txt("admin.stats.noRating") : stats.avgRating.toFixed(1)} />
            <Metric label={txt("admin.metric.fallback")} value={`${stats.fallbackUsage.toFixed(1)}%`} />
          </div>
          <BarList
            title={txt("admin.stats.dailyTitle")}
            rows={stats.bookingsPerDay.map((day) => ({ label: day.day, count: day.count }))}
            empty={txt("admin.none")}
          />
          <BarList
            title={txt("admin.stats.tradesTitle")}
            rows={stats.byTrade.map((row) => ({ label: txt(`trade.${row.trade}`) || row.trade, count: row.count }))}
            empty={txt("admin.none")}
          />
          <BarList
            title={txt("admin.stats.demandTitle")}
            rows={stats.demandMap.map((row) => ({ label: row.areaId, count: row.count }))}
            empty={txt("admin.none")}
          />
        </>
      )}
      <nav className="flex flex-wrap gap-2" aria-label={txt("admin.title")}>
        {LINKS.map((link) => (
          <Link
            key={link}
            href={`/admin/${link}`}
            className="pressable rounded-md border border-hairline px-3 py-2 text-sm text-ink hover:border-primary"
          >
            {txt(`admin.nav.${link}`)}
          </Link>
        ))}
      </nav>
    </main>
  );
}
