// Spec §7.1: zod schemas for the LLM output and the per-trade allowed jobType
// lists (appended to the prompt, spec §7.1: "Append the allowed jobType list
// per trade (section 11)").
import { z } from "zod";
import type { Trade } from "@/lib/types";

export const TRADE_JOB_TYPES: Record<Exclude<Trade, "unknown">, string[]> = {
  plumber: ["tap_leak", "drain_block", "geyser_issue", "tank_pump", "pipe_burst"],
  electrician: ["switch_socket", "wiring_fault", "fan", "ups_inverter", "short_circuit"],
  ac_fridge: ["ac_not_cooling", "ac_gas", "ac_install", "fridge_not_cooling"],
  carpenter: ["door_lock", "door_repair", "furniture_repair", "cupboard"],
  mazdoor: ["day_labour", "shifting_help", "cleaning_help"],
};

export const intakeLLMResultSchema = z.object({
  trade: z.enum(["plumber", "electrician", "ac_fridge", "carpenter", "mazdoor", "unknown"]),
  jobType: z.string().max(60),
  urgency: z.enum(["now", "today", "tomorrow", "flexible"]),
  emergency: z.object({
    is_emergency: z.boolean(),
    kind: z.enum(["gas", "electrical", "fire", "flood", "none"]),
  }),
  summary_en: z.string().min(1).max(400),
  summary_ur: z.string().min(1).max(400),
  confidence: z.number().min(0).max(1),
  language_detected: z.enum(["ur", "roman_ur", "en", "mixed"]),
  needs_clarification: z.boolean(),
  clarifying_question_ur: z.string().max(300).nullable(),
});
export type IntakeLLMResult = z.infer<typeof intakeLLMResultSchema>;
