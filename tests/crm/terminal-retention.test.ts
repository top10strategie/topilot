import { describe, expect, it } from "vitest";
import {
  isWithinTerminalRetention,
  missionTerminalReference,
  opportunityTerminalReference,
} from "@/lib/crm/terminal-retention";
import {
  MISSION_CLOSED_KANBAN_STATUSES,
  MISSION_OPEN_KANBAN_STATUSES,
} from "@/lib/missions/list-filters";
import { OPPORTUNITY_KANBAN_STATUSES } from "@/lib/opportunities/labels";
import {
  OPPORTUNITY_CLOSED_KANBAN_STATUSES,
  OPPORTUNITY_OPEN_KANBAN_STATUSES,
} from "@/lib/opportunities/list-filters";

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("statuts kanban", () => {
  it("sépare colonnes ouvertes et closes (opportunité)", () => {
    expect(OPPORTUNITY_KANBAN_STATUSES).toEqual([
      "suspect",
      "prospect",
      "besoin_specifie",
      "proposition_envoyee",
      "gagne",
      "perdue",
    ]);
    expect(OPPORTUNITY_OPEN_KANBAN_STATUSES).toEqual([
      "suspect",
      "prospect",
      "besoin_specifie",
      "proposition_envoyee",
    ]);
    expect(OPPORTUNITY_CLOSED_KANBAN_STATUSES).toEqual(["gagne", "perdue"]);
  });

  it("sépare colonnes ouvertes et closes (mission)", () => {
    expect(MISSION_OPEN_KANBAN_STATUSES).toEqual(["a_faire", "en_cours"]);
    expect(MISSION_CLOSED_KANBAN_STATUSES).toEqual(["terminee", "archivee"]);
  });
});

describe("opportunityTerminalReference", () => {
  it("préfère closed_at puis due_date_at", () => {
    expect(
      opportunityTerminalReference({
        closed_at: "2026-03-01",
        due_date_at: "2026-02-01",
      }),
    ).toBe("2026-03-01");
    expect(
      opportunityTerminalReference({
        closed_at: null,
        due_date_at: "2026-02-01",
      }),
    ).toBe("2026-02-01");
  });
});

describe("missionTerminalReference", () => {
  it("utilise archived_at / completed_at selon le statut, sinon end_at", () => {
    expect(
      missionTerminalReference({
        kanban_status: "archivee",
        completed_at: "2026-01-01",
        archived_at: "2026-02-10",
        end_at: "2026-01-15",
      }),
    ).toBe("2026-02-10");
    expect(
      missionTerminalReference({
        kanban_status: "terminee",
        completed_at: null,
        archived_at: "2026-02-10",
        end_at: "2026-01-15",
      }),
    ).toBe("2026-01-15");
    expect(
      missionTerminalReference({
        kanban_status: "en_cours",
        completed_at: "2026-01-01",
        archived_at: null,
        end_at: "2026-01-15",
      }),
    ).toBeNull();
  });
});

describe("isWithinTerminalRetention", () => {
  it("inclut une date récente et exclut une date trop ancienne ou absente", () => {
    const now = new Date();
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 5);
    const old = new Date(now);
    old.setMonth(old.getMonth() - 2);

    expect(isWithinTerminalRetention(toYmd(recent))).toBe(true);
    expect(isWithinTerminalRetention(toYmd(old))).toBe(false);
    expect(isWithinTerminalRetention(null)).toBe(false);
    expect(isWithinTerminalRetention("")).toBe(false);
  });
});
