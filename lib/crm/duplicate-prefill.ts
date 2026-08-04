import type {
  MissionDetail,
  MissionDuplicatePrefill,
  MissionListItem,
} from "@/lib/missions/types";
import type {
  OpportunityDetail,
  OpportunityListItem,
} from "@/lib/opportunities/types";

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildMissionDuplicatePrefill(
  source: MissionListItem | MissionDetail,
): MissionDuplicatePrefill {
  return {
    mission_name: source.mission_name,
    mission_scope: source.mission_scope,
    client_id: source.client_id,
    collaborator_id: source.collaborator_id,
    estimated_charge: source.estimated_charge,
    notes: "notes" in source ? (source.notes ?? null) : null,
    categories: [...source.categories],
  };
}

export type OpportunityDuplicatePrefill = {
  opportunity_name: string;
  client_id: string;
  contact_client_id: string | null;
  collaborator_id: string;
  action: string | null;
  source: string | null;
  notes: string | null;
  last_meeting_at: string;
  categories: OpportunityDetail["categories"] | OpportunityListItem["categories"];
};

export function buildOpportunityDuplicatePrefill(
  source: OpportunityListItem | OpportunityDetail,
): OpportunityDuplicatePrefill {
  return {
    opportunity_name: source.opportunity_name,
    client_id: source.client_id,
    contact_client_id: source.contact_client_id,
    collaborator_id: source.collaborator_id,
    action: "action" in source ? (source.action ?? null) : null,
    source: "source" in source ? (source.source ?? null) : null,
    notes: "notes" in source ? (source.notes ?? null) : null,
    last_meeting_at: todayYmd(),
    categories: [...source.categories],
  };
}
