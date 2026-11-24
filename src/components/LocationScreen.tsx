// Spec C05: "I do not have to type an address. Geolocation API; if denied,
// choose an area from the seeded list. Store coordinates rounded to 3 decimals
// plus areaId and a free-text landmark note."
"use client";

import { useEffect, useState } from "react";
import { AREAS } from "@/lib/areas";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export interface LocationData {
  lat?: number; // present when Geolocation API succeeded (spec C05)
  lng?: number;
  areaId?: string;
  note?: string;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export default function LocationScreen({ onConfirm }: { onConfirm: (loc: LocationData) => void }) {
  const lang = useLang();
  const [areaId, setAreaId] = useState<string>(AREAS[0].id);
  const [note, setNote] = useState("");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => onConfirm({ lat: round3(pos.coords.latitude), lng: round3(pos.coords.longitude) }),
      () => undefined, // denied → picker stays (spec C05).
    );
  }, [onConfirm]);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-hairline bg-background p-4">
      <div className="flex gap-2">
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          aria-label={t(lang, "client.areaLabel")}
          className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-ink outline-none"
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onConfirm({ areaId, note: note || undefined })}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white"
        >
          {t(lang, "client.submit")}
        </button>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t(lang, "client.landmark")}
        aria-label={t(lang, "client.landmark")}
        className="w-full rounded-lg border border-hairline bg-background px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-primary"
      />
    </section>
  );
}
