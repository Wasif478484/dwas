// Spec T01/T02: three huge tiles plus the online/offline switch.
"use client";

import { BriefcaseBusiness, HardHat, UserRound, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { technicianAuthHeaders, useTechnicianId } from "@/components/useTechnicianId";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";
import type { TechnicianDoc } from "@/lib/types";

const TILES = [
  { href: "/tech/jobs", key: "tech.home.newJobs" as const, icon: BriefcaseBusiness },
  { href: "/tech/jobs?view=current", key: "tech.home.myJobs" as const, icon: HardHat },
  { href: "/tech/profile", key: "tech.home.profile" as const, icon: UserRound },
];

export default function TechHomeTiles() {
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";
  const techId = useTechnicianId();
  const [tech, setTech] = useState<TechnicianDoc | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!techId) return;
    let active = true;
    void technicianAuthHeaders()
      .then((headers) => fetch("/api/technicians/me", { headers }))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TechnicianDoc | null) => {
        if (active && data) setTech(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [techId]);

  async function toggleOnline() {
    if (!tech || busy) return;
    const next = !tech.isOnline;
    setBusy(true);
    setTech({ ...tech, isOnline: next });
    try {
      const res = await fetch("/api/technicians/me", {
        method: "PUT",
        headers: { ...(await technicianAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
      if (res.ok) {
        setTech((await res.json()) as TechnicianDoc);
      } else {
        setTech((prev) => (prev ? { ...prev, isOnline: !next } : prev));
      }
    } catch {
      setTech((prev) => (prev ? { ...prev, isOnline: !next } : prev));
    } finally {
      setBusy(false);
    }
  }

  const online = Boolean(tech?.isOnline);
  const statusKey = online ? "tech.online" : "tech.offline";

  return (
    <div dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface p-4">
        <div className="flex items-center gap-3">
          {online ? <Wifi className="h-8 w-8 text-primary" /> : <WifiOff className="h-8 w-8 text-ink-muted" />}
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-semibold text-ink">{t(lang, statusKey)}</span>
            <span className="text-xs text-ink-muted">{t(other, statusKey)}</span>
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          disabled={busy || !tech}
          onClick={toggleOnline}
          className={`pressable flex min-h-[72px] min-w-[132px] flex-col items-center justify-center gap-1 rounded-pill px-6 font-semibold disabled:opacity-60 ${
            online ? "bg-primary text-white" : "border border-hairline bg-background text-ink"
          }`}
        >
          {online ? <Wifi className="h-7 w-7" /> : <WifiOff className="h-7 w-7" />}
          <span className="text-base leading-none">{t(lang, statusKey)}</span>
          <span className="text-[11px] font-normal opacity-80">{t(other, statusKey)}</span>
        </button>
      </div>

      <nav className="flex flex-col gap-3">
        {TILES.map(({ href, key, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className="pressable flex min-h-[96px] items-center gap-4 rounded-md border border-hairline bg-background px-5 py-4 active:bg-surface"
          >
            <Icon className="h-10 w-10 shrink-0 text-primary" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-title font-semibold text-ink">{t(lang, key)}</span>
              <span className="text-sm text-ink-muted">{t(other, key)}</span>
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
