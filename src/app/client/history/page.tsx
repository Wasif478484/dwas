// C15: past bookings and one-tap "Dubara bulayein" rebooking (skips intake).
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientAuthHeaders } from "@/lib/auth/client";
import { rebookPrefill } from "@/lib/booking/rebook";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc } from "@/lib/types";

type HistoryItem = BookingDoc & { technicianName?: string };

// shortcut: history.* keys are added to en/ur JSON by the integrator; cast keeps strict TS green until then
export default function HistoryPage() {
  const lang = useLang();
  const router = useRouter();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/client/bookings", { headers: await clientAuthHeaders() });
        if (!res.ok) throw new Error("history fetch failed");
        const data = (await res.json()) as { items: HistoryItem[] };
        if (active) setItems(data.items ?? []);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function rebook(item: HistoryItem) {
    const prefill = rebookPrefill(item);
    if (!prefill) return;
    const saved = window.sessionStorage;
    saved.setItem("dwas-intake", JSON.stringify(prefill.intake));
    saved.setItem("dwas-selected-tech", prefill.selectedTech);
    saved.setItem("dwas-rebook", "1");
    // Rebooking skips location entry, so carry the old coordinates forward.
    saved.setItem("dwas-location", JSON.stringify(item.location));
    router.push("/client/booking/new");
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("history.title")}</h1>

      {failed && (
        <p role="alert" className="rounded-md border border-hairline p-3 text-sm text-ink-muted">
          {txt("history.error")}
        </p>
      )}

      {!items && !failed && <p className="text-sm text-ink-muted">{txt("history.loading")}</p>}

      {items?.length === 0 && !failed && (
        <section className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm text-ink-muted">{txt("history.empty")}</p>
          <Link
            href="/client"
            className="pressable self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-white"
          >
            {txt("history.back")}
          </Link>
        </section>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-md border border-hairline bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{item.technicianName ?? "—"}</p>
                <p className="text-xs text-ink-muted">
                  {new Date(item.createdAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-US")}
                </p>
              </div>
              <p className="text-sm text-ink">
                {lang === "ur" ? item.summary_ur || item.summary_en : item.summary_en || item.summary_ur}
              </p>
              <p className="text-xs text-ink-muted">
                {txt(`trade.${item.trade}`)} · {txt("booking.statusLabel")}: {txt(`booking.status.${item.status}`)}
              </p>
              <button
                type="button"
                onClick={() => rebook(item)}
                className="pressable min-h-11 self-start rounded-md border border-primary px-5 text-sm font-medium text-primary"
              >
                {txt("history.rebook")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
