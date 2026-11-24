// Rate table lookup (spec D03). Prices are read from seeded rateTable docs —
// the LLM never produces prices.
import type { Trade } from "./types";

export interface RateTableRow {
  trade: Trade;
  jobType: string;
  minPKR: number;
  maxPKR: number;
  note?: string;
}

export function rateBand(
  trade: Trade,
  jobType: string,
  rows: RateTableRow[],
): { min: number; max: number } {
  const row = rows.find((r) => r.trade === trade && r.jobType === jobType);
  if (row) return { min: row.minPKR, max: row.maxPKR };
  const tradeDefault = rows.find((r) => r.trade === trade);
  if (tradeDefault) return { min: tradeDefault.minPKR, max: tradeDefault.maxPKR };
  throw new Error(`No rate row or trade default for ${trade}/${jobType}`);
}
