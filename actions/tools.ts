"use server";

import { revalidatePath } from "next/cache";
import { deleteVaultSecret } from "@/actions/vault";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { formCategoryIds, formOptional, formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";

export type ToolActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<"tool_name" | "url", string>>;
    };

export type DeleteToolResult =
  | { success: true }
  | { success: false; error: string };

function revalidateTools(id?: string) {
  revalidatePath("/tools");
  if (id) revalidatePath(`/tools/${id}`);
}

async function syncToolCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  toolId: string,
  categoryIds: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const uniqueIds = [...new Set(categoryIds)];

  const { data: existingRows, error: existingError } = await supabase
    .from("tool_category")
    .select("category_id")
    .eq("tool_id", toolId);

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
      .from("tool_category")
      .delete()
      .eq("tool_id", toolId)
      .in("category_id", toRemove);
    if (error) {
      return {
        success: false,
        error: `Impossible de retirer des catégories : ${error.message}`,
      };
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("tool_category").insert(
      toAdd.map((category_id) => ({ tool_id: toolId, category_id })),
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

function validateIdentification(formData: FormData): {
  tool_name: string;
  url: string;
  description: string | null;
  fieldErrors: NonNullable<
    Extract<ToolActionResult, { success: false }>["fieldErrors"]
  >;
} {
  const tool_name = formText(formData, "tool_name");
  const url = formText(formData, "url");
  const description = formOptional(formData, "description");

  const fieldErrors: NonNullable<
    Extract<ToolActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!tool_name) {
    fieldErrors.tool_name = "Le nom de l'outil est obligatoire.";
  }
  if (!url) {
    fieldErrors.url = "L'URL est obligatoire.";
  }

  return { tool_name, url, description, fieldErrors };
}

/** Création (identification : tool_name, url, catégories, description). */
export async function createToolRecord(
  formData: FormData,
): Promise<ToolActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const { tool_name, url, description, fieldErrors } =
    validateIdentification(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool")
    .insert({ tool_name, url, description })
    .select("id")
    .single();

  if (error) {
    console.error("createToolRecord:", error);
    return {
      success: false,
      error: `Impossible de créer l'outil : ${error.message}`,
    };
  }

  const sync = await syncToolCategories(
    supabase,
    data.id,
    formCategoryIds(formData),
  );
  if (!sync.success) {
    return { success: false, error: sync.error };
  }

  revalidateTools(data.id);
  return { success: true, id: data.id };
}

/** Mise à jour (édition — sauvegarde unique). */
export async function updateToolRecord(
  id: string,
  formData: FormData,
): Promise<ToolActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant outil manquant." };
  }

  const { tool_name, url, description, fieldErrors } =
    validateIdentification(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool")
    .update({ tool_name, url, description })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("updateToolRecord:", error);
    return {
      success: false,
      error: error
        ? `Impossible de mettre à jour l'outil : ${error.message}`
        : "Outil introuvable.",
    };
  }

  const sync = await syncToolCategories(
    supabase,
    id,
    formCategoryIds(formData),
  );
  if (!sync.success) {
    return { success: false, error: sync.error };
  }

  revalidateTools(id);
  return { success: true, id };
}

/** Suppression d'un outil + cascade accès (Vault) et abonnements/tarifs. */
export async function deleteToolRecord(id: string): Promise<DeleteToolResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!id) {
    return { success: false, error: "Identifiant outil manquant." };
  }

  const supabase = await createClient();

  const { data: accesses, error: accessesErr } = await supabase
    .from("tool_access")
    .select("id, vault_secret_id")
    .eq("tool_id", id);

  if (accessesErr) {
    return {
      success: false,
      error: `Impossible de lire les accès : ${accessesErr.message}`,
    };
  }

  for (const access of accesses ?? []) {
    const vaultRef = String(access.vault_secret_id ?? "").trim();
    if (vaultRef) {
      const delVault = await deleteVaultSecret(vaultRef);
      if (!delVault.success) {
        return { success: false, error: delVault.error };
      }
    }
  }

  if ((accesses ?? []).length > 0) {
    const { error: delAccessErr } = await supabase
      .from("tool_access")
      .delete()
      .eq("tool_id", id);
    if (delAccessErr) {
      return {
        success: false,
        error: `Impossible de supprimer les accès : ${delAccessErr.message}`,
      };
    }
  }

  const { data: subscriptions, error: subsErr } = await supabase
    .from("tool_subscription")
    .select("id")
    .eq("tool_id", id);

  if (subsErr) {
    return {
      success: false,
      error: `Impossible de lire les abonnements : ${subsErr.message}`,
    };
  }

  const subscriptionIds = (subscriptions ?? []).map((row) => row.id as string);
  if (subscriptionIds.length > 0) {
    const { error: pricesErr } = await supabase
      .from("tool_subscription_price")
      .delete()
      .in("tool_subscription_id", subscriptionIds);
    if (pricesErr) {
      return {
        success: false,
        error: `Impossible de supprimer les tarifs : ${pricesErr.message}`,
      };
    }

    const { error: delSubsErr } = await supabase
      .from("tool_subscription")
      .delete()
      .eq("tool_id", id);
    if (delSubsErr) {
      return {
        success: false,
        error: `Impossible de supprimer les abonnements : ${delSubsErr.message}`,
      };
    }
  }

  const { error } = await supabase.from("tool").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Cet outil est encore lié à d'autres entités. Retirez ces liens avant de le supprimer.",
      };
    }
    console.error("deleteToolRecord:", error);
    return {
      success: false,
      error: `Impossible de supprimer l'outil : ${error.message}`,
    };
  }

  revalidateTools(id);
  return { success: true };
}
