import { describe, expect, it } from "vitest";
import { isPurgeYearEligible, maxPurgeableYear } from "@/lib/data-admin/purge";

describe("maxPurgeableYear", () => {
  it("autorise jusqu'à N−3 en année civile Paris", () => {
    expect(maxPurgeableYear(new Date("2026-10-06T12:00:00+02:00"))).toBe(2023);
  });
});

describe("isPurgeYearEligible", () => {
  const now = new Date("2026-10-06T12:00:00+02:00");

  it("accepte N−3 et refuse N−2, non-entier ou trop ancien", () => {
    expect(isPurgeYearEligible(2023, now)).toBe(true);
    expect(isPurgeYearEligible(2024, now)).toBe(false);
    expect(isPurgeYearEligible(2026, now)).toBe(false);
    expect(isPurgeYearEligible(1999, now)).toBe(false);
    expect(isPurgeYearEligible(2023.5, now)).toBe(false);
  });
});
