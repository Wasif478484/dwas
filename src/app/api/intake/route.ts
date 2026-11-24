// Spec §8.1: POST /api/intake — public, rate limited, zod-validated input,
// spec §7.1 pipeline. Logs intake_started, voice outcome and fallback (D08).
import { z } from "zod";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events/log";
import { INTAKE_MAX_CHARS } from "@/lib/config";
import { runIntake } from "@/lib/intake/pipeline";

const inputSchema = z.object({
  text: z.string().min(1).max(INTAKE_MAX_CHARS),
  language_hint: z.string().optional(),
  voice: z.enum(["ok", "failed", "none"]).optional(),
});

// Spec §10.2 D07: per-IP rate limit on /api/intake (example: 20/min).
const rateWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = { perMinute: 20, windowMs: 60_000 };

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isAllowed(ip: string): boolean {
  const now = Date.now();
  const entry = rateWindows.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateWindows.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }
  if (entry.count >= RATE_LIMIT.perMinute) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!isAllowed(clientIp(request))) {
    return NextResponse.json({ error: { code: "rate_limited", message: "Too many requests" } }, { status: 429 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid input" } }, { status: 400 });
  }
  await logEvent("intake_started", "client");
  const result = await runIntake(parsed.data.text);
  // Voice outcome comes from the mic; the rules fallback comes from the pipeline.
  // Keeping them separate avoids logging the same event twice.
  if (parsed.data.voice === "ok") await logEvent("voice_ok", "client");
  if (parsed.data.voice === "failed") await logEvent("voice_failed", "client");
  if (result.source !== "llm") await logEvent("fallback_used", "client");
  return NextResponse.json(result);
}
