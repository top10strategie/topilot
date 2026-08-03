"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { uploadContactProfilePicture } from "@/lib/clients/visuals";
import { formBool, formFile, formOptional, formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";

export type ContactActionResult =
  | { success: true; id: string; client_id: string; is_main: boolean }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<
        Record<"first_name" | "last_name" | "email_address" | "avatar", string>
      >;
    };

export type DeleteContactResult =
  | { success: true }
  | { success: false; error: string };

function revalidateClient(clientId: string) {
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function createContactClient(
  formData: FormData,
): Promise<ContactActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const client_id = formText(formData, "client_id");
  const first_name = formText(formData, "first_name");
  const last_name = formText(formData, "last_name");
  const fieldErrors: NonNullable<
    Extract<ContactActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!client_id) {
    return { success: false, error: "Identifiant client manquant." };
  }
  if (!first_name) fieldErrors.first_name = "Le prénom est obligatoire.";
  if (!last_name) fieldErrors.last_name = "Le nom est obligatoire.";
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  let profile_picture_id: string | null = null;
  const avatar = formFile(formData, "avatar");
  if (avatar) {
    try {
      profile_picture_id = (await uploadContactProfilePicture(avatar))
        .documentId;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'uploader la photo.",
        fieldErrors: { avatar: "Image invalide." },
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_client")
    .insert({
      client_id,
      first_name,
      last_name,
      job_title: formOptional(formData, "job_title"),
      email_address: formOptional(formData, "email_address"),
      phone_number: formOptional(formData, "phone_number"),
      notes: formOptional(formData, "notes"),
      is_main: formBool(formData, "is_main", false),
      profile_picture_id,
    })
    .select("id, client_id, is_main")
    .single();

  if (error) {
    console.error("createContactClient:", error);
    return {
      success: false,
      error: error.message.includes("contact principal")
        ? error.message
        : `Impossible de créer le contact : ${error.message}`,
    };
  }

  revalidateClient(data.client_id);
  return {
    success: true,
    id: data.id,
    client_id: data.client_id,
    is_main: data.is_main,
  };
}

export async function updateContactClient(
  id: string,
  formData: FormData,
): Promise<ContactActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant contact manquant." };
  }

  const client_id = formText(formData, "client_id");
  const first_name = formText(formData, "first_name");
  const last_name = formText(formData, "last_name");
  const fieldErrors: NonNullable<
    Extract<ContactActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!client_id) {
    return { success: false, error: "Identifiant client manquant." };
  }
  if (!first_name) fieldErrors.first_name = "Le prénom est obligatoire.";
  if (!last_name) fieldErrors.last_name = "Le nom est obligatoire.";
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("contact_client")
    .select("id, client_id, profile_picture_id, notes")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError
        ? `Impossible de lire le contact : ${existingError.message}`
        : "Contact introuvable.",
    };
  }

  let profile_picture_id = existing.profile_picture_id as string | null;
  const avatar = formFile(formData, "avatar");
  if (formBool(formData, "clear_avatar", false)) {
    profile_picture_id = null;
  } else if (avatar) {
    try {
      profile_picture_id = (await uploadContactProfilePicture(avatar))
        .documentId;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'uploader la photo.",
        fieldErrors: { avatar: "Image invalide." },
      };
    }
  }

  const notes = formOptional(formData, "notes");
  const payload: Record<string, unknown> = {
    first_name,
    last_name,
    job_title: formOptional(formData, "job_title"),
    email_address: formOptional(formData, "email_address"),
    phone_number: formOptional(formData, "phone_number"),
    notes,
    is_main: formBool(formData, "is_main", false),
    profile_picture_id,
  };
  if (existing.notes !== notes) {
    payload.notes_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("contact_client")
    .update(payload)
    .eq("id", id)
    .select("id, client_id, is_main")
    .maybeSingle();

  if (error || !data) {
    console.error("updateContactClient:", error);
    return {
      success: false,
      error: error
        ? error.message.includes("contact principal")
          ? error.message
          : `Impossible de mettre à jour le contact : ${error.message}`
        : "Contact introuvable.",
    };
  }

  revalidateClient(data.client_id);
  return {
    success: true,
    id: data.id,
    client_id: data.client_id,
    is_main: data.is_main,
  };
}

export async function deleteContactClient(
  id: string,
): Promise<DeleteContactResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant contact manquant." };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("contact_client")
    .select("id, client_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError
        ? `Impossible de lire le contact : ${existingError.message}`
        : "Contact introuvable.",
    };
  }

  const { error } = await supabase.from("contact_client").delete().eq("id", id);
  if (error) {
    console.error("deleteContactClient:", error);
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Ce contact est encore référencé. Retirez les liens avant de le supprimer.",
      };
    }
    return {
      success: false,
      error: `Impossible de supprimer le contact : ${error.message}`,
    };
  }

  revalidateClient(existing.client_id);
  return { success: true };
}
