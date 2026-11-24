import { describe, expect, it } from "vitest";
import { rateBand, type RateTableRow } from "@/lib/rate-table";
import type { Trade } from "@/lib/types";

const RATE_TABLE: RateTableRow[] = [
  { trade: "plumber", jobType: "tap_leak", minPKR: 500, maxPKR: 1500 },
  { trade: "plumber", jobType: "drain_block", minPKR: 800, maxPKR: 2500 },
  { trade: "electrician", jobType: "switch_socket", minPKR: 300, maxPKR: 1000 },
];

// Foundation smoke test: types are importable and the rate lookup (D03) works.
describe("lib", () => {
  it("rateBand returns the row for trade + jobType", () => {
    expect(rateBand("plumber", "tap_leak", RATE_TABLE)).toEqual({ min: 500, max: 1500 });
  });

  it("rateBand falls back to the trade default (spec 11.3)", () => {
    expect(rateBand("plumber", "unknown_job", RATE_TABLE)).toEqual({ min: 500, max: 1500 });
    const trade: Trade = "electrician";
    expect(rateBand(trade, "switch_socket", RATE_TABLE)).toEqual({ min: 300, max: 1000 });
  });
});
