// Spec §5.3 + 5.1: Gemini alternative (LLM_PROVIDER=gemini, model from
// LLM_MODEL).
export async function callGemini(system: string, user: string): Promise<string> {
  const model = process.env.LLM_MODEL ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
  return (parts ?? []).map((p) => p.text ?? "").join("");
}
