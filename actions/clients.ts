"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { uploadClientLogo } from "@/lib/clients/visuals";
import {
  formBool,
  formCategoryIds,
  formFile,
  formOptional,
  formText,
} from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";

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

  const client_name = formText(formData, "client_name");
  const website = formText(formData, "website");
  const main_collaborator_id = formText(formData, "main_collaborator_id");
  const logoFile = formFile(formData, "logo");
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

  let logo_id: string | null = null;
  if (logoFile) {
    try {
      logo_id = (await uploadClientLogo(logoFile)).documentId;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'uploader le logo.",
        fieldErrors: { logo: "Image invalide." },
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .insert({
      client_name,
      website,
      main_collaborator_id,
      logo_id,
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

  const client_name = formText(formData, "client_name");
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

  const notes = formOptional(formData, "notes");
  let logo_id = existing.logo_id as string | null;
  const logoFile = formFile(formData, "logo");
  if (formBool(formData, "clear_logo", false)) {
    logo_id = null;
  } else if (logoFile) {
    try {
      logo_id = (await uploadClientLogo(logoFile)).documentId;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'uploader le logo.",
        fieldErrors: { logo: "Image invalide." },
      };
    }
  }

  const payload: Record<string, unknown> = {
    client_name,
    website,
    main_collaborator_id,
    address_street: formOptional(formData, "address_street"),
    address_city: formOptional(formData, "address_city"),
    address_zip: formOptional(formData, "address_zip"),
    drive_link: formOptional(formData, "drive_link"),
    notes,
    logo_id,
    is_active: formBool(formData, "is_active", true),
  };

  if (existing.notes !== notes) {
    payload.notes_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("client")
    .update(payload)
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
