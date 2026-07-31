"use server";

import { revalidatePath } from "next/cache";
import {
  createVaultSecret,
  deleteVaultSecret,
  updateVaultSecret,
} from "@/actions/vault";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type ToolAccessActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type DeleteToolAccessResult =
  | { success: true }
  | { success: false; error: string };

const ACCESS_SELECT =
  "id, tool_id, client_id, label, identifier, vault_secret_id, is_private, created_at, updated_at";

function revalidateTool(toolId: string) {
  revalidatePath("/tools");
  revalidatePath(`/tools/${toolId}`);
}

/**
 * Vault puis insertion `tool_access`. En cas d'échec d'insert, le secret orphelin
 * est nettoyé.
 */
export async function createToolAccessRecord(input: {
  tool_id: string;
  label: string;
  identifier: string;
  password: string;
  client_id?: string | null;
  is_private?: boolean;
}): Promise<ToolAccessActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const toolId = input.tool_id.trim();
  if (!isUuid(toolId)) {
    return { success: false, error: "Outil invalide." };
  }

  const label = input.label.trim();
  const identifier = input.identifier.trim();
  const password = input.password;
  if (!label || !identifier || !password) {
    return {
      success: false,
      error: "Label, identifiant et mot de passe sont obligatoires.",
    };
  }

  let clientId: string | null = null;
  if (input.client_id) {
    const cid = input.client_id.trim();
    if (!isUuid(cid)) {
      return { success: false, error: "Client invalide." };
    }
    clientId = cid;
  }

  const wantPrivate = Boolean(input.is_private);
  if (wantPrivate && !isManagerOrDirection(auth.collaborator.role)) {
    return {
      success: false,
      error:
        "Seuls un Manager ou la Direction peuvent créer un accès privé.",
    };
  }

  const vault = await createVaultSecret(toolId, password, label);
  if (!vault.success) {
    return { success: false, error: vault.error };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("tool_access")
    .insert({
      tool_id: toolId,
      client_id: clientId,
      label,
      identifier,
      vault_secret_id: vault.data.vaultSecretId,
      is_private: wantPrivate,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    await deleteVaultSecret(vault.data.vaultSecretId);
    return {
      success: false,
      error: insErr?.message
        ? `Impossible de créer l'accès : ${insErr.message}`
        : "Impossible de créer l'accès.",
    };
  }

  revalidateTool(toolId);
  return { success: true, id: inserted.id as string };
}

/**
 * Met à jour les métadonnées ; mot de passe optionnel (vide = inchangé).
 * Bascule `is_private` réservée Manager/Direction (trigger + contrôle app).
 */
export async function updateToolAccessRecord(input: {
  id: string;
  label: string;
  identifier: string;
  password?: string;
  client_id?: string | null;
  is_private?: boolean;
}): Promise<ToolAccessActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const id = input.id.trim();
  if (!isUuid(id)) {
    return { success: false, error: "Accès introuvable." };
  }

  const label = input.label.trim();
  const identifier = input.identifier.trim();
  if (!label || !identifier) {
    return {
      success: false,
      error: "Label et identifiant sont obligatoires.",
    };
  }

  let clientId: string | null = null;
  if (input.client_id) {
    const cid = input.client_id.trim();
    if (!isUuid(cid)) {
      return { success: false, error: "Client invalide." };
    }
    clientId = cid;
  }

  const supabase = await createClient();
  const { data: existing, error: exErr } = await supabase
    .from("tool_access")
    .select(ACCESS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (exErr || !existing) {
    return { success: false, error: "Accès introuvable." };
  }

  const previousPrivate = Boolean(existing.is_private);
  const nextPrivate =
    input.is_private !== undefined ? Boolean(input.is_private) : previousPrivate;

  if (
    nextPrivate !== previousPrivate &&
    !isManagerOrDirection(auth.collaborator.role)
  ) {
    return {
      success: false,
      error:
        "Seuls un Manager ou la Direction peuvent modifier la visibilité d'un accès.",
    };
  }

  const newPassword = input.password?.trim() ?? "";
  if (newPassword) {
    const vault = await updateVaultSecret(
      existing.vault_secret_id as string,
      newPassword,
    );
    if (!vault.success) {
      return { success: false, error: vault.error };
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from("tool_access")
    .update({
      label,
      identifier,
      client_id: clientId,
      is_private: nextPrivate,
      updated_at: now,
    })
    .eq("id", id)
    .select("id, tool_id")
    .single();

  if (upErr || !updated) {
    if (upErr?.code === "PGRST116") {
      return { success: false, error: "Accès introuvable." };
    }
    if (upErr?.code === "42501" || upErr?.code === "23503") {
      return { success: false, error: "Opération non autorisée." };
    }
    return {
      success: false,
      error: upErr?.message
        ? `Impossible de mettre à jour l'accès : ${upErr.message}`
        : "Impossible de mettre à jour l'accès.",
    };
  }

  revalidateTool(updated.tool_id as string);
  return { success: true, id: updated.id as string };
}

/**
 * Supprime le secret Vault puis la ligne `tool_access`
 * (après vérification de cohérence id / vault_secret_id).
 */
export async function deleteToolAccessRecord(
  id: string,
  vaultSecretId: string,
): Promise<DeleteToolAccessResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!isUuid(id.trim())) {
    return { success: false, error: "Identifiants invalides." };
  }

  const vaultRef = vaultSecretId.trim();
  if (!vaultRef) {
    return { success: false, error: "Référence coffre invalide." };
  }

  const supabase = await createClient();
  const { data: row, error: rowErr } = await supabase
    .from("tool_access")
    .select("id, tool_id, vault_secret_id")
    .eq("id", id)
    .maybeSingle();

  if (rowErr || !row) {
    return { success: false, error: "Accès introuvable." };
  }

  if (row.vault_secret_id !== vaultRef) {
    return { success: false, error: "Opération non autorisée." };
  }

  const delVault = await deleteVaultSecret(vaultRef);
  if (!delVault.success) {
    return { success: false, error: delVault.error };
  }

  const { error: delErr } = await supabase
    .from("tool_access")
    .delete()
    .eq("id", id);

  if (delErr) {
    return {
      success: false,
      error: delErr.message
        ? `Impossible de supprimer l'accès : ${delErr.message}`
        : "Impossible de supprimer l'accès.",
    };
  }

  revalidateTool(row.tool_id as string);
  return { success: true };
}
