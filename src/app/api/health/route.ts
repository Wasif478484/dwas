// D13: public readiness probe. No auth, no paid LLM call — key presence only.
const FIRESTORE_TIMEOUT_MS = 3_000;

export type HealthChecks = {
  firestore: "ok" | "error";
  llm: "ok" | "unconfigured";
};

export type HealthBody = {
  status: "ok" | "degraded";
  checks: HealthChecks;
  latencyMs: number;
};

export function healthResponse(
  firestoreOk: boolean,
  llmConfigured: boolean,
  latencyMs: number,
): { status: number; body: HealthBody } {
  return {
    status: firestoreOk ? 200 : 503,
    body: {
      status: firestoreOk ? "ok" : "degraded",
      checks: {
        firestore: firestoreOk ? "ok" : "error",
        llm: llmConfigured ? "ok" : "unconfigured",
      },
      latencyMs,
    },
  };
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("firestore health check timed out")), FIRESTORE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  const start = Date.now();
  let firestoreOk = false;
  try {
    // Lazy import keeps unit tests of healthResponse from booting Firebase Admin.
    const { db } = await import("@/lib/firebase/admin");
    await withTimeout(db.collection("areas").limit(1).get());
    firestoreOk = true;
  } catch {
    // Unreachable Firestore degrades the service; it must not throw to the caller.
  }

  const llmConfigured = process.env.LLM_PROVIDER === "gemini"
    ? Boolean(process.env.GEMINI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);
  const { status, body } = healthResponse(firestoreOk, llmConfigured, Date.now() - start);
  return Response.json(body, { status });
}
