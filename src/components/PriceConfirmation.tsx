// C11: over-band final price needs the client's confirm or dispute.
"use client";

import { useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import { isOverBand } from "@/lib/rate-table";
import type { BookingDoc } from "@/lib/types";

type ConfirmableBooking = BookingDoc & { overBandConfirmed?: boolean; overBandConfirmedAt?: number };

function errorText(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value) {
    const message = (value as { error?: { message?: string } }).error?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function PriceConfirmation({
  booking,
  onChanged,
}: {
  booking: ConfirmableBooking;
  onChanged: () => void | Promise<void>;
}) {
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tr = (key: string) => t(lang, key as TranslationKey);

  const actionable =
    isOverBand(booking.priceBand, booking.finalPrice) && !booking.overBandConfirmed && booking.status === "completed";
  if (!actionable && !error && !notice) return null;

  async function confirm() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/price-confirmation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      if (!res.ok) {
        setError(errorText(await res.json().catch(() => null), tr("price.confirmFailed")));
        return;
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function dispute() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/complaint`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "price", text: tr("price.disputeReason") }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errorText(data, tr("price.disputeFailed")));
        return;
      }
      // The complaint route already moves completed -> disputed for the client;
      // only attempt the explicit transition if it did not.
      if (data?.booking?.status === "completed") {
        const status = await fetch(`/api/bookings/${booking.id}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to: "disputed" }),
        });
        setNotice(status.ok ? tr("price.disputeOpened") : tr("price.disputeStatusFailed"));
      } else {
        setNotice(tr("price.disputeOpened"));
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-waiting bg-waiting/10 p-4 text-ink">
      {actionable && (
        <>
          <h2 className="text-base font-semibold text-waiting">{tr("price.overBandTitle")}</h2>
          <p className="text-sm">
            {tr("price.overBandBody")} {booking.priceBand?.min}–{booking.priceBand?.max} {tr("price.pkr")}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="pressable min-h-12 w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {tr("price.confirmPrice")}
            </button>
            <button
              type="button"
              onClick={() => void dispute()}
              disabled={busy}
              className="pressable min-h-12 w-full rounded-md border border-waiting bg-background px-6 py-3 text-base font-semibold text-waiting disabled:opacity-60"
            >
              {tr("price.disputePrice")}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-ink-muted">{notice}</p>}
    </section>
  );
}
