import { createClient } from "@/lib/supabase/server";
import { endOfCurrentIsoWeekParis } from "@/lib/dates/paris-week";
import { resolveVisualPublicUrl } from "@/lib/visuels/public-url";
import type {
  MissionCategoryItem,
  MissionDetail,
  MissionKanbanStatus,
  MissionListItem,
  MissionOpportunityOption,
  MissionRecurrenceFrequency,
  MissionResponsibleItem,
  MissionScope,
  MissionSeriesItem,
} from "./types";

type DocumentVisualRow = {
  id: string;
  file_path: string | null;
  is_visual: boolean;
};

function mapResponsible(row: {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture: DocumentVisualRow | null;
}): MissionResponsibleItem {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    profile_picture_url: resolveVisualPublicUrl(row.profile_picture),
  };
}

const MISSION_LIST_SELECT = `
  id,
  mission_name,
  mission_scope,
  client_id,
  collaborator_id,
  opportunity_id,
  series_id,
  kanban_status,
  kanban_order,
  archived_at,
  completed_at,
  estimated_charge,
  start_at,
  end_at,
  client:client_id ( id, client_name ),
  opportunity:opportunity_id ( id, opportunity_name ),
  collaborator:collaborator_id (
    id,
    first_name,
    last_name,
    profile_picture:profile_picture_id ( id, file_path, is_visual )
  ),
  series:series_id ( id, frequency, starts_on, ends_on ),
  mission_category (
    category:category_business!category_id ( id, label, is_private )
  )
`;

type MissionListRow = {
  id: string;
  mission_name: string;
  mission_scope: MissionScope;
  client_id: string | null;
  collaborator_id: string;
  opportunity_id: string | null;
  series_id: string | null;
  kanban_status: MissionKanbanStatus;
  kanban_order: number | null;
  archived_at: string | null;
  completed_at: string | null;
  estimated_charge: number | string | null;
  start_at: string | null;
  end_at: string | null;
  client: { id: string; client_name: string } | null;
  opportunity: { id: string; opportunity_name: string } | null;
  collaborator: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture: DocumentVisualRow | null;
  } | null;
  series: {
    id: string;
    frequency: MissionRecurrenceFrequency;
    starts_on: string;
    ends_on: string | null;
  } | null;
  mission_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapListItem(row: MissionListRow): MissionListItem {
  const categories: MissionCategoryItem[] = (row.mission_category ?? [])
    .map((link) => link.category)
    .filter((c): c is { id: string; label: string } => Boolean(c))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const responsible = row.collaborator
    ? mapResponsible(row.collaborator)
    : {
        id: row.collaborator_id,
        first_name: "?",
        last_name: "?",
        profile_picture_url: null,
      };

  const series: MissionSeriesItem | null = row.series
    ? {
        id: row.series.id,
        frequency: row.series.frequency,
        starts_on: row.series.starts_on,
        ends_on: row.series.ends_on,
      }
    : null;

  return {
    id: row.id,
    mission_name: row.mission_name,
    mission_scope: row.mission_scope,
    client_id: row.client_id,
    collaborator_id: row.collaborator_id,
    opportunity_id: row.opportunity_id,
    series_id: row.series_id,
    kanban_status: row.kanban_status,
    kanban_order: row.kanban_order,
    archived_at: row.archived_at,
    completed_at: row.completed_at,
    estimated_charge: toNumber(row.estimated_charge),
    start_at: row.start_at,
    end_at: row.end_at,
    client: row.client,
    opportunity: row.opportunity,
    responsible,
    categories,
    series,
  };
}

export async function listMissions(): Promise<MissionListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .select(MISSION_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMissions:", error);
    throw new Error(`Impossible de charger les missions : ${error.message}`);
  }

  return ((data ?? []) as unknown as MissionListRow[]).map(mapListItem);
}

export async function listMissionsByOpportunityId(
  opportunityId: string,
): Promise<MissionListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .select(MISSION_LIST_SELECT)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMissionsByOpportunityId:", error);
    throw new Error(
      `Impossible de charger les missions liées : ${error.message}`,
    );
  }

  return ((data ?? []) as unknown as MissionListRow[]).map(mapListItem);
}

export async function listMissionsByClientId(
  clientId: string,
): Promise<MissionListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .select(MISSION_LIST_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMissionsByClientId:", error);
    throw new Error(
      `Impossible de charger les missions du client : ${error.message}`,
    );
  }

  return ((data ?? []) as unknown as MissionListRow[]).map(mapListItem);
}

/**
 * Missions actives (hors terminée / archivée) dont la date de fin
 * est dans le passé ou jusqu'à la fin de la semaine ISO courante (Top10).
 */
export async function listTop10ActiveMissions(): Promise<MissionListItem[]> {
  const weekEnd = endOfCurrentIsoWeekParis();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .select(MISSION_LIST_SELECT)
    .neq("kanban_status", "terminee")
    .neq("kanban_status", "archivee")
    .not("end_at", "is", null)
    .lte("end_at", weekEnd)
    .order("end_at", { ascending: true });

  if (error) {
    console.error("listTop10ActiveMissions:", error);
    throw new Error(
      `Impossible de charger les missions Top10 : ${error.message}`,
    );
  }

  return ((data ?? []) as unknown as MissionListRow[]).map(mapListItem);
}

export async function getMissionById(
  id: string,
): Promise<MissionDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .select(
      `
      ${MISSION_LIST_SELECT},
      notes
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getMissionById:", error);
    throw new Error(`Impossible de charger la mission : ${error.message}`);
  }

  if (!data) return null;

  const row = data as unknown as MissionListRow & { notes: string | null };
  return {
    ...mapListItem(row),
    notes: row.notes,
  };
}

export async function listMissionOpportunityOptions(): Promise<
  MissionOpportunityOption[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity")
    .select("id, opportunity_name, client_id")
    .order("opportunity_name", { ascending: true });

  if (error) {
    console.error("listMissionOpportunityOptions:", error);
    throw new Error(
      `Impossible de charger les opportunités : ${error.message}`,
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    opportunity_name: row.opportunity_name as string,
    client_id: row.client_id as string,
  }));
}
