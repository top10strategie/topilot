import { describe, expect, it } from "vitest";
import { assertMissionScopeClientCoherence } from "@/lib/missions/scope";

const CLIENT_ID = "11111111-1111-1111-1111-111111111111";

describe("assertMissionScopeClientCoherence", () => {
  it("accepte une mission client avec client_id", () => {
    expect(assertMissionScopeClientCoherence("client", CLIENT_ID)).toEqual({
      ok: true,
    });
  });

  it("accepte une mission interne sans client", () => {
    expect(assertMissionScopeClientCoherence("interne", null)).toEqual({
      ok: true,
    });
  });

  it("refuse une mission client sans client_id", () => {
    expect(assertMissionScopeClientCoherence("client", null)).toEqual({
      ok: false,
      field: "client_id",
      message: "Le client est obligatoire pour une mission client.",
    });
  });

  it("refuse une mission interne avec un client", () => {
    expect(assertMissionScopeClientCoherence("interne", CLIENT_ID)).toEqual({
      ok: false,
      field: "client_id",
      message: "Une mission interne ne doit pas avoir de client.",
    });
  });

  it("refuse un périmètre hors enum", () => {
    expect(assertMissionScopeClientCoherence("externe", CLIENT_ID)).toEqual({
      ok: false,
      field: "mission_scope",
      message: "Le périmètre est invalide.",
    });
  });
});
