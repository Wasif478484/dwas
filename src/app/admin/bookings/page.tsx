// Admin bookings table with server-side filters (D05 / list route).
"use client";

import { useEffect, useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";
import type { BookingDoc, Trade } from "@/lib/types";

type Booking = Partial<BookingDoc> & { id: string };
const STATUSES = [
  "requested", "accepted", "declined", "expired", "cancelled_client", "cancelled_tech",
  "on_the_way", "in_progress", "completed", "reviewed", "disputed", "no_show",
] as const;
const TRADES: Trade[] = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"];

export default function AdminBookings() {
  const lang = useLang();
  const txt = (key: string) => t(lang, key as TranslationKey);
  const [status, setStatus] = useState("");
  const [trade, setTrade] = useState("");
  const [technician, setTechnician] = useState("");
  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("dwas-demo-token") ?? "";
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (trade) params.set("trade", trade);
    if (technician) params.set("technician", technician);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/bookings?${params.toString()}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("booking list failed");
        const data: { items: Booking[] } = await response.json();
        setItems(data.items);
        setError(null);
      } catch {
        setError(t(lang, "admin.error" as TranslationKey));
      }
    })();
  }, [status, trade, technician, lang]);

  return (
    <main dir={lang === "ur" ? "rtl" : "ltr"} className="flex min-h-screen flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-display font-display text-ink">{txt("admin.bookings.title")}</h1>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-sm text-ink">
          {txt("admin.status")}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-hairline bg-background px-3 py-2">
            <option value="">{txt("admin.all")}</option>
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          {txt("admin.trade")}
          <select value={trade} onChange={(e) => setTrade(e.target.value)} className="rounded-md border border-hairline bg-background px-3 py-2">
            <option value="">{txt("admin.all")}</option>
            {TRADES.map((value) => <option key={value} value={value}>{t(lang, `trade.${value}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink">
          {txt("admin.technician")}
          <input value={technician} onChange={(e) => setTechnician(e.target.value)} className="rounded-md border border-hairline bg-background px-3 py-2" />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-ink-muted">{error}</p>}
      {items.length === 0 && !error && <p className="text-sm text-ink-subtle">{txt("admin.none")}</p>}
      <div className="w-full overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-surface text-ink-muted">
            <tr>
              <th className="p-2">{txt("admin.booking.id")}</th>
              <th className="p-2">{txt("admin.booking.client")}</th>
              <th className="p-2">{txt("admin.technician")}</th>
              <th className="p-2">{txt("admin.trade")}</th>
              <th className="p-2">{txt("admin.status")}</th>
              <th className="p-2">{txt("admin.booking.created")}</th>
              <th className="p-2">{txt("admin.booking.price")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((booking) => (
              <tr key={booking.id} className="border-t border-hairline text-ink">
                <td className="p-2">{booking.id}</td>
                <td className="p-2">{booking.clientId ?? "—"}</td>
                <td className="p-2">{booking.technicianId ?? "—"}</td>
                <td className="p-2">{booking.trade ? t(lang, `trade.${booking.trade}`) : "—"}</td>
                <td className="p-2">{booking.status ?? "—"}</td>
                <td className="p-2">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "—"}</td>
                <td className="p-2">{booking.finalPrice ?? booking.priceBand?.max ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
