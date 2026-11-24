// Spec §5.1: "Provider interface so the model can be swapped by environment
// variable." LLM_PROVIDER=anthropic (default) | gemini; keys server-side only.
import { callAnthropic } from "./anthropic";
import { callGemini } from "./gemini";

export type LLMProvider = "anthropic" | "gemini";

export interface LLMClient {
  call(system: string, user: string): Promise<string>;
}

export function getLLMClient(): LLMClient | null {
  const provider: LLMProvider = process.env.LLM_PROVIDER === "gemini" ? "gemini" : "anthropic";
  const hasKey = provider === "gemini"
    ? Boolean(process.env.GEMINI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);
  if (!hasKey) return null;
  return {
    call: (system, user) => (provider === "gemini" ? callGemini(system, user) : callAnthropic(system, user)),
  };
}
