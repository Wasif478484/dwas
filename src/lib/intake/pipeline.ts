// Spec §7.1 intake pipeline: normalise → rules classifier → LLM (4 s timeout,
// zod) → merge (emergency = rules OR LLM; trade LLM ≥ 0.6 else rules ≥ 0.5;
// urgency LLM else rules else "today").
import { INTAKE_MAX_CHARS, INTAKE_TIMEOUT_MS } from "@/lib/config";
import { buildIntakeSystemPrompt } from "@/lib/llm/prompt";
import { getLLMClient } from "@/lib/llm/provider";
import { intakeLLMResultSchema } from "@/lib/llm/schema";
import { classifyTrades, classifyUrgency } from "@/lib/rules/classify";
import { detectEmergency } from "@/lib/rules/emergency";
import type { IntakeResult, Urgency } from "@/lib/types";

function normalise(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, INTAKE_MAX_CHARS);
}

function detectLanguage(text: string): IntakeResult["language_detected"] {
  return /[\u0600-\u06FF]/u.test(text) ? "ur" : "en";
}

async function callLLM(text: string): Promise<IntakeResult | null> {
  const client = getLLMClient();
  if (!client) return null;
  try {
    const raw = await Promise.race([
      client.call(buildIntakeSystemPrompt(), text),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LLM timeout")), INTAKE_TIMEOUT_MS),
      ),
    ]);
    const parsed = intakeLLMResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ...parsed.data, source: "llm" } : null;
  } catch {
    return null;
  }
}

export async function runIntake(rawText: string): Promise<IntakeResult> {
  const text = normalise(rawText);
  const rules = classifyTrades(text);
  const rulesEmergency = detectEmergency(text);
  const llm = await callLLM(text);

  const emergency = {
    is_emergency: rulesEmergency.is_emergency || llm?.emergency.is_emergency === true,
    kind: (rulesEmergency.is_emergency
      ? rulesEmergency.kind
      : llm?.emergency.is_emergency
        ? llm.emergency.kind
        : "none") as IntakeResult["emergency"]["kind"],
  };
  const trade = llm && llm.trade !== "unknown" && llm.confidence >= 0.6 ? llm.trade : rules.trade;
  const confidence = Math.max(llm?.confidence ?? 0, rules.confidence);
  const urgency: Urgency = llm?.urgency ?? classifyUrgency(text);
  const needs_clarification = trade === "unknown" || confidence < 0.6;

  return {
    trade,
    jobType: llm?.jobType ?? "other",
    urgency,
    emergency,
    summary_en: llm?.summary_en ?? "Problem reported.",
    summary_ur: llm?.summary_ur ?? "[TODO-REVIEW] Masla report hua.",
    confidence,
    language_detected: detectLanguage(text),
    needs_clarification,
    clarifying_question_ur: llm?.clarifying_question_ur ?? null,
    source: llm ? "merged" : "rules",
  };
}
