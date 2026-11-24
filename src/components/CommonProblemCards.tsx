// DWAS spec C02: "Textarea plus an icon grid: 5 trades and 8 common-problem
// cards (tap leaking, geyser, AC not cooling, switch sparking, fan, door lock,
// drain block, shifting help)."
"use client";

import type { ComponentType } from "react";
import { Cable, DoorClosed, Droplet, Fan, Move, Power, Scissors, Sparkles, Thermometer } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/use-lang";

export const TRADES = ["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor"] as const;

export const PROBLEM_KEYS = [
  "tap_leak",
  "geyser",
  "ac_cool",
  "switch_spark",
  "fan",
  "door_lock",
  "drain_block",
  "shift_help",
] as const;
export type ProblemKey = (typeof PROBLEM_KEYS)[number];

const ICONS: Record<ProblemKey, ComponentType<{ className?: string }>> = {
  tap_leak: Droplet,
  geyser: Power,
  ac_cool: Thermometer,
  switch_spark: Sparkles,
  fan: Fan,
  door_lock: DoorClosed,
  drain_block: Cable,
  shift_help: Move,
};

export default function CommonProblemCards({ onSelect }: { onSelect: (text: string) => void }) {
  const lang = useLang();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {PROBLEM_KEYS.map((key) => {
        const Icon = ICONS[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(t(lang, `problem.${key}`))}
            className="flex flex-col items-center gap-1 rounded-lg border bg-white px-3 py-4 text-xs text-center shadow-sm active:bg-slate-50"
          >
            <Icon className="h-6 w-6 text-teal-600" />
            <span>{t(lang, `problem.${key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
