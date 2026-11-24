// DWAS spec §9.1 / C01–C05 — client home flow: describe (textarea, mic,
// common-problem cards) → submit → POST /api/intake → confirm screen (C03,
// urgency chip C04) → location (C05).
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CommonProblemCards, { TRADES } from "@/components/CommonProblemCards";
import ConfirmScreen from "@/components/ConfirmScreen";
import LocationScreen, { type LocationData } from "@/components/LocationScreen";
import MicButton from "@/components/MicButton";
import TradePicker from "@/components/TradePicker";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { IntakeResult } from "@/lib/types";

type Step = "describe" | "confirm" | "picker" | "location" | "emergency" | "done";
const INTAKE_KEY = "dwas-intake";
const LOCATION_KEY = "dwas-location";

export default function ClientHome() {
  const router = useRouter();
  const lang = useLang();
  const [step, setStep] = useState<Step>("describe");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<"none" | "ok" | "failed">("none");
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(INTAKE_KEY);
    if (saved) setIntake(JSON.parse(saved) as IntakeResult);
  }, []);

  async function onSubmit() {
    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });
    const result: IntakeResult = await res.json();
    setIntake(result);
    window.sessionStorage.setItem(INTAKE_KEY, JSON.stringify(result));
    // C14: the rules emergency detector runs in the API route regardless of
    // the LLM, so a dangerous description always shows the notice first.
    setStep(result.emergency.is_emergency ? "emergency" : "confirm");
  }

  function addTrade(trade: (typeof TRADES)[number]) {
    const label = t(lang, `trade.${trade}`);
    setText((prev) => (prev ? `${prev} ${label}` : label));
    setVoice("none");
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
            onChange={(e) => {
              setText(e.target.value);
              setVoice("none");
            }}
            placeholder={t(lang, "client.describe")}
            className="min-h-28 w-full rounded-md border border-hairline bg-background px-4 py-3 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <MicButton lang={lang} onTranscript={setText} onVoiceResult={(ok) => setVoice(ok ? "ok" : "failed")} />
          <div className="flex flex-wrap gap-2">
            {TRADES.map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => addTrade(trade)}
                className="pressable min-h-11 rounded-pill border border-hairline bg-surface px-4 text-sm font-medium text-ink-muted active:bg-hairline"
              >
                {t(lang, `trade.${trade}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!text.trim()}
            className="pressable min-h-11 rounded-lg border border-primary bg-background px-8 text-base font-medium text-primary disabled:opacity-60"
          >
            {t(lang, "client.submit")}
          </button>
          <CommonProblemCards onSelect={(value) => { setText(value); setVoice("none"); }} />
        </form>
      )}

      {step === "emergency" && (
        <section className="flex w-full max-w-lg flex-col gap-4 rounded-lg border-2 border-danger bg-background p-6" role="alert">
          <h2 className="text-title font-display text-danger">{t(lang, "emergency.title")}</h2>
          <p className="text-ink">{t(lang, "emergency.notice")}</p>
          <p className="text-ink-muted text-sm">{t(lang, "emergency.safety")}</p>
          <div className="flex flex-wrap gap-2">
            <a href="tel:1122" className="pressable rounded-lg bg-danger px-6 py-3 text-base font-medium text-white">
              {t(lang, "emergency.call")}
            </a>
            <button
              type="button"
              onClick={() => setStep("confirm")}
              className="pressable rounded-lg border border-hairline px-6 py-3 text-base font-medium text-ink"
            >
              {t(lang, "emergency.continue")}
            </button>
          </div>
        </section>
      )}

      {step === "confirm" && intake && (
        <ConfirmScreen
          result={intake}
          onConfirm={() => setStep("location")}
          onPickTrade={showPicker}
          onUrgencyChange={(urgency) => {
            setIntake((prev) => (prev ? { ...prev, urgency } : prev));
            window.sessionStorage.setItem(INTAKE_KEY, JSON.stringify({ ...intake, urgency }));
          }}
        />
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
        <LocationScreen
          onConfirm={(loc) => {
            setLocation(loc);
            window.sessionStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
            void router.push("/client/results");
          }}
        />
      )}
    </div>
  );
}
