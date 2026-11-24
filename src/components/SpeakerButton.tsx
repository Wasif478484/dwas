// Spec: read the screen text aloud; bundled audio pack is an optional fallback.
"use client";

import { Square, Volume2 } from "lucide-react";
import { useState } from "react";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";

export default function SpeakerButton({
  text,
  audioKey,
  className = "",
}: {
  text: string;
  audioKey?: string;
  className?: string;
}) {
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";
  const [speaking, setSpeaking] = useState(false);
  const key = speaking ? "tech.stopReading" : "tech.listen";

  async function press() {
    if (speaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "ur" ? "ur-PK" : "en-PK";
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
      return;
    }
    if (audioKey) {
      const url = `/audio/${lang}/${audioKey}.mp3`;
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (!head.ok) return;
        const audio = new Audio(url);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        setSpeaking(true);
        await audio.play();
      } catch {
        setSpeaking(false); // audio pack is optional
      }
    }
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-label={t(lang, key)}
      className={`flex min-h-14 items-center gap-3 rounded-pill border border-hairline bg-surface px-5 py-2 text-ink ${className}`}
    >
      {speaking ? <Square className="h-6 w-6 shrink-0" /> : <Volume2 className="h-6 w-6 shrink-0" />}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">{t(lang, key)}</span>
        <span className="text-[11px] text-ink-muted">{t(other, key)}</span>
      </span>
    </button>
  );
}
