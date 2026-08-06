"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { todayParisYmd } from "@/lib/dates/paris";
import { formCategoryIds, formOptional, formText } from "@/lib/form-data";
import type {
  OpportunityKanbanStatus,
  OpportunityPriority,
} from "@/lib/opportunities/types";
import { createClient } from "@/lib/supabase/server";

const CLOSED_KANBAN_STATUSES = new Set<OpportunityKanbanStatus>([
  "gagne",
  "perdue",
]);

/**
 * Filet app à la clôture (complète le trigger DB) :
 * - `end_at` vide → aujourd’hui Paris
 * - `closed_at` posé si transition vers gagne/perdue
 */
function applyClosureDates(
  payload: Record<string, unknown>,
  kanbanStatus: OpportunityKanbanStatus,
  endAt: string | null | undefined,
  opts?: { isStatusTransitionToClosed?: boolean },
) {
  if (!CLOSED_KANBAN_STATUSES.has(kanbanStatus)) return;
  const today = todayParisYmd();
  if (!endAt) {
    payload.end_at = today;
  }
  if (opts?.isStatusTransitionToClosed) {
    payload.closed_at = today;
  }
}

export type OpportunityActionResult =
  | {
      success: true;
      id: string;
      kanban_status?: OpportunityKanbanStatus;
      probability_confirmation?: number;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<
        Record<
          | "opportunity_name"
          | "client_id"
          | "contact_client_id"
          | "collaborator_id"
          | "due_date_at"
          | "end_at"
          | "price"
          | "probability_confirmation"
          | "priority"
          | "kanban_status"
          | "category_ids"
          | "notes"
          | "action"
          | "source"
          | "last_meeting_at",
          string
        >
      >;
    };

const KANBAN_STATUSES = new Set<OpportunityKanbanStatus>([
  "suspect",
  "prospect",
  "besoin_specifie",
  "proposition_envoyee",
  "gagne",
  "perdue",
]);

const PRIORITIES = new Set<OpportunityPriority>([
  "faible",
  "normal",
  "urgente",
  "prioritaire",
]);

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

function revalidateOpportunities(id?: string) {
  revalidatePath("/opportunities");
  if (id) {
    revalidatePath(`/opportunities/${id}`);
  }
  revalidatePath("/clients");
}

async function syncOpportunityCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opportunityId: string,
  categoryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const uniqueIds = [...new Set(categoryIds)];

  const { data: existingRows, error: existingError } = await supabase
    .from("opportunity_category")
    .select("category_id")
    .eq("opportunity_id", opportunityId);

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
  const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));
  const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("opportunity_category")
      .delete()
      .eq("opportunity_id", opportunityId)
      .in("category_id", toRemove);
    if (error) {
      return {
        success: false,
        error: `Impossible de retirer des catégories : ${error.message}`,
      };
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("opportunity_category").insert(
      toAdd.map((category_id) => ({
        opportunity_id: opportunityId,
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

/** Création minimale (identification). Le trigger pose statut + proba. */
export async function createOpportunityRecord(
  formData: FormData,
): Promise<OpportunityActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const opportunity_name = formText(formData, "opportunity_name");
  const client_id = formText(formData, "client_id");
  const contact_client_id = formOptional(formData, "contact_client_id");
  const collaborator_id = formText(formData, "collaborator_id");
  const last_meeting_at = formOptional(formData, "last_meeting_at");
  const due_date_at = formOptional(formData, "due_date_at");
  const end_at = formOptional(formData, "end_at");

  const fieldErrors: NonNullable<
    Extract<OpportunityActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!opportunity_name) {
    fieldErrors.opportunity_name = "Le titre est obligatoire.";
  }
  if (!client_id) {
    fieldErrors.client_id = "Le client est obligatoire.";
  }
  if (!collaborator_id) {
    fieldErrors.collaborator_id =
      "Le responsable opportunité est obligatoire.";
  }
  if (!due_date_at && !end_at) {
    fieldErrors.due_date_at =
      "Indiquez au moins une échéance ou une date de clôture.";
    fieldErrors.end_at =
      "Indiquez au moins une échéance ou une date de clôture.";
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
    .from("opportunity")
    .insert({
      opportunity_name,
      client_id,
      contact_client_id,
      collaborator_id,
      last_meeting_at,
      due_date_at,
      end_at,
      // Placeholder : le trigger BEFORE INSERT écrase toujours kanban_status.
      kanban_status: "suspect",
    })
    .select("id, kanban_status, probability_confirmation")
    .single();

  if (error) {
    console.error("createOpportunityRecord:", error);
    return {
      success: false,
      error: `Impossible de créer l'opportunité : ${error.message}`,
    };
  }

  revalidateOpportunities(data.id);
  return {
    success: true,
    id: data.id as string,
    kanban_status: data.kanban_status as OpportunityKanbanStatus,
    probability_confirmation: Number(data.probability_confirmation),
  };
}

/** Mise à jour complète (édition / complément après création). */
export async function updateOpportunityRecord(
  id: string,
  formData: FormData,
): Promise<OpportunityActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant opportunité manquant." };
  }

  const opportunity_name = formText(formData, "opportunity_name");
  const client_id = formText(formData, "client_id");
  const contact_client_id = formOptional(formData, "contact_client_id");
  const collaborator_id = formText(formData, "collaborator_id");
  const last_meeting_at = formOptional(formData, "last_meeting_at");
  const due_date_at = formOptional(formData, "due_date_at");
  const end_at = formOptional(formData, "end_at");
  const action = formOptional(formData, "action");
  const source = formOptional(formData, "source");
  const priorityRaw = formText(formData, "priority");
  const kanbanRaw = formText(formData, "kanban_status");
  const price = formOptionalNumber(formData, "price");
  const probability = formOptionalNumber(formData, "probability_confirmation");

  const fieldErrors: NonNullable<
    Extract<OpportunityActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!opportunity_name) {
    fieldErrors.opportunity_name = "Le titre est obligatoire.";
  }
  if (!client_id) {
    fieldErrors.client_id = "Le client est obligatoire.";
  }
  if (!collaborator_id) {
    fieldErrors.collaborator_id =
      "Le responsable opportunité est obligatoire.";
  }
  if (!due_date_at && !end_at) {
    fieldErrors.due_date_at =
      "Indiquez au moins une échéance ou une date de clôture.";
    fieldErrors.end_at =
      "Indiquez au moins une échéance ou une date de clôture.";
  }
  if (price === undefined) {
    fieldErrors.price = "Montant invalide.";
  }
  if (
    probability === undefined ||
    (probability != null && (probability < 0 || probability > 100))
  ) {
    fieldErrors.probability_confirmation =
      "La probabilité doit être entre 0 et 100.";
  }
  if (!PRIORITIES.has(priorityRaw as OpportunityPriority)) {
    fieldErrors.priority = "Urgence invalide.";
  }
  if (!KANBAN_STATUSES.has(kanbanRaw as OpportunityKanbanStatus)) {
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
    .from("opportunity")
    .select("id, notes, kanban_status")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError
        ? `Impossible de lire l'opportunité : ${existingError.message}`
        : "Opportunité introuvable.",
    };
  }

  const notes = formData.has("notes")
    ? formOptional(formData, "notes")
    : undefined;

  const payload: Record<string, unknown> = {
    opportunity_name,
    client_id,
    contact_client_id,
    collaborator_id,
    last_meeting_at,
    due_date_at,
    end_at,
    action,
    source,
    priority: priorityRaw,
    kanban_status: kanbanRaw,
    price,
    probability_confirmation: probability ?? 10,
  };

  applyClosureDates(payload, kanbanRaw as OpportunityKanbanStatus, end_at, {
    isStatusTransitionToClosed:
      existing.kanban_status !== kanbanRaw &&
      CLOSED_KANBAN_STATUSES.has(kanbanRaw as OpportunityKanbanStatus),
  });

  if (notes !== undefined) {
    payload.notes = notes;
    if (existing.notes !== notes) {
      payload.notes_updated_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("opportunity")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateOpportunityRecord:", error);
    return {
      success: false,
      error: error
        ? `Impossible de mettre à jour l'opportunité : ${error.message}`
        : "Opportunité introuvable.",
    };
  }

  const sync = await syncOpportunityCategories(
    supabase,
    id,
    formCategoryIds(formData),
  );
  if (!sync.success) {
    return { success: false, error: sync.error };
  }

  revalidateOpportunities(id);
  return { success: true, id };
}

export type OpportunityKanbanUpdate = {
  id: string;
  kanban_status: OpportunityKanbanStatus;
  kanban_order: number;
};

/**
 * Mise à jour batch des positions Kanban (statut + ordre).
 * Le trigger DB gère proba / is_active au changement de statut.
 */
export async function updateOpportunitiesKanban(
  updates: OpportunityKanbanUpdate[],
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (updates.length === 0) {
    return { success: true };
  }

  for (const update of updates) {
    if (!update.id || !KANBAN_STATUSES.has(update.kanban_status)) {
      return { success: false, error: "Mise à jour Kanban invalide." };
    }
    if (!Number.isInteger(update.kanban_order) || update.kanban_order < 0) {
      return { success: false, error: "Ordre Kanban invalide." };
    }
  }

  const supabase = await createClient();

  const closedIds = updates
    .filter((u) => CLOSED_KANBAN_STATUSES.has(u.kanban_status))
    .map((u) => u.id);
  const existingById = new Map<
    string,
    { end_at: string | null; kanban_status: OpportunityKanbanStatus }
  >();
  if (closedIds.length > 0) {
    const { data: rows, error: fetchError } = await supabase
      .from("opportunity")
      .select("id, end_at, kanban_status")
      .in("id", closedIds);
    if (fetchError) {
      console.error("updateOpportunitiesKanban fetch:", fetchError);
      return {
        success: false,
        error: `Impossible de lire les opportunités : ${fetchError.message}`,
      };
    }
    for (const row of rows ?? []) {
      existingById.set(row.id as string, {
        end_at: (row.end_at as string | null) ?? null,
        kanban_status: row.kanban_status as OpportunityKanbanStatus,
      });
    }
  }

  const results = await Promise.all(
    updates.map((update) => {
      const payload: Record<string, unknown> = {
        kanban_status: update.kanban_status,
        kanban_order: update.kanban_order,
      };
      if (CLOSED_KANBAN_STATUSES.has(update.kanban_status)) {
        const existing = existingById.get(update.id);
        applyClosureDates(
          payload,
          update.kanban_status,
          existing?.end_at,
          {
            isStatusTransitionToClosed:
              existing?.kanban_status !== update.kanban_status,
          },
        );
      }
      return supabase
        .from("opportunity")
        .update(payload)
        .eq("id", update.id)
        .select("id")
        .maybeSingle();
    }),
  );

  for (const result of results) {
    if (result.error || !result.data) {
      console.error("updateOpportunitiesKanban:", result.error);
      return {
        success: false,
        error: result.error
          ? `Impossible de mettre à jour le Kanban : ${result.error.message}`
          : "Opportunité introuvable.",
      };
    }
  }

  revalidateOpportunities();
  for (const update of updates) {
    revalidatePath(`/opportunities/${update.id}`);
  }
  return { success: true };
}

/**
 * Passe une opportunité en statut `perdue` (message métier « perte »).
 */
export async function markOpportunityAsLost(
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
  const { data: existing, error: existingError } = await supabase
    .from("opportunity")
    .select("id, end_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError
        ? `Impossible de lire l'opportunité : ${existingError.message}`
        : "Opportunité introuvable.",
    };
  }

  const payload: Record<string, unknown> = { kanban_status: "perdue" };
  applyClosureDates(
    payload,
    "perdue",
    (existing.end_at as string | null) ?? null,
    { isStatusTransitionToClosed: true },
  );

  const { data, error } = await supabase
    .from("opportunity")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("markOpportunityAsLost:", error);
    return {
      success: false,
      error: error
        ? `Impossible de marquer l'opportunité comme perdue : ${error.message}`
        : "Opportunité introuvable.",
    };
  }

  revalidateOpportunities(id);
  return { success: true };
}
