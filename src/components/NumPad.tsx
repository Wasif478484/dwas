// Spec: big thumb-friendly numeric keypad for prices and fees.
"use client";

import { Delete, X } from "lucide-react";
import { t as baseT, type Lang, type TranslationKey } from "@/lib/i18n";

// Keys are added to the shared dictionaries by the i18n owner.
const t = (lang: Lang, key: string): string => baseT(lang, key as TranslationKey);
import { useLang } from "@/lib/i18n/use-lang";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"] as const;

export default function NumPad({
  value,
  onChange,
  maxLength = 7,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const lang = useLang();
  const other = lang === "ur" ? "en" : "ur";

  function press(key: (typeof KEYS)[number]) {
    if (key === "del") {
      onChange(value.slice(0, -1));
    } else if (key === "clear") {
      onChange("");
    } else if (value.length < maxLength) {
      onChange((value + key).replace(/^0+(?=\d)/, ""));
    }
  }

  return (
    <div dir={lang === "ur" ? "rtl" : "ltr"} className="flex flex-col gap-2">
      <div className="rounded-md border border-hairline bg-surface px-4 py-3 text-center text-display font-semibold text-ink">
        {value || "0"}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={key === "del" ? t(lang, "tech.backspace") : key === "clear" ? t(lang, "tech.clear") : key}
            className="flex min-h-14 items-center justify-center gap-1 rounded-md border border-hairline bg-background text-2xl font-semibold text-ink active:bg-hairline"
          >
            {key === "del" ? (
              <>
                <Delete className="h-5 w-5" />
                <span className="flex flex-col leading-none">
                  <span className="text-[11px] font-medium">{t(lang, "tech.backspace")}</span>
                  <span className="text-[10px] text-ink-muted">{t(other, "tech.backspace")}</span>
                </span>
              </>
            ) : key === "clear" ? (
              <>
                <X className="h-5 w-5" />
                <span className="flex flex-col leading-none">
                  <span className="text-[11px] font-medium">{t(lang, "tech.clear")}</span>
                  <span className="text-[10px] text-ink-muted">{t(other, "tech.clear")}</span>
                </span>
              </>
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
