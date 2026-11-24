// Admin console stub (A04 is P1): three counts from the stored collections.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

const LINKS = ["technicians", "bookings", "reviews", "complaints"] as const;

export default function AdminDashboard() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [counts, setCounts] = useState({ approved: 0, bookings: 0, pending: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("dwas-demo-token") ?? "";
    void (async () => {
      try {
        const headers = { authorization: `Bearer ${token}` };
        const [techRes, bookingRes] = await Promise.all([
          fetch("/api/admin/technicians", { headers }),
          fetch("/api/admin/bookings", { headers }),
        ]);
        if (!techRes.ok || !bookingRes.ok) throw new Error("admin fetch failed");
        const techs: { items: { approvalStatus?: string }[] } = await techRes.json();
        const bookings: { items: unknown[] } = await bookingRes.json();
        setCounts({
          approved: techs.items.filter((t) => t.approvalStatus === "approved").length,
          pending: techs.items.filter((t) => t.approvalStatus === "pending").length,
          bookings: bookings.items.length,
        });
      } catch {
        setError(t(lang, "admin.error" as TranslationKey));
      }
    })();
  }, [lang]);

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.title")}</h1>
      {error && <p role="alert" className="text-sm text-ink-muted">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-2xl font-display text-ink">{counts.approved}</p>
          <p className="text-sm text-ink-muted">{txt("admin.metric.approved")}</p>
        </div>
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-2xl font-display text-ink">{counts.bookings}</p>
          <p className="text-sm text-ink-muted">{txt("admin.metric.bookings")}</p>
        </div>
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-2xl font-display text-ink">{counts.pending}</p>
          <p className="text-sm text-ink-muted">{txt("admin.metric.pending")}</p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={txt("admin.title")}>
        {LINKS.map((link) => (
          <Link
            key={link}
            href={`/admin/${link}`}
            className="rounded-md border border-hairline px-3 py-2 text-sm text-ink hover:border-primary"
          >
            {txt(`admin.nav.${link}`)}
          </Link>
        ))}
      </nav>
    </main>
  );
}
