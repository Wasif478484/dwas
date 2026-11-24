// A06: complaints queue — filter, read and resolve with an audit trail.
"use client";

import { Ban, Banknote, MessageCircle, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type ComplaintDoc, type ComplaintKind } from "@/lib/admin/complaints";
import { clientAuthHeaders } from "@/lib/auth/client";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

const FILTERS = ["", "open", "resolved"] as const;
type Filter = (typeof FILTERS)[number];

const KIND_ICONS: Record<ComplaintKind, LucideIcon> = {
  price: Banknote,
  no_show: Ban,
  quality: Wrench,
  other: MessageCircle,
};

export default function AdminComplaints() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [filter, setFilter] = useState<Filter>("");
  const [items, setItems] = useState<ComplaintDoc[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await clientAuthHeaders();
      const params = filter ? `?status=${filter}` : "";
      const response = await fetch(`/api/admin/complaints${params}`, { headers });
      if (!response.ok) throw new Error("complaint list failed");
      const data = (await response.json()) as { items: ComplaintDoc[] };
      setItems(data.items);
    } catch {
      setError(t(lang, "admin.complaints.error" as TranslationKey));
    } finally {
      setLoading(false);
    }
  }, [filter, lang]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(complaint: ComplaintDoc) {
    const status = complaint.status === "resolved" ? "open" : "resolved";
    setBusy(complaint.id);
    try {
      const headers = { ...(await clientAuthHeaders()), "content-type": "application/json" };
      const response = await fetch(`/api/admin/complaints/${encodeURIComponent(complaint.id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, note: notes[complaint.id]?.trim() || undefined }),
      });
      setMessage(txt(response.ok ? "admin.actionDone" : "admin.actionFailed"));
      if (response.ok) await load();
    } catch {
      setMessage(txt("admin.actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.complaints.title")}</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label={txt("admin.status")}>
        {FILTERS.map((value) => (
          <button
            key={value || "all"}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`pressable min-h-11 rounded-pill border px-4 text-sm ${
              filter === value ? "border-primary bg-primary text-white" : "border-hairline bg-background text-ink"
            }`}
          >
            {txt(value ? `admin.complaints.${value}` : "admin.all")}
          </button>
        ))}
      </div>
      {loading && <p role="status" className="text-sm text-ink-muted">{txt("admin.complaints.loading")}</p>}
      {error && <p role="alert" className="text-sm text-ink-muted">{error}</p>}
      {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-md border border-hairline bg-surface p-4 text-sm text-ink-subtle">{txt("admin.complaints.empty")}</p>
      )}
      {items.map((complaint) => {
        const Icon = KIND_ICONS[complaint.kind] ?? KIND_ICONS.other;
        return (
          <article key={complaint.id} className="flex flex-col gap-2 rounded-md border border-hairline bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-medium text-ink">{txt(`admin.complaints.kind.${complaint.kind}`)}</h2>
              {complaint.status === "resolved" && (
                <span className="rounded-pill border border-hairline px-3 py-1 text-xs text-ink-muted">{txt("admin.complaints.resolved")}</span>
              )}
            </div>
            <p className="text-sm text-ink-muted">
              {txt("admin.complaints.raised")}: {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : "—"}
            </p>
            <p className="text-sm text-ink">{complaint.text}</p>
            {complaint.status === "resolved" && complaint.resolvedBy && (
              <p className="text-sm text-ink-muted">{txt("admin.complaints.resolvedBy")}: {complaint.resolvedBy}</p>
            )}
            <Link
              href={`/client/booking/${encodeURIComponent(complaint.bookingId)}`}
              className="pressable self-start text-sm font-medium text-primary hover:underline"
            >
              {txt("admin.complaints.booking")}
            </Link>
            <label className="flex flex-col gap-1 text-sm text-ink">
              {txt("admin.note")}
              <input
                value={notes[complaint.id] ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [complaint.id]: event.target.value }))}
                maxLength={500}
                className="rounded-md border border-hairline bg-background px-3 py-2"
              />
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void update(complaint)}
              className="pressable min-h-11 self-start rounded-md border border-primary px-5 text-sm font-medium text-primary disabled:opacity-60"
            >
              {txt(complaint.status === "resolved" ? "admin.complaints.reopen" : "admin.complaints.resolve")}
            </button>
          </article>
        );
      })}
    </main>
  );
}
