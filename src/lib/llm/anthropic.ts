// Spec §5.3 + 5.1: Anthropic Messages API default (model from LLM_MODEL,
// default claude-haiku-5-5 per 5.3).
const API_URL = "https://api.anthropic.com/v1/messages";

export async function callAnthropic(system: string, user: string): Promise<string> {
  const model = process.env.LLM_MODEL ?? "claude-haiku-5-5";
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 400, // spec §7.1
      temperature: 0, // spec §5.1
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
  const data = await res.json();
  return (data.content as Array<{ type: string; text?: string }>).map((c) => c.text ?? "").join("");
}
