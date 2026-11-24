// DWAS spec §9.1 / C01, C02 — client home: the mic is the biggest thing on
// the screen; a card prefills the request and the flow finishes without
// voice and without typing.
"use client";

import { useState } from "react";
import CommonProblemCards, { TRADES } from "@/components/CommonProblemCards";
import MicButton from "@/components/MicButton";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export default function ClientHome() {
  const lang = useLang();
  const [text, setText] = useState("");

  function addTrade(trade: (typeof TRADES)[number]) {
    const label = t(lang, `trade.${trade}`);
    setText((prev) => (prev ? `${prev} ${label}` : label));
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center gap-6 px-4 py-6" dir={lang === "ur" ? "rtl" : "ltr"}>
      <h1 className="text-center text-display font-display">{t(lang, "client.title")}</h1>
      <form className="flex w-full max-w-lg flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(lang, "client.describe")}
          className="min-h-28 w-full rounded-md border border-hairline bg-background px-4 py-3 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <MicButton lang={lang} onTranscript={setText} />
      </form>
      <div className="flex w-full max-w-lg flex-wrap gap-2">
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
      <div className="w-full max-w-lg">
        <CommonProblemCards onSelect={(value) => setText(value)} />
      </div>
    </div>
  );
}
