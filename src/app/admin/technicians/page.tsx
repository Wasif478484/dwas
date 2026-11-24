// A02: technician approval queue with a full profile preview.
"use client";

import { useEffect, useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { Approval, TechnicianDoc, Trade } from "@/lib/types";

type Tech = Partial<TechnicianDoc> & { id: string };
type Action = "approve" | "reject" | "suspend";
const APPROVALS: Approval[] = ["pending", "approved", "rejected", "suspended"];
const ACTIONS: Action[] = ["approve", "reject", "suspend"];

export default function AdminTechnicians() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [approval, setApproval] = useState<Approval>("pending");
  const [items, setItems] = useState<Tech[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const token = window.localStorage.getItem("dwas-demo-token") ?? "";
    void (async () => {
      try {
        const response = await fetch(`/api/admin/technicians?approval=${approval}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("technician list failed");
        const data: { items: Tech[] } = await response.json();
        setItems(data.items);
        setError(null);
      } catch {
        setError(t(lang, "admin.error" as TranslationKey));
      }
    })();
  }, [approval, lang, refresh]);

  async function act(id: string, action: Action) {
    const token = window.localStorage.getItem("dwas-demo-token") ?? "";
    setBusy(`${id}:${action}`);
    try {
      const response = await fetch(`/api/admin/technicians/${encodeURIComponent(id)}/approval`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note: notes[id] || undefined }),
      });
      setMessage(t(lang, response.ok ? "admin.actionDone" as TranslationKey : "admin.actionFailed" as TranslationKey));
      if (response.ok) setRefresh((n) => n + 1);
    } catch {
      setMessage(t(lang, "admin.actionFailed" as TranslationKey));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.technicians.title")}</h1>
      <label className="flex items-center gap-2 text-sm text-ink">
        {txt("admin.status")}
        <select
          value={approval}
          onChange={(event) => setApproval(event.target.value as Approval)}
          className="rounded-md border border-hairline bg-background px-3 py-2 text-ink"
        >
          {APPROVALS.map((value) => (
            <option key={value} value={value}>{txt(`admin.approval.${value}`)}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-ink-muted">{error}</p>}
      {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
      {items.length === 0 && !error && <p className="text-sm text-ink-subtle">{txt("admin.none")}</p>}

      {items.map((tech) => (
        <article key={tech.id} className="flex flex-col gap-3 rounded-md border border-hairline bg-background p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-title font-display text-ink">{tech.name ?? tech.id}</h2>
            <span className="rounded-pill border border-hairline px-3 py-1 text-xs text-ink-muted">
              {txt(`admin.approval.${tech.approvalStatus ?? "pending"}`)}
            </span>
          </header>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-subtle">{txt("admin.trade")}</dt><dd className="text-ink">{(tech.trades ?? []).map((trade: Trade) => t(lang, `trade.${trade}`)).join(", ")}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.yearsExperience")}</dt><dd className="text-ink">{tech.yearsExperience ?? 0}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.radiusKm")}</dt><dd className="text-ink">{tech.radiusKm ?? 0}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.area")}</dt><dd className="text-ink">{tech.center?.areaId ?? "—"}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.jobsCompleted")}</dt><dd className="text-ink">{tech.stats?.jobsCompleted ?? 0}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.rating")}</dt><dd className="text-ink">{tech.stats?.ratingCount ? (tech.stats.ratingSum / tech.stats.ratingCount).toFixed(1) : "—"}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.badges")}</dt><dd className="text-ink">{(tech.badges ?? []).join(", ")}</dd></div>
            <div><dt className="text-ink-subtle">{txt("admin.technicianId")}</dt><dd className="text-ink">{tech.id}</dd></div>
          </dl>
          {(tech.bio_ur || tech.bio_en) && <p className="text-sm text-ink-muted">{tech.bio_ur || tech.bio_en}</p>}
          {tech.workPhotos && tech.workPhotos.length > 0 && (
            <p className="text-sm text-ink-muted">{txt("admin.workPhotos")}: {tech.workPhotos.join(", ")}</p>
          )}
          <label className="flex flex-col gap-1 text-sm text-ink">
            {txt("admin.note")}
            <input
              value={notes[tech.id] ?? ""}
              onChange={(event) => setNotes((prev) => ({ ...prev, [tech.id]: event.target.value }))}
              className="rounded-md border border-hairline bg-background px-3 py-2 text-ink"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                disabled={busy !== null}
                onClick={() => void act(tech.id, action)}
                className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 hover:border-primary"
              >
                {txt(`admin.action.${action}`)}
              </button>
            ))}
          </div>
        </article>
      ))}
    </main>
  );
}
