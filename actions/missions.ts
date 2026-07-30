"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import type {
  MissionKanbanStatus,
  MissionScope,
} from "@/lib/missions/types";
import { createClient } from "@/lib/supabase/server";

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

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formOptional(formData: FormData, key: string): string | null {
  const value = formText(formData, key);
  return value.length > 0 ? value : null;
}

function formCategoryIds(formData: FormData): string[] {
  return formData
    .getAll("category_ids")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

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
  const notes = formOptional(formData, "notes");
  const start_at = formOptional(formData, "start_at");
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
    notes,
    start_at,
    end_at,
    estimated_charge: estimated,
    kanban_status: kanbanRaw,
  };

  if (existing.notes !== notes) {
    payload.notes_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("mission")
    .update(payload)
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
