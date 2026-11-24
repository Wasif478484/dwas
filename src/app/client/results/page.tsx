// DWAS C06/C07 — ranked technician list. Reads the intake/location the client
// home stored in sessionStorage, with safe defaults when they are absent.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TechCard from "@/components/TechCard";
import { AREAS } from "@/lib/areas";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { MatchCard } from "@/lib/match/rank";
import type { IntakeResult, Trade, Urgency } from "@/lib/types";

const TRADES: Trade[] = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"];
const URGENCIES: Urgency[] = ["now", "today", "tomorrow", "flexible"];

type LocationData = { lat?: number; lng?: number; areaId?: string };

function matchPayload() {
  let intake: Partial<IntakeResult> = {};
  let location: LocationData = {};
  try {
    intake = JSON.parse(sessionStorage.getItem("dwas-intake") ?? "{}") as Partial<IntakeResult>;
    location = JSON.parse(sessionStorage.getItem("dwas-location") ?? "{}") as LocationData;
  } catch {
    // Malformed session data falls back to the seeded defaults below.
  }
  const area = AREAS.find((a) => a.id === location.areaId) ?? AREAS[0];
  return {
    trade: TRADES.includes(intake.trade as Trade) ? (intake.trade as Trade) : ("plumber" as Trade),
    urgency: URGENCIES.includes(intake.urgency as Urgency) ? (intake.urgency as Urgency) : ("today" as Urgency),
    jobType: intake.jobType || "tap_leak",
    lat: typeof location.lat === "number" ? location.lat : area.lat,
    lng: typeof location.lng === "number" ? location.lng : area.lng,
    areaId: location.areaId ?? area.id,
  };
}

export default function ResultsPage() {
  const lang = useLang();
  const [results, setResults] = useState<MatchCard[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(matchPayload()),
        });
        if (!res.ok) throw new Error("match request failed");
        const data = (await res.json()) as MatchCard[];
        if (active) {
          setResults(data);
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("error");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div dir={lang === "ur" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-display font-display text-ink">{t(lang, "results.title")}</h1>

      {status === "loading" && <p className="text-ink-muted">{t(lang, "results.loading")}</p>}
      {status === "error" && <p className="text-ink-muted">{t(lang, "results.error")}</p>}
      {status === "ready" && results.length === 0 && (
        <p className="text-ink-muted">{t(lang, "results.empty")}</p>
      )}

      {status === "ready" && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <TechCard key={result.technicianId} result={result} />
          ))}
        </div>
      )}

      <Link href="/client" className="mt-2 self-start text-sm text-primary hover:underline">
        {t(lang, "results.back")}
      </Link>
    </div>
  );
}
