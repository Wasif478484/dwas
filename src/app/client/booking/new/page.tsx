// DWAS C08: review the saved intake, choose when to come, confirm the booking.
// Rebooking reuses the stored intake — it never calls /api/intake again.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LocationData } from "@/components/LocationScreen";
import { clientAuthHeaders } from "@/lib/auth/client";
import { bookingPrefill, type BookingCreatePayload } from "@/lib/booking/prefill";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { IntakeResult } from "@/lib/types";

type Slot = "today" | "tomorrow" | "flexible";

export default function NewBookingPage() {
  const lang = useLang();
  const router = useRouter();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [payload, setPayload] = useState<BookingCreatePayload | null>(null);
  const [rebook, setRebook] = useState(false);
  const [band, setBand] = useState<{ min: number; max: number } | null>(null);
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState<Slot>("today");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage;
    let intake: IntakeResult | null = null;
    let location: LocationData | null = null;
    try {
      intake = JSON.parse(saved.getItem("dwas-intake") ?? "null") as IntakeResult | null;
      location = JSON.parse(saved.getItem("dwas-location") ?? "null") as LocationData | null;
    } catch {
      // Malformed session data falls through to the empty state.
    }
    setPayload(bookingPrefill(intake, location, saved.getItem("dwas-selected-tech")));
    setRebook(Boolean(saved.getItem("dwas-rebook")));
  }, []);

  useEffect(() => {
    if (!payload || payload.intake.trade === "unknown") return;
    let active = true;
    const query = new URLSearchParams({ trade: payload.intake.trade, jobType: payload.intake.jobType });
    fetch(`/api/rates?${query}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
      .then((data: { band?: { min: number; max: number } | null } | null) => {
        if (active) setBand(data?.band ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [payload]);

  async function confirm() {
    if (!payload || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await clientAuthHeaders()) },
        body: JSON.stringify({
          ...payload,
          note,
          ...(slot === "flexible" ? {} : { scheduledFor: Date.now() + (slot === "tomorrow" ? 86_400_000 : 0) }),
        }),
      });
      const data = (await res.json().catch(() => null)) as { bookingId?: string; booking?: { id?: string } } | null;
      const bookingId = data?.bookingId ?? data?.booking?.id;
      if (!res.ok || !bookingId) {
        setFailed(true);
        setBusy(false);
        return;
      }
      window.sessionStorage.removeItem("dwas-rebook");
      router.push(`/client/booking/${bookingId}`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt(rebook ? "booking.rebookTitle" : "booking.title")}</h1>

      {!payload ? (
        <section className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
          <h2 className="text-title font-display text-ink">{txt("booking.empty.title")}</h2>
          <p className="text-sm text-ink-muted">{txt("booking.empty.body")}</p>
          <Link
            href="/client"
            className="pressable self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-white"
          >
            {txt("booking.empty.back")}
          </Link>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
            <p className="text-base text-ink">
              {lang === "ur"
                ? payload.intake.summary_ur || payload.intake.summary_en
                : payload.intake.summary_en || payload.intake.summary_ur}
            </p>
            <p className="text-sm text-ink-muted">
              {payload.intake.trade !== "unknown" ? txt(`trade.${payload.intake.trade}`) : ""}
              {payload.intake.trade !== "unknown" ? " · " : ""}
              {txt("client.urgencyLabel")}: {txt(`urgency.${payload.intake.urgency}`)}
            </p>
            <p className="text-sm font-medium text-ink">
              {band ? `${txt("price.pkr")} ${band.min}–${band.max}` : txt("card.priceMissing")}
            </p>
            <p className="text-xs text-ink-muted">{txt("results.indicative")}</p>
          </section>

          <label className="flex flex-col gap-1 text-sm text-ink">
            {txt("client.landmark")}
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-11 rounded-md border border-hairline bg-background px-3 text-ink outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink">
            {txt("booking.slot.label")}
            <select
              value={slot}
              onChange={(event) => setSlot(event.target.value as Slot)}
              className="min-h-11 rounded-md border border-hairline bg-background px-3 text-ink outline-none focus:border-primary"
            >
              <option value="today">{txt("booking.slot.today")}</option>
              <option value="tomorrow">{txt("booking.slot.tomorrow")}</option>
              <option value="flexible">{txt("booking.slot.flexible")}</option>
            </select>
          </label>

          {failed && (
            <p role="alert" className="rounded-md border border-hairline p-3 text-sm text-ink-muted">
              {txt("booking.failed")}
            </p>
          )}

          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="pressable min-h-11 rounded-md bg-primary px-6 text-base font-medium text-white disabled:opacity-60"
          >
            {txt("booking.confirm")}
          </button>
        </>
      )}
    </main>
  );
}
