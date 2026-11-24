// A03: review moderation — hide/unhide with rating aggregates recomputed server-side.
"use client";

import { useEffect, useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc, ReviewDoc } from "@/lib/types";

type Review = Partial<ReviewDoc> & { id: string };
type Row = Partial<BookingDoc> & { id: string; review: Review | null };

export default function AdminReviews() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [items, setItems] = useState<Review[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const token = window.localStorage.getItem("dwas-demo-token") ?? "";
    void (async () => {
      try {
        const response = await fetch("/api/admin/bookings?withReviews=1", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("review list failed");
        const data: { items: Row[] } = await response.json();
        setItems(data.items.flatMap((row) => (row.review ? [row.review] : [])));
        setError(null);
      } catch {
        setError(t(lang, "admin.error" as TranslationKey));
      }
    })();
  }, [lang, refresh]);

  async function toggle(review: Review) {
    const token = window.localStorage.getItem("dwas-demo-token") ?? "";
    setBusy(review.id);
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(review.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ hidden: !review.hidden }),
      });
      setMessage(t(lang, response.ok ? "admin.actionDone" as TranslationKey : "admin.actionFailed" as TranslationKey));
      if (response.ok) setRefresh((n) => n + 1);
    } catch {
      setMessage(t(lang, "admin.actionFailed" as TranslationKey));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.reviews.title")}</h1>
      {error && <p role="alert" className="text-sm text-ink-muted">{error}</p>}
      {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
      {items.length === 0 && !error && <p className="text-sm text-ink-subtle">{txt("admin.none")}</p>}
      {items.map((review) => (
        <article key={review.id} className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-ink">{txt("admin.booking.id")}: {review.bookingId ?? review.id}</h2>
            {review.hidden && <span className="rounded-pill border border-hairline px-3 py-1 text-xs text-ink-muted">{txt("admin.reviews.hidden")}</span>}
          </div>
          <p className="text-sm text-ink-muted">{txt("admin.technician")}: {review.technicianId ?? "—"}</p>
          <p className="text-sm text-ink">{txt("admin.reviews.stars")}: {review.stars ?? "—"}</p>
          {review.comment && <p className="text-sm text-ink">{txt("admin.reviews.comment")}: {review.comment}</p>}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void toggle(review)}
            className="self-start rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 hover:border-primary"
          >
            {txt(review.hidden ? "admin.reviews.unhide" : "admin.reviews.hide")}
          </button>
        </article>
      ))}
    </main>
  );
}
