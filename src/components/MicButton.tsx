// DWAS spec C01: "Mic button using SpeechRecognition, default ur-PK with a
// switch to en-PK, live interim text in an editable textarea, 30 s cap, stop
// on silence. Feature-detect; hide the mic if unsupported."
"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

interface Recognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult?: (event: { results: Array<Array<{ transcript: string }>> }) => void;
  onend?: () => void;
  onerror?: () => void;
  start(): void;
  stop(): void;
}

function createRecognizer(): Recognizer | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognizer;
    webkitSpeechRecognition?: new () => Recognizer;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const CAP_SECONDS = 30; // spec C01

export default function MicButton({ lang, onTranscript }: { lang: Lang; onTranscript: (text: string) => void }) {
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const recognizerRef = useRef<Recognizer | null>(null);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!createRecognizer()) setSupported(false);
  }, []);

  function stop() {
    if (capTimerRef.current) clearTimeout(capTimerRef.current);
    setBusy(false);
    recognizerRef.current?.stop();
  }

  function start() {
    const recognizer = createRecognizer();
    if (!recognizer) {
      setSupported(false);
      return;
    }
    recognizer.lang = lang === "ur" ? "ur-PK" : "en-PK";
    recognizer.interimResults = true;
    recognizer.continuous = false;
    recognizer.onresult = (event) => {
      const transcript = event.results?.[event.results.length - 1]?.[0]?.transcript ?? "";
      onTranscript(transcript);
    };
    recognizer.onend = () => setBusy(false);
    recognizer.onerror = () => setBusy(false);
    recognizerRef.current = recognizer;
    capTimerRef.current = setTimeout(stop, CAP_SECONDS * 1000);
    setBusy(true);
    recognizer.start();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={busy ? stop : start}
      aria-label={t(lang, "client.mic")}
      className="pressable flex items-center justify-center gap-2 rounded-pill bg-primary px-10 py-8 text-lg font-medium text-white hover:bg-primary-hover"
    >
      {busy ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      {t(lang, "client.mic")}
    </button>
  );
}
