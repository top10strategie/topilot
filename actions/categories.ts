"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";

export type CategoryActionResult =
  | { success: true; id: string; label: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<"label", string>>;
    };

export type DeleteCategoryResult =
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
  revalidatePath("/top10");
}

export async function createCategory(
  labelInput: string,
): Promise<CategoryActionResult> {
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
    .from("category")
    .insert({ label })
    .select("id, label")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Une catégorie porte déjà ce nom.",
        fieldErrors: { label: "Ce titre est déjà utilisé." },
      };
    }
    console.error("createCategory:", error);
    return {
      success: false,
      error: `Impossible de créer la catégorie : ${error.message}`,
    };
  }

  revalidateAdmin();
  return { success: true, id: data.id, label: data.label };
}

export async function updateCategory(
  id: string,
  labelInput: string,
): Promise<CategoryActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant de catégorie manquant." };
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
    .from("category")
    .update({ label })
    .eq("id", id)
    .select("id, label")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Une catégorie porte déjà ce nom.",
        fieldErrors: { label: "Ce titre est déjà utilisé." },
      };
    }
    console.error("updateCategory:", error);
    return {
      success: false,
      error: `Impossible de mettre à jour la catégorie : ${error.message}`,
    };
  }

  if (!data) {
    return { success: false, error: "Catégorie introuvable." };
  }

  revalidateAdmin();
  return { success: true, id: data.id, label: data.label };
}

export async function deleteCategory(
  id: string,
): Promise<DeleteCategoryResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant de catégorie manquant." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("category").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Cette catégorie est encore utilisée. Retirez-la des entités liées avant de la supprimer.",
      };
    }
    console.error("deleteCategory:", error);
    return {
      success: false,
      error: `Impossible de supprimer la catégorie : ${error.message}`,
    };
  }

  revalidateAdmin();
  return { success: true };
}
