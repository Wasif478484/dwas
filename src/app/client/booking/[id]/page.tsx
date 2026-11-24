// DWAS C16/C17/C18/C19: live booking status, contact reveal, review, cancel.
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StatusTracker, { tr } from "@/components/StatusTracker";
import PriceConfirmation from "@/components/PriceConfirmation";
import { AREAS } from "@/lib/areas";
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc } from "@/lib/types";

const TAGS = ["on_time", "clean_work", "fair_price"] as const;

function errorText(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value) {
    const inner = (value as { error: { message?: string } }).error;
    if (inner && typeof inner.message === "string") return inner.message;
  }
  return fallback;
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-4">{tr("en", "booking.loading")}</div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const lang = useLang();
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDoc | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    await fetch(`/api/bookings/${id}/tick`, { method: "POST" }).catch(() => undefined);
    const res = await fetch(`/api/bookings/${id}`).catch(() => null);
    if (!res || !res.ok) {
      setError(tr(lang, "booking.error"));
      return;
    }
    const data: { booking: BookingDoc; contact: { clientPhone?: string; technicianPhone?: string } | null } = await res.json();
    setBooking(data.booking);
    // The client calls the technician; the technician's number lives in their
    // own private contact doc (spec §6/C12).
    setPhone(data.contact?.technicianPhone ?? null);
    setError(null);
  }, [id, lang]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await load();
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);

  async function submitReview() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stars, tags, ...(comment ? { comment } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data, tr(lang, "booking.error")));
        return;
      }
      setBooking(data.booking);
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: "cancelled_client", reason: "client_request" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(errorText(data, tr(lang, "booking.error")));
        return;
      }
      setBooking(data.booking);
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <h1 className="text-display font-display text-ink">{tr(lang, "booking.title")}</h1>
      {error && <p role="alert" className="rounded-md border border-hairline p-3 text-sm text-ink-muted">{error}</p>}
      {!booking && <p className="text-sm text-ink-muted">{tr(lang, "booking.loading")}</p>}
      {booking && (
        <>
          <section className="flex flex-col gap-1 rounded-md border border-hairline p-4 text-sm text-ink">
            <p>{booking.summary_ur || booking.summary_en}</p>
            <p className="text-ink-muted">{tr(lang, `trade.${booking.trade}`)} · {tr(lang, `urgency.${booking.urgency}`)}</p>
            <p className="text-ink-muted">
              {tr(lang, "booking.statusLabel")}: {tr(lang, `booking.status.${booking.status}`)}
            </p>
            {booking.finalPrice !== undefined && (
              <p className="text-ink-muted">{tr(lang, "booking.finalPrice")}: {booking.finalPrice}</p>
            )}
          </section>

          <section className="flex flex-col gap-1 rounded-md border border-hairline p-4 text-sm text-ink">
            <p className="text-ink-muted">
              {tr(lang, "client.areaLabel")}: {AREAS.find((a) => a.id === booking.location?.areaId)?.name ?? "—"}
            </p>
            {booking.phoneRevealed ? (
              booking.location?.note ? <p>{booking.location.note}</p> : null
            ) : (
              <p className="text-ink-muted">{tr(lang, "booking.privacyNotice")}</p>
            )}
          </section>

          <StatusTracker status={booking.status} lang={lang} />

          <PriceConfirmation booking={booking} onChanged={load} />

          {booking.phoneRevealed && phone && (
            <section className="flex flex-col gap-2" aria-label={tr(lang, "booking.contactTitle")}>
              <h2 className="text-sm font-medium text-ink-muted">{tr(lang, "booking.contactTitle")}</h2>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${phone}`} className="rounded-md bg-primary px-4 py-2 text-sm text-white">
                  {tr(lang, "booking.call")}
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-hairline px-4 py-2 text-sm text-ink"
                >
                  {tr(lang, "booking.whatsapp")}
                </a>
              </div>
            </section>
          )}

          {booking.status === "completed" && (
            <section className="flex flex-col gap-3 rounded-md border border-hairline p-4">
              <h2 className="text-sm font-medium text-ink">{tr(lang, "booking.reviewTitle")}</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label={tr(lang, "booking.reviewStars")}>
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={stars === value}
                    onClick={() => setStars(value)}
                    className={`h-9 w-9 rounded-pill border text-sm ${
                      stars === value ? "border-primary bg-primary text-white" : "border-hairline text-ink-muted"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={tr(lang, "booking.reviewTags")}>
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={tags.includes(tag)}
                    onClick={() => setTags((prev) => prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag])}
                    className={`rounded-pill border px-3 py-1.5 text-xs ${
                      tags.includes(tag) ? "border-primary bg-primary text-white" : "border-hairline text-ink-muted"
                    }`}
                  >
                    {tr(lang, `booking.tag.${tag}`)}
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={tr(lang, "booking.reviewComment")}
                className="min-h-20 w-full rounded-md border border-hairline bg-background p-3 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => void submitReview()}
                disabled={busy}
                className="self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {tr(lang, "booking.submitReview")}
              </button>
            </section>
          )}

          {(booking.status === "requested" || booking.status === "accepted" || booking.status === "on_the_way") && (
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={busy}
              className="self-start rounded-md border border-hairline px-5 py-2 text-sm text-ink-muted disabled:opacity-60"
            >
              {tr(lang, "booking.cancel")}
            </button>
          )}
        </>
      )}
    </main>
  );
}
