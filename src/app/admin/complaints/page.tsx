// A06: complaints queue has no owned API route yet — keep the screen honest.
"use client";

import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export default function AdminComplaints() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.complaints.title")}</h1>
      <p className="rounded-md border border-hairline bg-surface p-4 text-sm text-ink-muted">{txt("admin.complaints.empty")}</p>
    </main>
  );
}
