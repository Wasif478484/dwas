import en from "./en.json";
import ur from "./ur.json";

export type Lang = "en" | "ur";
export const LANGS: Lang[] = ["en", "ur"];
export const DICTIONARIES: Record<Lang, typeof en> = { en, ur };
export type TranslationKey = keyof typeof en;
export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "dwas-lang";

export function isLang(value: string | null | undefined): value is Lang {
  return value === "en" || value === "ur";
}

// Urdu strings in ur.json are placeholders marked TODO-REVIEW; a native speaker
// must review them (DECISIONS.md).
export function t(lang: Lang, key: TranslationKey): string {
  return DICTIONARIES[lang][key] ?? DICTIONARIES[DEFAULT_LANG][key];
}
