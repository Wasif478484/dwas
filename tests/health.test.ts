import { describe, expect, it } from "vitest";
import { healthResponse } from "@/app/api/health/route";

describe("health response (D13)", () => {
  it("is ok with a reachable Firestore and a configured LLM", () => {
    expect(healthResponse(true, true, 12)).toEqual({
      status: 200,
      body: { status: "ok", checks: { firestore: "ok", llm: "ok" }, latencyMs: 12 },
    });
  });

  it("is degraded with 503 when Firestore fails", () => {
    const result = healthResponse(false, true, 34);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({
      status: "degraded",
      checks: { firestore: "error", llm: "ok" },
      latencyMs: 34,
    });
  });

  it("treats an unconfigured LLM key as ok, not an error", () => {
    const result = healthResponse(true, false, 5);
    expect(result.status).toBe(200);
    expect(result.body.checks.llm).toBe("unconfigured");
  });
});
