// Spec T03: one booking, readable at arm's length, with big accept/decline.
"use client";

import { Ban, Clock3, Droplets, Hammer, HardHat, MapPin, Snowflake, Wrench, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import SpeakerButton from "@/components/SpeakerButton";
import { technicianAuthHeaders } from "@/components/useTechnicianId";
import { AREAS } from "@/lib/areas";
import { REQUEST_EXPIRY_SEC } from "@/lib/config";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc, GeoPoint, Trade } from "@/lib/types";

const TRADE_ICONS: Record<Trade, typeof Wrench> = {
  plumber: Droplets,
  electrician: Zap,
  ac_fridge: Snowflake,
  carpenter: Hammer,
  mazdoor: HardHat,
};

const REASONS = [
  { key: "tech.jobs.reason.busy" as const, value: "busy", icon: Clock3 },
  { key: "tech.jobs.reason.tooFar" as const, value: "too_far", icon: MapPin },
  { key: "tech.jobs.reason.notMyWork" as const, value: "not_my_work", icon: Ban },
];

function distanceKm(a: GeoPoint | undefined, b: GeoPoint): number | null {
  if (!a) return null;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function CountdownRing({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const circumference = 2 * Math.PI * 22;
  const progress = Math.min(1, remaining / REQUEST_EXPIRY_SEC);
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90">
        <circle cx="26" cy="26" r="22" fill="none" strokeWidth="5" className="stroke-hairline" />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">{remaining}</span>
    </div>
  );
}

export default function TechJobCard({
  booking,
  technicianCenter,
  onChanged,
}: {
  booking: BookingDoc;
  technicianCenter?: GeoPoint;
  onChanged: () => void;
}) {
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";
  const [busy, setBusy] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [error, setError] = useState("");

  const Icon = TRADE_ICONS[booking.trade] ?? Wrench;
  const areaName = AREAS.find((a) => a.id === booking.location?.areaId)?.name ?? "—";
  const distance = distanceKm(technicianCenter, booking.location);
  const roundedKm = distance === null ? null : Math.round(distance * 2) / 2;

  async function act(to: "accepted" | "declined", reason?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/status`, {
        method: "PATCH",
        headers: { ...(await technicianAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify(reason ? { to, reason } : { to }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? t(lang, "tech.jobs.failed"));
        setBusy(false);
        return;
      }
      onChanged();
    } catch {
      setError(t(lang, "tech.jobs.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article dir={lang === "ur" ? "rtl" : "ltr"} className="flex flex-col gap-4 rounded-md border border-hairline bg-background p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="h-10 w-10 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">
              {t(lang, `trade.${booking.trade}`)} · {t(other, `trade.${booking.trade}`)}
            </p>
            <p className="text-title font-semibold text-ink">{booking.summary_ur}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CountdownRing expiresAt={booking.expiresAt} />
          <span className="text-[11px] text-ink-muted">{t(lang, "tech.jobs.expires")}</span>
        </div>
      </header>

      <SpeakerButton text={booking.summary_ur} audioKey="job-summary" />

      {booking.photoUrls?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={booking.photoUrls[0]} alt="" className="h-36 w-full rounded-md object-cover" />
      ) : null}

      <dl className="grid grid-cols-2 gap-3 rounded-md bg-surface p-3">
        <div>
          <dt className="text-xs text-ink-muted">{t(lang, "tech.jobs.area")}</dt>
          <dd className="flex items-center gap-1 font-semibold text-ink">
            <MapPin className="h-4 w-4 text-primary" />
            {areaName}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t(lang, "tech.jobs.distance")}</dt>
          <dd className="font-semibold text-ink">
            {roundedKm === null ? "—" : `${roundedKm} km`}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-ink-muted">{t(lang, "tech.jobs.priceBand")}</dt>
          <dd className="font-semibold text-ink">
            {booking.priceBand ? `${booking.priceBand.min}–${booking.priceBand.max} PKR` : "—"}
          </dd>
        </div>
      </dl>

      {booking.phoneRevealed && booking.location?.note ? (
        <p className="rounded-md bg-surface p-3 text-sm text-ink">
          <span className="text-ink-muted">{t(lang, "tech.job.address")}: </span>
          {booking.location.note}
        </p>
      ) : null}

      {error ? <p role="alert" className="text-sm font-medium text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("accepted")}
          className="flex min-h-[72px] items-center justify-center gap-3 rounded-md bg-primary px-6 text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          <Icon className="h-7 w-7 shrink-0" />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-lg font-semibold">{t(lang, "tech.jobs.accept")}</span>
            <span className="text-xs opacity-80">{t(other, "tech.jobs.accept")}</span>
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => setShowReasons((v) => !v)}
          className="flex min-h-[72px] items-center justify-center gap-3 rounded-md border border-hairline bg-background px-6 text-ink disabled:opacity-60"
        >
          <Ban className="h-7 w-7 shrink-0" />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-lg font-semibold">{t(lang, "tech.jobs.decline")}</span>
            <span className="text-xs text-ink-muted">{t(other, "tech.jobs.decline")}</span>
          </span>
        </button>

        {showReasons ? (
          <div className="flex flex-wrap gap-2">
            {REASONS.map(({ key, value, icon: ReasonIcon }) => (
              <button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => void act("declined", value)}
                className="flex min-h-14 items-center gap-2 rounded-pill border border-hairline bg-surface px-4 py-2 text-ink disabled:opacity-60"
              >
                <ReasonIcon className="h-5 w-5 shrink-0 text-primary" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{t(lang, key)}</span>
                  <span className="text-[11px] text-ink-muted">{t(other, key)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
