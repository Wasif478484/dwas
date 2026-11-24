// Spec C03: "Nahi opens the trade picker."
"use client";

import { TRADES } from "@/components/CommonProblemCards";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export default function TradePicker({ onSelect }: { onSelect: (trade: string) => void }) {
  const lang = useLang();
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-hairline bg-background p-4">
      <h2 className="text-title font-display">{t(lang, "client.tradePickerTitle")}</h2>
      <div className="flex flex-wrap gap-2">
        {TRADES.map((trade) => (
          <button
            key={trade}
            type="button"
            onClick={() => onSelect(trade)}
            className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink active:bg-hairline"
          >
            {t(lang, `trade.${trade}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
