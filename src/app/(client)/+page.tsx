// DWAS spec §9.1 / C01, C02 — client home. The mic is the biggest thing on
// this screen (spec 9.2); a card prefills the request and the flow finishes
// without voice and without typing.
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
    <div className="flex min-h-screen flex-1 flex-col gap-4 bg-slate-50 p-4" dir={lang === "ur" ? "rtl" : "ltr"}>
      <h1 className="text-xl font-semibold">{t(lang, "client.title")}</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t(lang, "client.describe")}
        className="min-h-28 rounded-lg border bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-teal-600"
      />
      <MicButton lang={lang} onTranscript={setText} />
      <div className="flex flex-wrap gap-2">
        {TRADES.map((trade) => (
          <button
            key={trade}
            type="button"
            onClick={() => addTrade(trade)}
            className="rounded-full border bg-white px-3 py-1 text-xs font-medium"
          >
            {t(lang, `trade.${trade}`)}
          </button>
        ))}
      </div>
      <CommonProblemCards onSelect={(value) => setText(value)} />
    </div>
  );
}
