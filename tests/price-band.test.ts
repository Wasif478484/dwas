import { describe, expect, it } from "vitest";
import { OVER_BAND_PCT } from "@/lib/config";
import { isOverBand } from "@/lib/rate-table";

describe("isOverBand (C11)", () => {
  const band = { min: 800, max: 1000 };

  it("is false inside the band and at the exact +25% boundary", () => {
    expect(isOverBand(band, 1000)).toBe(false);
    expect(isOverBand(band, 1249)).toBe(false);
    expect(isOverBand(band, 1250)).toBe(false); // exactly 25% over is not "more than"
  });

  it("is true only above the 25% boundary", () => {
    expect(isOverBand(band, 1250.01)).toBe(true);
    expect(isOverBand(band, 2000)).toBe(true);
  });

  it("is false when the band or price is missing", () => {
    expect(isOverBand(null, 5000)).toBe(false);
    expect(isOverBand(band, undefined)).toBe(false);
    expect(isOverBand(null, undefined)).toBe(false);
  });

  it("honours a custom percentage and the default", () => {
    expect(isOverBand(band, 1100, 10)).toBe(false);
    expect(isOverBand(band, 1100.01, 10)).toBe(true);
    expect(isOverBand(band, 1001, 0)).toBe(true);
    expect(isOverBand(band, 1000, OVER_BAND_PCT)).toBe(false);
  });
});
