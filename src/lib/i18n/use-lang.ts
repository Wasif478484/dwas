// Reads the persisted language on mount (spec C13; LanguageToggle in the
// root layout writes the same key and switches documentElement.dir).
import { useState } from "react";
import { DEFAULT_LANG, isLang, LANG_STORAGE_KEY, type Lang } from "./index";

export function useLang(): Lang {
  return useState<Lang>(() => {
    if (typeof window === "undefined") return DEFAULT_LANG;
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(saved) ? saved : DEFAULT_LANG;
  })[0];
}
