// Spec T04: one job, one big state button, final price on completion.
"use client";

import { ArrowLeft, Banknote, Check, CircleCheck, MapPin, Navigation, Phone, Play } from "lucide-react";
import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import NumPad from "@/components/NumPad";
import SpeakerButton from "@/components/SpeakerButton";
import { technicianAuthHeaders } from "@/components/useTechnicianId";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc, BookingStatus } from "@/lib/types";

type NextStep = { to: BookingStatus; key: "tech.job.rawanaHua" | "tech.job.kaamShuru" | "tech.job.kaamKhatam"; icon: typeof Navigation };

function nextStep(status: BookingStatus | undefined): NextStep | null {
  if (status === "accepted") return { to: "on_the_way", key: "tech.job.rawanaHua", icon: Navigation };
  if (status === "on_the_way") return { to: "in_progress", key: "tech.job.kaamShuru", icon: Play };
  if (status === "in_progress") return { to: "completed", key: "tech.job.kaamKhatam", icon: Check };
  return null;
}

type DetailProps = { params: Promise<{ id: string }> };

export default function TechJobDetailPage(props: DetailProps) {
  return (
    <Suspense fallback={<p className="p-4 text-ink-muted">{t("en", "tech.loading")}</p>}>
      <JobDetailView {...props} />
    </Suspense>
  );
}

function JobDetailView({ params }: DetailProps) {
  const { id } = use(params);
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";
  const [booking, setBooking] = useState<BookingDoc | null>(null);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/bookings/${id}`, { headers: await technicianAuthHeaders() });
      if (res.ok) {
        setBooking((await res.json()) as BookingDoc);
      } else {
        setError(t(lang, "tech.job.notFound"));
      }
    } catch {
      setError(t(lang, "tech.job.notFound"));
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const step = nextStep(booking?.status);
  const finalPrice = Number(price);
  const outsideBand = Boolean(
    booking?.priceBand && price && (finalPrice < booking.priceBand.min || finalPrice > booking.priceBand.max),
  );
  const revealed = booking?.phoneRevealed === true;
  const clientPhone = (booking as (BookingDoc & { clientPhone?: string }) | null)?.clientPhone;

  async function advance() {
    if (!step || busy) return;
    if (step.to === "completed" && (!price || !Number.isFinite(finalPrice) || finalPrice <= 0)) {
      setError(t(lang, "tech.job.priceRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> =
        step.to === "completed" ? { to: step.to, finalPrice } : { to: step.to };
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: { ...(await technicianAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(data?.error?.message ?? t(lang, "tech.job.failed"));
        setBusy(false);
        return;
      }
      await load();
    } catch {
      setError(t(lang, "tech.job.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <Link href="/tech/jobs?view=current" aria-label={t(lang, "tech.job.back")} className="flex min-h-14 min-w-14 items-center justify-center rounded-md border border-hairline bg-surface">
          <ArrowLeft className="h-6 w-6 text-ink" />
        </Link>
        <div>
          <h1 className="text-display font-semibold text-ink">{t(lang, "tech.job.title")}</h1>
          <p className="text-sm text-ink-muted">{t(other, "tech.job.title")}</p>
        </div>
      </header>

      {!booking ? (
        <p className="rounded-md border border-hairline bg-surface p-4 text-ink-muted">
          {error || t(lang, "tech.loading")}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
            <p className="text-title font-semibold text-ink">{booking.summary_ur}</p>
            <SpeakerButton text={booking.summary_ur} audioKey="job-summary" />
            <div className="flex items-center justify-between rounded-md bg-surface p-3">
              <span className="text-sm text-ink-muted">{t(lang, "tech.job.status")}</span>
              <span className="font-semibold text-ink">{booking.status}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink">
              <MapPin className="h-5 w-5 text-primary" />
              <span>{t(lang, "tech.jobs.priceBand")}: {booking.priceBand ? `${booking.priceBand.min}–${booking.priceBand.max} PKR` : "—"}</span>
            </div>
          </section>

          {revealed ? (
            <section className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
              <div>
                <p className="text-sm text-ink-muted">{t(lang, "tech.job.address")}</p>
                <p className="font-semibold text-ink">
                  {booking.location?.note || `${booking.location?.lat ?? ""}, ${booking.location?.lng ?? ""}`}
                </p>
              </div>
              {booking.phoneRevealed && clientPhone ? (
                <a
                  href={`tel:${clientPhone}`}
                  className="flex min-h-14 items-center gap-3 rounded-md bg-primary px-5 text-white"
                >
                  <Phone className="h-6 w-6" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="font-semibold">{t(lang, "tech.job.call")}</span>
                    <span className="text-xs opacity-80">{t(other, "tech.job.call")}</span>
                  </span>
                  <span className="ms-auto font-semibold" dir="ltr">{clientPhone}</span>
                </a>
              ) : null}
            </section>
          ) : null}

          {step?.to === "completed" ? (
            <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <span className="font-semibold text-ink">{t(lang, "tech.job.finalPrice")}</span>
              </div>
              <NumPad value={price} onChange={setPrice} />
              {outsideBand ? (
                <p role="alert" className="rounded-md bg-red-50 p-3 font-medium text-red-700">
                  {t(lang, "tech.job.outsideBand")}
                </p>
              ) : null}
            </section>
          ) : null}

          {error ? <p role="alert" className="font-medium text-red-700">{error}</p> : null}

          {step ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void advance()}
              className="flex min-h-[72px] items-center justify-center gap-3 rounded-md bg-primary px-6 text-white disabled:opacity-60"
            >
              <step.icon className="h-8 w-8 shrink-0" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-xl font-semibold">{t(lang, step.key)}</span>
                <span className="text-xs opacity-80">{t(other, step.key)}</span>
              </span>
            </button>
          ) : (
            <div className="flex min-h-[72px] items-center justify-center gap-3 rounded-md border border-hairline bg-surface text-ink-muted">
              <CircleCheck className="h-7 w-7" />
              <span className="font-semibold">{t(lang, "tech.job.completed")}</span>
            </div>
          )}
        </>
      )}
    </main>
  );
}
