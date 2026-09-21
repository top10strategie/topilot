import { cache } from "react";
import { emptyAnalysesPayload } from "@/lib/analyses/empty-payload";
import { createClient } from "@/lib/supabase/server";
import type { AnalysesPayload } from "./types";

/**
 * Charge les agrégats pour `/analyses` et les widgets Home.
 * Sur Home, passer un scope pour ne calculer que les blocs utiles.
 */
export type AnalysesLoadScope = {
  opportunities?: boolean;
  missions?: boolean;
  subscriptions?: boolean;
};

export async function loadAnalysesPayload(
  scope: AnalysesLoadScope = {
    opportunities: true,
    missions: true,
    subscriptions: true,
  },
): Promise<AnalysesPayload> {
  const wantOpp = scope.opportunities !== false;
  const wantMissions = scope.missions !== false;
  const wantSubs = scope.subscriptions !== false;
  const empty = emptyAnalysesPayload();

  if (!wantOpp && !wantMissions && !wantSubs) {
    return empty;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("load_analyses_payload", {
    p_opportunities: wantOpp,
    p_missions: wantMissions,
    p_subscriptions: wantSubs,
  });

  if (error) {
    console.error("loadAnalysesPayload:", error);
    throw new Error(
      `Impossible de charger les analyses : ${error.message}`,
    );
  }

  const row = (data ?? {}) as Partial<AnalysesPayload>;
  return {
    opportunities:
      wantOpp && row.opportunities ? row.opportunities : empty.opportunities,
    missions: wantMissions && row.missions ? row.missions : empty.missions,
    subscriptions:
      wantSubs && row.subscriptions ? row.subscriptions : empty.subscriptions,
  };
}

/** Une seule RPC par requête, partagée par les widgets Home du même scope. */
export const loadAnalysesPayloadCached = cache(async (scopeKey: string) => {
  return loadAnalysesPayload({
    opportunities: scopeKey[0] === "1",
    missions: scopeKey[1] === "1",
    subscriptions: scopeKey[2] === "1",
  });
});
