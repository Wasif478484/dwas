"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export default function Error({ error, reset }: { error: unknown; reset: () => void }) {
  const lang = useLang();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      dir={lang === "ur" ? "rtl" : "ltr"}
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center"
    >
      <h1 className="text-display font-display text-ink">{t(lang, "error.boundary")}</h1>
      <button
        type="button"
        onClick={reset}
        className="pressable min-h-11 rounded-md bg-primary px-6 py-3 font-medium text-white hover:bg-primary-hover"
      >
        {t(lang, "admin.stats.retry")}
      </button>
    </main>
  );
}
