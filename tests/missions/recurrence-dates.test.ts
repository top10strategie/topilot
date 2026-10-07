import { describe, expect, it } from "vitest";
import {
  MISSION_RECURRENCE_LEAD_DAYS,
  nextOccurrenceEnd,
  nextOccurrenceStart,
  shouldGenerateOccurrence,
} from "@/lib/missions/recurrence-dates";

describe("nextOccurrenceStart", () => {
  it("avance selon les quatre fréquences", () => {
    expect(nextOccurrenceStart("2026-01-15", "hebdomadaire")).toBe(
      "2026-01-22",
    );
    expect(nextOccurrenceStart("2026-01-15", "mensuelle")).toBe("2026-02-15");
    expect(nextOccurrenceStart("2026-01-15", "trimestrielle")).toBe(
      "2026-04-15",
    );
    expect(nextOccurrenceStart("2026-01-15", "annuelle")).toBe("2027-01-15");
  });
});

describe("shouldGenerateOccurrence", () => {
  const nextStart = "2026-03-20";

  it("skip si today est avant J−10", () => {
    expect(
      shouldGenerateOccurrence({
        today: "2026-03-09",
        nextStart,
        endsOn: null,
        leadDays: MISSION_RECURRENCE_LEAD_DAYS,
      }),
    ).toBe(false);
  });

  it("génère à partir de J−10 inclus", () => {
    expect(
      shouldGenerateOccurrence({
        today: "2026-03-10",
        nextStart,
        endsOn: null,
      }),
    ).toBe(true);
    expect(
      shouldGenerateOccurrence({
        today: "2026-03-20",
        nextStart,
        endsOn: null,
      }),
    ).toBe(true);
  });

  it("skip si la prochaine occurrence dépasse ends_on", () => {
    expect(
      shouldGenerateOccurrence({
        today: "2026-03-20",
        nextStart,
        endsOn: "2026-03-19",
      }),
    ).toBe(false);
  });
});

describe("nextOccurrenceEnd", () => {
  it("reporte la durée de la dernière occurrence", () => {
    expect(nextOccurrenceEnd("2026-01-01", "2026-01-08", "2026-02-01")).toBe(
      "2026-02-08",
    );
  });

  it("retourne null sans dates de référence", () => {
    expect(nextOccurrenceEnd(null, "2026-01-08", "2026-02-01")).toBeNull();
    expect(nextOccurrenceEnd("2026-01-01", null, "2026-02-01")).toBeNull();
  });
});
