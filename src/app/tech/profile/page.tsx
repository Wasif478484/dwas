// Spec T05/T07/T08/T09: profile edit and big performance numbers.
"use client";

import { Bell, Check, Droplets, Hammer, HardHat, Minus, Plus, Snowflake, Star, UserRound, Wrench, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import NumPad from "@/components/NumPad";
import { technicianAuthHeaders, useTechnicianId } from "@/components/useTechnicianId";
import { AREAS } from "@/lib/areas";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";
import type { Approval, TechnicianDoc, Trade } from "@/lib/types";

const TRADES: Trade[] = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"];
const TRADE_ICONS: Record<Trade, typeof Wrench> = {
  plumber: Droplets,
  electrician: Zap,
  ac_fridge: Snowflake,
  carpenter: Hammer,
  mazdoor: HardHat,
};

interface FormState {
  name: string;
  trades: Trade[];
  yearsExperience: number;
  areaIds: string[];
  radiusKm: number;
  visitFeePKR: string;
  bio_ur: string;
  bio_en: string;
  photoUrl: string;
  workPhotosText: string;
  approvalStatus: Approval;
  stats: TechnicianDoc["stats"];
}

function toForm(doc: TechnicianDoc): FormState {
  return {
    name: doc.name ?? "",
    trades: doc.trades ?? [],
    yearsExperience: doc.yearsExperience ?? 0,
    areaIds: doc.center?.areaId ? [doc.center.areaId] : [],
    radiusKm: doc.radiusKm ?? 6,
    visitFeePKR: String(doc.visitFeePKR ?? 0),
    bio_ur: doc.bio_ur ?? "",
    bio_en: doc.bio_en ?? "",
    photoUrl: doc.photoUrl ?? "",
    workPhotosText: (doc.workPhotos ?? []).join("\n"),
    approvalStatus: doc.approvalStatus ?? "pending",
    stats: doc.stats ?? { jobsCompleted: 0, ratingSum: 0, ratingCount: 0, avgResponseSec: null, noShowCount: 0 },
  };
}

export default function TechProfilePage() {
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";
  const techId = useTechnicianId();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!techId) return;
    let active = true;
    void technicianAuthHeaders()
      .then((headers) => fetch("/api/technicians/me", { headers }))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TechnicianDoc | null) => {
        if (active && data) setForm(toForm(data));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [techId]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function toggleTrade(trade: Trade) {
    if (!form) return;
    patch({
      trades: form.trades.includes(trade) ? form.trades.filter((t) => t !== trade) : [...form.trades, trade],
    });
  }

  function toggleArea(id: string) {
    if (!form) return;
    patch({ areaIds: form.areaIds.includes(id) ? form.areaIds.filter((a) => a !== id) : [id] });
  }

  async function save() {
    if (!form || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/technicians/me", {
        method: "PUT",
        headers: { ...(await technicianAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          trades: form.trades,
          yearsExperience: form.yearsExperience,
          areaId: form.areaIds[0],
          radiusKm: form.radiusKm,
          visitFeePKR: Number(form.visitFeePKR || 0),
          bio_ur: form.bio_ur,
          bio_en: form.bio_en,
          photoUrl: form.photoUrl || undefined,
          workPhotos: form.workPhotosText.split(/\n+/).map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setForm(toForm((await res.json()) as TechnicianDoc));
        setMessage(t(lang, "tech.saved"));
      } else {
        setMessage(t(lang, "tech.saveFailed"));
      }
    } catch {
      setMessage(t(lang, "tech.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    // shortcut: demo token until a VAPID key and service worker are configured.
    let token = window.localStorage.getItem("dwas-fcm-token") || "";
    if (!token) {
      token = `demo-${techId ?? "rafiq-ahmad"}-${Date.now()}`;
      window.localStorage.setItem("dwas-fcm-token", token);
    }
    try {
      const res = await fetch("/api/technicians/me/push-token", {
        method: "POST",
        headers: { ...(await technicianAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ fcmToken: token }),
      });
      if (res.ok) setNotifyOn(true);
    } catch {
      setNotifyOn(false);
    }
  }

  if (!form) {
    return (
      <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto w-full max-w-md flex-1 p-4">
        <p className="text-ink-muted">{t(lang, "tech.loading")}</p>
      </main>
    );
  }

  const rating = form.stats.ratingCount > 0 ? (form.stats.ratingSum / form.stats.ratingCount).toFixed(1) : "—";
  const reply = form.stats.avgResponseSec ? `${Math.round(form.stats.avgResponseSec)}s` : "—";
  const approvalKey =
    form.approvalStatus === "pending"
      ? "tech.profile.approvalPending"
      : form.approvalStatus === "rejected"
        ? "tech.profile.approvalRejected"
        : form.approvalStatus === "suspended"
          ? "tech.profile.approvalSuspended"
          : null;

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserRound className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-display font-semibold text-ink">{t(lang, "tech.profile.title")}</h1>
            <p className="text-sm text-ink-muted">{t(other, "tech.profile.title")}</p>
          </div>
        </div>
        {form.approvalStatus === "approved" ? (
          <span className="rounded-pill bg-primary px-3 py-1 text-sm font-semibold text-white">
            {t("en", "badge.admin_approved")}
          </span>
        ) : (
          approvalKey ? (
            <span className="rounded-pill border border-hairline bg-surface px-3 py-1 text-sm font-medium text-ink-muted">
              {t(lang, approvalKey)}
            </span>
          ) : null
        )}
      </header>

      <section className="grid grid-cols-3 gap-2 rounded-md border border-hairline bg-surface p-4 text-center">
        <div>
          <p className="text-3xl font-bold text-ink">{form.stats.jobsCompleted}</p>
          <p className="text-xs text-ink-muted">{t(lang, "tech.profile.jobsDone")}</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 text-3xl font-bold text-ink">
            <Star className="h-6 w-6 fill-current text-primary" />
            {rating}
          </p>
          <p className="text-xs text-ink-muted">{t(lang, "tech.rating")}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-ink" dir="ltr">{reply}</p>
          <p className="text-xs text-ink-muted">{t(lang, "tech.profile.replyTime")}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.profile.name")}</h2>
        <input
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="min-h-14 w-full rounded-md border border-hairline bg-background px-4 text-lg text-ink"
        />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.profile.trades")}</h2>
        <div className="flex flex-wrap gap-2">
          {TRADES.map((trade) => {
            const Icon = TRADE_ICONS[trade];
            const active = form.trades.includes(trade);
            return (
              <button
                key={trade}
                type="button"
                onClick={() => toggleTrade(trade)}
                aria-pressed={active}
                className={`flex min-h-14 items-center gap-2 rounded-pill border px-4 py-2 ${active ? "border-primary bg-primary text-white" : "border-hairline bg-surface text-ink"}`}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold">{t(lang, `trade.${trade}`)}</span>
                  <span className="text-[11px] opacity-80">{t(other, `trade.${trade}`)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.profile.years")}</h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => patch({ yearsExperience: Math.max(0, form.yearsExperience - 1) })}
            aria-label={t(lang, "tech.decrease")}
            className="flex min-h-14 min-w-14 items-center justify-center rounded-md border border-hairline bg-surface"
          >
            <Minus className="h-6 w-6 text-ink" />
          </button>
          <span className="min-w-12 text-center text-display font-bold text-ink" dir="ltr">{form.yearsExperience}</span>
          <button
            type="button"
            onClick={() => patch({ yearsExperience: Math.min(60, form.yearsExperience + 1) })}
            aria-label={t(lang, "tech.increase")}
            className="flex min-h-14 min-w-14 items-center justify-center rounded-md border border-hairline bg-surface"
          >
            <Plus className="h-6 w-6 text-ink" />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.serviceAreas")}</h2>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => {
            const active = form.areaIds.includes(area.id);
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleArea(area.id)}
                aria-pressed={active}
                className={`flex min-h-14 items-center gap-2 rounded-pill border px-4 py-2 text-sm font-medium ${active ? "border-primary bg-primary text-white" : "border-hairline bg-surface text-ink"}`}
              >
                {active ? <Check className="h-5 w-5 shrink-0" /> : null}
                {area.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.profile.visitFee")}</h2>
        <NumPad value={form.visitFeePKR} onChange={(v) => patch({ visitFeePKR: v })} />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.profile.photo")}</h2>
        <input
          value={form.photoUrl}
          onChange={(e) => patch({ photoUrl: e.target.value })}
          dir="ltr"
          placeholder="https://..."
          className="min-h-14 w-full rounded-md border border-hairline bg-background px-4 text-base text-ink"
        />
        <h2 className="text-title font-semibold text-ink">{t(lang, "tech.profile.workPhotos")}</h2>
        <textarea
          value={form.workPhotosText}
          onChange={(e) => patch({ workPhotosText: e.target.value })}
          dir="ltr"
          placeholder="https://..."
          rows={3}
          className="w-full rounded-md border border-hairline bg-background px-4 py-3 text-base text-ink"
        />
      </section>

      {message ? <p role="status" className="font-medium text-ink-muted">{message}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="flex min-h-[72px] items-center justify-center gap-3 rounded-md bg-primary px-6 text-white disabled:opacity-60"
      >
        <Check className="h-8 w-8 shrink-0" />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-xl font-semibold">{t(lang, "tech.save")}</span>
          <span className="text-xs opacity-80">{t(other, "tech.save")}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => void enableNotifications()}
        className="flex min-h-14 items-center justify-center gap-3 rounded-md border border-hairline bg-surface px-5 text-ink"
      >
        <Bell className="h-6 w-6 text-primary" />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold">{t(lang, notifyOn ? "tech.profile.notificationsOn" : "tech.profile.notifications")}</span>
          <span className="text-[11px] text-ink-muted">{t(other, notifyOn ? "tech.profile.notificationsOn" : "tech.profile.notifications")}</span>
        </span>
      </button>
    </main>
  );
}
