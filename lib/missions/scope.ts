import type { MissionScope } from "@/lib/missions/types";

export const MISSION_SCOPES = new Set<MissionScope>(["client", "interne"]);

export type MissionScopeCoherenceResult =
  | { ok: true }
  | { ok: false; field: "mission_scope" | "client_id"; message: string };

export function isMissionScope(value: string): value is MissionScope {
  return MISSION_SCOPES.has(value as MissionScope);
}

/** Cohérence `mission_scope` / `client_id` (contrainte métier `mission_scope_client_coherence`). */
export function assertMissionScopeClientCoherence(
  scope: string,
  clientId: string | null,
): MissionScopeCoherenceResult {
  if (!isMissionScope(scope)) {
    return {
      ok: false,
      field: "mission_scope",
      message: "Le périmètre est invalide.",
    };
  }
  if (scope === "client" && !clientId) {
    return {
      ok: false,
      field: "client_id",
      message: "Le client est obligatoire pour une mission client.",
    };
  }
  if (scope === "interne" && clientId) {
    return {
      ok: false,
      field: "client_id",
      message: "Une mission interne ne doit pas avoir de client.",
    };
  }
  return { ok: true };
}
