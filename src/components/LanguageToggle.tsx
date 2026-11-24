"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANG, isLang, LANG_STORAGE_KEY, t, type Lang } from "@/lib/i18n";

export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return DEFAULT_LANG;
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(saved) ? saved : DEFAULT_LANG;
  });

  useEffect(() => {
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  function toggle() {
    const next: Lang = lang === "en" ? "ur" : "en";
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
    setLang(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t(lang, "lang.toggle")}
      className="text-sm font-medium text-zinc-600 hover:underline"
    >
      {t(lang, "lang.en")} / {t(lang, "lang.ur")}
    </button>
  );
}
