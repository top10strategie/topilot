"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";

export type DocumentTypeActionResult =
  | { success: true; id: string; label: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<"label", string>>;
    };

export type DeleteDocumentTypeResult =
  | { success: true }
  | { success: false; error: string };

function normalizeLabel(raw: string): {
  label: string;
  fieldErrors: Partial<Record<"label", string>>;
} {
  const label = raw.trim();
  const fieldErrors: Partial<Record<"label", string>> = {};
  if (!label) {
    fieldErrors.label = "Le titre est obligatoire.";
  } else if (label.length > 120) {
    fieldErrors.label = "Le titre ne peut pas dépasser 120 caractères.";
  }
  return { label, fieldErrors };
}

function revalidateAdmin() {
  revalidatePath("/administration");
}

export async function createDocumentType(
  labelInput: string,
): Promise<DocumentTypeActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const { label, fieldErrors } = normalizeLabel(labelInput);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_type")
    .insert({ label, is_active: true })
    .select("id, label")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Un type documentaire porte déjà ce nom.",
        fieldErrors: { label: "Ce titre est déjà utilisé." },
      };
    }
    console.error("createDocumentType:", error);
    return {
      success: false,
      error: `Impossible de créer le type : ${error.message}`,
    };
  }

  revalidateAdmin();
  return { success: true, id: data.id, label: data.label };
}

export async function updateDocumentType(
  id: string,
  labelInput: string,
): Promise<DocumentTypeActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant de type manquant." };
  }

  const { label, fieldErrors } = normalizeLabel(labelInput);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_type")
    .update({ label })
    .eq("id", id)
    .select("id, label")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Un type documentaire porte déjà ce nom.",
        fieldErrors: { label: "Ce titre est déjà utilisé." },
      };
    }
    console.error("updateDocumentType:", error);
    return {
      success: false,
      error: `Impossible de mettre à jour le type : ${error.message}`,
    };
  }

  if (!data) {
    return { success: false, error: "Type documentaire introuvable." };
  }

  revalidateAdmin();
  return { success: true, id: data.id, label: data.label };
}

export async function deleteDocumentType(
  id: string,
): Promise<DeleteDocumentTypeResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant de type manquant." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("document_type").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Ce type est encore utilisé par des documents (ex. « Photo de profil »). Supprimez ou reclassez ces documents avant.",
      };
    }
    console.error("deleteDocumentType:", error);
    return {
      success: false,
      error: `Impossible de supprimer le type : ${error.message}`,
    };
  }

  revalidateAdmin();
  return { success: true };
}
