"use server";

import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { looseClient } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import {
  buildToolAccessSecretName,
  isLegacyVaultUuidRef,
  isNameBasedVaultRef,
  parseReadSecretValue,
} from "@/lib/tools/vault-ref";
import { hasToolAccessPassword } from "@/lib/tools/tool-access-password";
import { isUuid } from "@/lib/uuid";

export type VaultActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ERR_CREATE = "Impossible de créer le secret sécurisé.";
const ERR_NOT_FOUND = "Secret introuvable dans le coffre.";
const ERR_FORBIDDEN = "Opération non autorisée.";
const ERR_UPDATE = "Impossible de mettre à jour le secret sécurisé.";
const ERR_DELETE = "Impossible de supprimer le secret sécurisé.";

function isDevEnv(): boolean {
  return process.env.NODE_ENV === "development";
}

function withOptionalRpcHint(
  base: string,
  err: { message?: string; code?: string } | null | undefined,
): string {
  if (!isDevEnv() || !err?.message) return base;
  const hint = [err.code, err.message].filter(Boolean).join(" — ");
  return `${base} [${hint}]`;
}

/**
 * Preuve RLS sur la ligne, puis lecture admin de `vault_secret_id`
 * (colonne révoquée pour `authenticated`).
 */
async function resolveVaultRefForVisibleAccess(
  toolAccessId: string,
): Promise<VaultActionResult<{ ref: string }>> {
  if (!isUuid(toolAccessId)) {
    return { success: false, error: ERR_NOT_FOUND };
  }

  const supabase = await createClient();
  const { data: visible, error: visibleError } = await supabase
    .from("tool_access")
    .select("id")
    .eq("id", toolAccessId)
    .maybeSingle();

  if (visibleError) {
    return { success: false, error: ERR_FORBIDDEN };
  }

  const admin = looseClient(createAdminClient());
  const { data: row, error: adminError } = await admin
    .from("tool_access")
    .select("vault_secret_id")
    .eq("id", toolAccessId)
    .maybeSingle();

  if (adminError || !row) {
    return { success: false, error: ERR_NOT_FOUND };
  }

  if (!visible) {
    return { success: false, error: ERR_FORBIDDEN };
  }

  const ref = String(row.vault_secret_id ?? "").trim();
  if (!ref) {
    return { success: false, error: ERR_NOT_FOUND };
  }
  return { success: true, data: { ref } };
}

async function deleteVaultSecretByRef(
  ref: string,
): Promise<VaultActionResult<null>> {
  const admin = looseClient(createAdminClient());

  try {
    if (isLegacyVaultUuidRef(ref)) {
      const { data, error } = await admin
        .schema("vault")
        .from("secrets")
        .delete()
        .eq("id", ref)
        .select("id");

      if (error) {
        return { success: false, error: ERR_DELETE };
      }
      if (!data || data.length === 0) {
        return { success: false, error: ERR_NOT_FOUND };
      }
      return { success: true, data: null };
    }

    const { error } = await admin.rpc("delete_secret", { secret_name: ref });
    if (error) {
      return {
        success: false,
        error: withOptionalRpcHint(ERR_DELETE, error),
      };
    }
    return { success: true, data: null };
  } catch {
    return { success: false, error: ERR_DELETE };
  }
}

async function updateVaultSecretByRef(
  ref: string,
  newPassword: string,
): Promise<VaultActionResult<null>> {
  const admin = looseClient(createAdminClient());

  try {
    if (isLegacyVaultUuidRef(ref)) {
      const { data: meta, error: metaError } = await admin
        .schema("vault")
        .from("secrets")
        .select("name, description")
        .eq("id", ref)
        .maybeSingle();

      if (metaError || !meta) {
        return { success: false, error: ERR_NOT_FOUND };
      }

      const name =
        meta.name === null || meta.name === undefined ? "" : String(meta.name);
      const description =
        meta.description === null || meta.description === undefined
          ? ""
          : String(meta.description);

      const { error: rpcError } = await admin.schema("vault").rpc("update_secret", {
        secret_id: ref,
        new_secret: newPassword,
        new_name: name,
        new_description: description,
      });

      if (rpcError) {
        return { success: false, error: ERR_UPDATE };
      }
      return { success: true, data: null };
    }

    if (!isNameBasedVaultRef(ref)) {
      return { success: false, error: ERR_NOT_FOUND };
    }

    const { error } = await admin.rpc("update_secret", {
      secret_name: ref,
      secret_value: newPassword,
    });
    if (error) {
      return {
        success: false,
        error: withOptionalRpcHint(ERR_UPDATE, error),
      };
    }

    return { success: true, data: null };
  } catch {
    return { success: false, error: ERR_UPDATE };
  }
}

async function readVaultSecretByRef(
  ref: string,
): Promise<VaultActionResult<{ password: string }>> {
  const admin = looseClient(createAdminClient());

  try {
    if (isLegacyVaultUuidRef(ref)) {
      const { data: row, error } = await admin
        .schema("vault")
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("id", ref)
        .maybeSingle();

      if (error || row === null || row.decrypted_secret === null) {
        return { success: false, error: ERR_NOT_FOUND };
      }
      return { success: true, data: { password: String(row.decrypted_secret) } };
    }

    const { data, error } = await admin.rpc("read_secret", {
      secret_name: ref,
    });

    if (error) {
      return {
        success: false,
        error: withOptionalRpcHint(ERR_NOT_FOUND, error),
      };
    }

    const password = parseReadSecretValue(data);
    if (password === null) {
      return {
        success: false,
        error: isDevEnv()
          ? `${ERR_NOT_FOUND} [réponse read_secret inattendue]`
          : ERR_NOT_FOUND,
      };
    }

    return { success: true, data: { password } };
  } catch {
    return { success: false, error: ERR_NOT_FOUND };
  }
}

/**
 * Crée un secret via RPC `insert_secret` (service role).
 * Retourne le nom métier (`vault_secret_id`) — usage interne serveur uniquement.
 */
export async function createVaultSecret(
  toolId: string,
  password: string,
  label: string,
): Promise<VaultActionResult<{ vaultSecretId: string }>> {
  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const tid = toolId.trim();
  if (!isUuid(tid)) {
    return { success: false, error: "Outil invalide." };
  }
  if (!hasToolAccessPassword(password)) {
    return { success: false, error: "Le mot de passe est obligatoire." };
  }

  const secretName = buildToolAccessSecretName(tid, label);

  try {
    const admin = looseClient(createAdminClient());
    const { error } = await admin.rpc("insert_secret", {
      secret_name: secretName,
      secret_value: password,
    });

    if (error) {
      return {
        success: false,
        error: withOptionalRpcHint(ERR_CREATE, error),
      };
    }

    return { success: true, data: { vaultSecretId: secretName } };
  } catch (e) {
    return {
      success: false,
      error:
        isDevEnv() && e instanceof Error
          ? `${ERR_CREATE} (${e.message})`
          : ERR_CREATE,
    };
  }
}

/** Nettoyage d'un secret orphelin après échec d'INSERT `tool_access`. */
export async function deleteOrphanVaultSecret(
  vaultSecretRef: string,
): Promise<VaultActionResult<null>> {
  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const ref = vaultSecretRef.trim();
  if (!ref) {
    return { success: false, error: ERR_NOT_FOUND };
  }

  const admin = looseClient(createAdminClient());
  const { count, error } = await admin
    .from("tool_access")
    .select("id", { count: "exact", head: true })
    .eq("vault_secret_id", ref);

  if (error) {
    return { success: false, error: ERR_DELETE };
  }
  if ((count ?? 0) > 0) {
    return { success: false, error: ERR_FORBIDDEN };
  }

  return deleteVaultSecretByRef(ref);
}

/**
 * Met à jour le mot de passe si la session peut lire la ligne `tool_access`.
 */
export async function updateVaultSecret(
  toolAccessId: string,
  newPassword: string,
): Promise<VaultActionResult<null>> {
  if (!hasToolAccessPassword(newPassword)) {
    return { success: false, error: "Le mot de passe est obligatoire." };
  }

  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const resolved = await resolveVaultRefForVisibleAccess(toolAccessId.trim());
  if (!resolved.success) {
    return resolved;
  }
  return updateVaultSecretByRef(resolved.data.ref, newPassword);
}

/**
 * Supprime le secret Vault lié à un accès visible (RLS).
 */
export async function deleteVaultSecret(
  toolAccessId: string,
): Promise<VaultActionResult<null>> {
  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const resolved = await resolveVaultRefForVisibleAccess(toolAccessId.trim());
  if (!resolved.success) {
    return resolved;
  }
  return deleteVaultSecretByRef(resolved.data.ref);
}

/**
 * Lit le mot de passe déchiffré uniquement si la session peut lire
 * la ligne `tool_access` (preuve RLS, cf. `05_security_rls.mdc`).
 */
export async function readVaultSecret(
  toolAccessId: string,
): Promise<VaultActionResult<{ password: string }>> {
  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const resolved = await resolveVaultRefForVisibleAccess(toolAccessId.trim());
  if (!resolved.success) {
    return {
      success: false,
      error: resolved.error === ERR_FORBIDDEN ? "Accès refusé." : resolved.error,
    };
  }
  return readVaultSecretByRef(resolved.data.ref);
}
