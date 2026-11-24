// DWAS spec §9.1 / C01–C05 — client home flow: describe (textarea, mic,
// common-problem cards) → submit → POST /api/intake → confirm screen (C03,
// urgency chip C04) → location (C05).
"use client";

import { useState } from "react";
import CommonProblemCards, { TRADES } from "@/components/CommonProblemCards";
import ConfirmScreen from "@/components/ConfirmScreen";
import LocationScreen, { type LocationData } from "@/components/LocationScreen";
import MicButton from "@/components/MicButton";
import TradePicker from "@/components/TradePicker";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { IntakeResult } from "@/lib/types";

type Step = "describe" | "confirm" | "picker" | "location" | "done";

export default function ClientHome() {
  const lang = useLang();
  const [step, setStep] = useState<Step>("describe");
  const [text, setText] = useState("");
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);

  async function onSubmit() {
    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const result: IntakeResult = await res.json();
    setIntake(result);
    setStep("confirm");
  }

  function addTrade(trade: (typeof TRADES)[number]) {
    const label = t(lang, `trade.${trade}`);
    setText((prev) => (prev ? `${prev} ${label}` : label));
  }

  function showPicker() {
    setStep("picker");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-6 px-4 py-6" dir={lang === "ur" ? "rtl" : "ltr"}>
      <h1 className="text-center text-display font-display">{t(lang, "client.title")}</h1>

      {step === "describe" && (
        <form className="flex w-full max-w-lg flex-col gap-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(lang, "client.describe")}
            className="min-h-28 w-full rounded-md border border-hairline bg-background px-4 py-3 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <MicButton lang={lang} onTranscript={setText} />
          <div className="flex flex-wrap gap-2">
            {TRADES.map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => addTrade(trade)}
                className="rounded-pill border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted active:bg-hairline"
              >
                {t(lang, `trade.${trade}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!text.trim()}
            className="rounded-lg bg-primary px-8 py-2.5 text-base font-medium text-white disabled:opacity-60"
          >
            {t(lang, "client.submit")}
          </button>
          <CommonProblemCards onSelect={(value) => setText(value)} />
        </form>
      )}

      {step === "confirm" && intake && (
        <ConfirmScreen result={intake} onConfirm={() => setStep("location")} onPickTrade={showPicker} />
      )}

      {step === "picker" && (
        <TradePicker
          onSelect={(trade) => {
            setIntake((prev) => (prev ? { ...prev, trade: trade as IntakeResult["trade"] } : prev));
            setStep("confirm");
          }}
        />
      )}

      {step === "location" && (
        <LocationScreen onConfirm={(loc) => setLocation(loc)} />
      )}

      {step === "done" && (
        <section className="flex w-full max-w-lg flex-col gap-2 rounded-lg border border-hairline bg-background p-4">
          <p className="text-ink">{intake?.summary_ur || intake?.summary_en || ""}</p>
          <p className="text-ink-subtle text-sm">{location ? t(lang, "client.locationDone") : ""}</p>
        </section>
      )}
    </div>
  );
}
