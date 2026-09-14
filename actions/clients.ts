"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { formatClientName } from "@/lib/clients/labels";
import { CLIENT_LOGO_TYPE_LABEL } from "@/lib/clients/visuals";
import { assertVisualDocumentOfType } from "@/lib/documents/visual-document";
import {
  formBool,
  formCategoryIds,
  formOptional,
  formText,
} from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type ClientActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<
        Record<
          | "client_name"
          | "website"
          | "main_collaborator_id"
          | "category_ids"
          | "notes"
          | "drive_link"
          | "logo",
          string
        >
      >;
    };

async function resolveLogoIdFromForm(
  formData: FormData,
  currentLogoId: string | null,
): Promise<
  | { success: true; logo_id: string | null }
  | { success: false; error: string; fieldError?: string }
> {
  if (formBool(formData, "clear_logo", false)) {
    return { success: true, logo_id: null };
  }

  const logoId = formText(formData, "logo_id");
  if (!logoId) {
    return { success: true, logo_id: currentLogoId };
  }
  if (!isUuid(logoId)) {
    return {
      success: false,
      error: "Logo invalide.",
      fieldError: "Document invalide.",
    };
  }

  const check = await assertVisualDocumentOfType(
    logoId,
    CLIENT_LOGO_TYPE_LABEL,
  );
  if (!check.ok) {
    return { success: false, error: check.error, fieldError: check.error };
  }
  return { success: true, logo_id: logoId };
}

function revalidateClients(id?: string) {
  revalidatePath("/clients");
  if (id) {
    revalidatePath(`/clients/${id}`);
  }
}

async function syncClientCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  categoryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const uniqueIds = [...new Set(categoryIds)];

  const { data: existingRows, error: existingError } = await supabase
    .from("client_category")
    .select("category_id")
    .eq("client_id", clientId);

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
      .from("client_category")
      .delete()
      .eq("client_id", clientId)
      .in("category_id", toRemove);
    if (error) {
      return {
        success: false,
        error: `Impossible de retirer des catégories : ${error.message}`,
      };
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("client_category").insert(
      toAdd.map((category_id) => ({ client_id: clientId, category_id })),
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
export async function createClientRecord(
  formData: FormData,
): Promise<ClientActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const client_name = formatClientName(formText(formData, "client_name"));
  const website = formText(formData, "website");
  const main_collaborator_id = formText(formData, "main_collaborator_id");
  const fieldErrors: NonNullable<
    Extract<ClientActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!client_name) fieldErrors.client_name = "Le nom du client est obligatoire.";
  if (!website) fieldErrors.website = "Le site web est obligatoire.";
  if (!main_collaborator_id) {
    fieldErrors.main_collaborator_id = "Le responsable client est obligatoire.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const logoResult = await resolveLogoIdFromForm(formData, null);
  if (!logoResult.success) {
    return {
      success: false,
      error: logoResult.error,
      fieldErrors: { logo: logoResult.fieldError },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .insert({
      client_name,
      website,
      main_collaborator_id,
      logo_id: logoResult.logo_id,
      facilitator: formBool(formData, "facilitator", false),
    })
    .select("id")
    .single();

  if (error) {
    console.error("createClientRecord:", error);
    return {
      success: false,
      error: `Impossible de créer le client : ${error.message}`,
    };
  }

  revalidateClients(data.id);
  return { success: true, id: data.id };
}

/** Mise à jour complète (édition / complément après création). */
export async function updateClientRecord(
  id: string,
  formData: FormData,
): Promise<ClientActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant client manquant." };
  }

  const client_name = formatClientName(formText(formData, "client_name"));
  const website = formText(formData, "website");
  const main_collaborator_id = formText(formData, "main_collaborator_id");
  const fieldErrors: NonNullable<
    Extract<ClientActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!client_name) fieldErrors.client_name = "Le nom du client est obligatoire.";
  if (!website) fieldErrors.website = "Le site web est obligatoire.";
  if (!main_collaborator_id) {
    fieldErrors.main_collaborator_id = "Le responsable client est obligatoire.";
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
    .from("client")
    .select("id, notes, logo_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError
        ? `Impossible de lire le client : ${existingError.message}`
        : "Client introuvable.",
    };
  }

  const notes = formData.has("notes")
    ? formOptional(formData, "notes")
    : undefined;
  const logoResult = await resolveLogoIdFromForm(
    formData,
    existing.logo_id as string | null,
  );
  if (!logoResult.success) {
    return {
      success: false,
      error: logoResult.error,
      fieldErrors: { logo: logoResult.fieldError },
    };
  }
  const logo_id = logoResult.logo_id;

  const payload: Record<string, unknown> = {
    client_name,
    website,
    main_collaborator_id,
    address_street: formOptional(formData, "address_street"),
    address_city: formOptional(formData, "address_city"),
    address_zip: formOptional(formData, "address_zip"),
    address_country: formText(formData, "address_country") || "France",
    drive_link: formOptional(formData, "drive_link"),
    logo_id,
    is_active: formBool(formData, "is_active", true),
    facilitator: formBool(formData, "facilitator", false),
  };

  if (notes !== undefined) {
    payload.notes = notes;
    if (existing.notes !== notes) {
      payload.notes_updated_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("client")
    .update(payload as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateClientRecord:", error);
    return {
      success: false,
      error: error
        ? `Impossible de mettre à jour le client : ${error.message}`
        : "Client introuvable.",
    };
  }

  const sync = await syncClientCategories(
    supabase,
    id,
    formCategoryIds(formData),
  );
  if (!sync.success) {
    return { success: false, error: sync.error };
  }

  revalidateClients(id);
  return { success: true, id };
}

/**
 * Désactive un client (`is_active = false`) — pas de DELETE SQL.
 */
export async function deactivateClient(
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
    .from("client")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("deactivateClient:", error);
    return {
      success: false,
      error: error
        ? `Impossible de désactiver le client : ${error.message}`
        : "Client introuvable.",
    };
  }

  revalidateClients(id);
  return { success: true };
}
