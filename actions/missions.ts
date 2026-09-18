"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { listBusinessCategories } from "@/lib/categories/queries";
import type { CategoryItem } from "@/lib/categories/types";
import { listClientOptions } from "@/lib/clients/queries";
import type { ClientOption } from "@/lib/clients/types";
import { listCollaborators } from "@/lib/collaborators/queries";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { todayParisYmd } from "@/lib/dates/paris";
import { formCategoryIds, formOptional, formText } from "@/lib/form-data";
import {
  MISSION_CLOSED_KANBAN_STATUSES,
  type MissionsListFilters,
} from "@/lib/missions/list-filters";
import type {
  MissionKanbanStatus,
  MissionListItem,
  MissionOpportunityOption,
  MissionScope,
} from "@/lib/missions/types";
import {
  listMissionOpportunityOptions,
  listMissionsByOpportunityId,
  listMissionsPage,
} from "@/lib/missions/queries";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type MissionActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<
        Record<
          | "mission_name"
          | "mission_scope"
          | "client_id"
          | "collaborator_id"
          | "opportunity_id"
          | "estimated_charge"
          | "kanban_status"
          | "start_at"
          | "end_at"
          | "category_ids"
          | "notes",
          string
        >
      >;
    };

const KANBAN_STATUSES = new Set<MissionKanbanStatus>([
  "a_faire",
  "en_cours",
  "terminee",
  "archivee",
]);

const SCOPES = new Set<MissionScope>(["client", "interne"]);

function formOptionalNumber(
  formData: FormData,
  key: string,
): number | null | undefined {
  const raw = formText(formData, key);
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function revalidateMissions(id?: string, extras?: {
  clientId?: string | null;
  opportunityId?: string | null;
}) {
  revalidatePath("/missions");
  if (id) revalidatePath(`/missions/${id}`);
  revalidatePath("/clients");
  revalidatePath("/opportunities");
  if (extras?.clientId) revalidatePath(`/clients/${extras.clientId}`);
  if (extras?.opportunityId) {
    revalidatePath(`/opportunities/${extras.opportunityId}`);
  }
}

async function syncMissionCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  missionId: string,
  categoryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const uniqueIds = [...new Set(categoryIds)];

  const { data: existingRows, error: existingError } = await supabase
    .from("mission_category")
    .select("category_id")
    .eq("mission_id", missionId);

  if (existingError) {
    return {
      success: false,
      error: `Impossible de lire les catégories : ${existingError.message}`,
    };
  }

  const existingIds = new Set(
    (existingRows ?? []).map((row) => row.category_id as string),
  );
  const desiredIds = new Set(uniqueIds);
  const toRemove = [...existingIds].filter((cid) => !desiredIds.has(cid));
  const toAdd = [...desiredIds].filter((cid) => !existingIds.has(cid));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("mission_category")
      .delete()
      .eq("mission_id", missionId)
      .in("category_id", toRemove);
    if (error) {
      return {
        success: false,
        error: `Impossible de retirer des catégories : ${error.message}`,
      };
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("mission_category").insert(
      toAdd.map((category_id) => ({
        mission_id: missionId,
        category_id,
      })),
    );
    if (error) {
      return {
        success: false,
        error: `Impossible d'associer les catégories : ${error.message}`,
      };
    }
  }

  return { success: true };
}

/** Création minimale (identification). */
export async function createMissionRecord(
  formData: FormData,
): Promise<MissionActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const mission_name = formText(formData, "mission_name");
  const mission_scope = formText(formData, "mission_scope") as MissionScope;
  const collaborator_id = formText(formData, "collaborator_id");
  const client_id = formOptional(formData, "client_id");
  const opportunity_id = formOptional(formData, "opportunity_id");
  const start_at = formOptional(formData, "start_at") ?? todayParisYmd();
  const end_at = formOptional(formData, "end_at");

  const fieldErrors: NonNullable<
    Extract<MissionActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!mission_name) {
    fieldErrors.mission_name = "Le titre est obligatoire.";
  }
  if (!SCOPES.has(mission_scope)) {
    fieldErrors.mission_scope = "Le périmètre est invalide.";
  }
  if (!collaborator_id) {
    fieldErrors.collaborator_id = "Le responsable mission est obligatoire.";
  }
  if (mission_scope === "client" && !client_id) {
    fieldErrors.client_id = "Le client est obligatoire pour une mission client.";
  }
  if (mission_scope === "interne" && client_id) {
    fieldErrors.client_id =
      "Une mission interne ne doit pas avoir de client.";
  }
  if (!end_at) {
    fieldErrors.end_at = "La date de fin est obligatoire.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .insert({
      mission_name,
      mission_scope,
      collaborator_id,
      client_id: mission_scope === "interne" ? null : client_id,
      opportunity_id,
      start_at,
      end_at: end_at as string,
      kanban_status: "a_faire",
    })
    .select("id")
    .single();

  if (error) {
    console.error("createMissionRecord:", error);
    return {
      success: false,
      error: `Impossible de créer la mission : ${error.message}`,
    };
  }

  revalidateMissions(data.id, {
    clientId: mission_scope === "interne" ? null : client_id,
    opportunityId: opportunity_id,
  });
  return { success: true, id: data.id };
}

/** Mise à jour complète (édition / complément). */
export async function updateMissionRecord(
  id: string,
  formData: FormData,
): Promise<MissionActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant mission manquant." };
  }

  const mission_name = formText(formData, "mission_name");
  const mission_scope = formText(formData, "mission_scope") as MissionScope;
  const collaborator_id = formText(formData, "collaborator_id");
  const client_id = formOptional(formData, "client_id");
  const opportunity_id = formOptional(formData, "opportunity_id");
  const notes = formData.has("notes")
    ? formOptional(formData, "notes")
    : undefined;
  const start_at = formOptional(formData, "start_at") ?? todayParisYmd();
  const end_at = formOptional(formData, "end_at");
  const kanbanRaw = formText(formData, "kanban_status");
  const estimated = formOptionalNumber(formData, "estimated_charge");

  const fieldErrors: NonNullable<
    Extract<MissionActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!mission_name) {
    fieldErrors.mission_name = "Le titre est obligatoire.";
  }
  if (!SCOPES.has(mission_scope)) {
    fieldErrors.mission_scope = "Le périmètre est invalide.";
  }
  if (!collaborator_id) {
    fieldErrors.collaborator_id = "Le responsable mission est obligatoire.";
  }
  if (mission_scope === "client" && !client_id) {
    fieldErrors.client_id = "Le client est obligatoire pour une mission client.";
  }
  if (mission_scope === "interne" && client_id) {
    fieldErrors.client_id =
      "Une mission interne ne doit pas avoir de client.";
  }
  if (!end_at) {
    fieldErrors.end_at = "La date de fin est obligatoire.";
  }
  if (estimated === undefined || (estimated != null && estimated < 0)) {
    fieldErrors.estimated_charge = "Temps vendu invalide.";
  }
  if (!KANBAN_STATUSES.has(kanbanRaw as MissionKanbanStatus)) {
    fieldErrors.kanban_status = "Statut invalide.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("mission")
    .select("id, notes, client_id, opportunity_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError
        ? `Impossible de lire la mission : ${existingError.message}`
        : "Mission introuvable.",
    };
  }

  const resolvedClientId =
    mission_scope === "interne" ? null : client_id;

  const payload: Record<string, unknown> = {
    mission_name,
    mission_scope,
    collaborator_id,
    client_id: resolvedClientId,
    opportunity_id,
    start_at,
    end_at,
    estimated_charge: estimated,
    kanban_status: kanbanRaw,
  };

  if (notes !== undefined) {
    payload.notes = notes;
    if (existing.notes !== notes) {
      payload.notes_updated_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("mission")
    .update(payload as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateMissionRecord:", error);
    return {
      success: false,
      error: error
        ? `Impossible de mettre à jour la mission : ${error.message}`
        : "Mission introuvable.",
    };
  }

  const sync = await syncMissionCategories(
    supabase,
    id,
    formCategoryIds(formData),
  );
  if (!sync.success) {
    return { success: false, error: sync.error };
  }

  revalidateMissions(id, {
    clientId: resolvedClientId ?? (existing.client_id as string | null),
    opportunityId:
      opportunity_id ?? (existing.opportunity_id as string | null),
  });
  return { success: true, id };
}

export type MissionKanbanUpdate = {
  id: string;
  kanban_status: MissionKanbanStatus;
  kanban_order: number;
};

export async function updateMissionsKanban(
  updates: MissionKanbanUpdate[],
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (updates.length === 0) return { success: true };

  for (const update of updates) {
    if (!update.id || !KANBAN_STATUSES.has(update.kanban_status)) {
      return { success: false, error: "Mise à jour Kanban invalide." };
    }
    if (!Number.isInteger(update.kanban_order) || update.kanban_order < 0) {
      return { success: false, error: "Ordre Kanban invalide." };
    }
  }

  const supabase = await createClient();
  const results = await Promise.all(
    updates.map((update) =>
      supabase
        .from("mission")
        .update({
          kanban_status: update.kanban_status,
          kanban_order: update.kanban_order,
        })
        .eq("id", update.id)
        .select("id")
        .maybeSingle(),
    ),
  );

  for (const result of results) {
    if (result.error || !result.data) {
      console.error("updateMissionsKanban:", result.error);
      return {
        success: false,
        error: result.error
          ? `Impossible de mettre à jour le Kanban : ${result.error.message}`
          : "Mission introuvable.",
      };
    }
  }

  revalidatePath("/missions");
  for (const update of updates) {
    revalidatePath(`/missions/${update.id}`);
  }
  return { success: true };
}

/**
 * Archive une mission (`kanban_status = archivee`) — pas de DELETE SQL.
 * `archived_at` est géré par le trigger DB.
 */
export async function archiveMission(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id.trim()) {
    return { success: false, error: "Identifiant invalide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission")
    .update({ kanban_status: "archivee" })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("archiveMission:", error);
    return {
      success: false,
      error: error
        ? `Impossible d'archiver la mission : ${error.message}`
        : "Mission introuvable.",
    };
  }

  revalidatePath("/missions");
  revalidatePath(`/missions/${id}`);
  return { success: true };
}

export async function fetchMissionOpportunityOptions(): Promise<
  | { success: true; options: MissionOpportunityOption[] }
  | { success: false; error: string; options: [] }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error, options: [] };
  }
  try {
    const options = await listMissionOpportunityOptions();
    return { success: true, options };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger les opportunités.";
    return { success: false, error: message, options: [] };
  }
}

export async function fetchMissionsListFilterOptions(): Promise<
  | {
      success: true;
      collaborators: CollaboratorListItem[];
      clients: ClientOption[];
      categories: CategoryItem[];
    }
  | {
      success: false;
      error: string;
      collaborators: [];
      clients: [];
      categories: [];
    }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return {
      success: false,
      error: auth.error,
      collaborators: [],
      clients: [],
      categories: [],
    };
  }
  try {
    const [collaborators, clients, categories] = await Promise.all([
      listCollaborators({ includeAvatar: false }),
      listClientOptions(),
      listBusinessCategories(),
    ]);
    return { success: true, collaborators, clients, categories };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger les options de filtres.";
    return {
      success: false,
      error: message,
      collaborators: [],
      clients: [],
      categories: [],
    };
  }
}

/**
 * Vague 2 kanban : colonnes closes (terminé / archivé), mêmes filtres hors statuts.
 */
export async function fetchMissionsClosedBoard(
  filters: MissionsListFilters,
): Promise<
  | { success: true; missions: MissionListItem[]; totalCount: number }
  | { success: false; error: string; missions: []; totalCount: 0 }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return {
      success: false,
      error: auth.error,
      missions: [],
      totalCount: 0,
    };
  }
  try {
    const result = await listMissionsPage({
      ...filters,
      view: "kanban",
      page: 1,
      statuses: [...MISSION_CLOSED_KANBAN_STATUSES],
    });
    return {
      success: true,
      missions: result.missions,
      totalCount: result.totalCount,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger les missions closes.";
    return {
      success: false,
      error: message,
      missions: [],
      totalCount: 0,
    };
  }
}

/**
 * Missions liées à une opportunité (onglet fiche — chargé à la demande).
 */
export async function fetchMissionsForOpportunity(
  opportunityId: string,
): Promise<
  | { success: true; missions: MissionListItem[] }
  | { success: false; error: string; missions: [] }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error, missions: [] };
  }
  if (!isUuid(opportunityId)) {
    return {
      success: false,
      error: "Identifiant invalide.",
      missions: [],
    };
  }
  try {
    const missions = await listMissionsByOpportunityId(opportunityId);
    return { success: true, missions };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger les missions.";
    return { success: false, error: message, missions: [] };
  }
}
