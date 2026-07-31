"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type VaultActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ERR_CREATE = "Impossible de créer le secret sécurisé.";
const ERR_NOT_FOUND = "Secret introuvable dans le coffre.";
const ERR_FORBIDDEN = "Opération non autorisée.";
const ERR_UPDATE = "Impossible de mettre à jour le secret sécurisé.";
const ERR_DELETE = "Impossible de supprimer le secret sécurisé.";

const TOOL_ACCESS_NAME_PREFIX = "tool_access_";

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

function slugifyAccessLabel(label: string): string {
  const s = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return s.length > 0 ? s : "access";
}

/** Nom unique stocké dans `tool_access.vault_secret_id`. */
function buildToolAccessSecretName(toolId: string, label: string): string {
  const slug = slugifyAccessLabel(label.trim());
  const uniq = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${TOOL_ACCESS_NAME_PREFIX}${toolId}_${slug}_${uniq}`;
}

function isLegacyVaultUuidRef(ref: string): boolean {
  return isUuid(ref);
}

function isNameBasedVaultRef(ref: string): boolean {
  return ref.startsWith(TOOL_ACCESS_NAME_PREFIX);
}

/**
 * - `linked_visible` : ligne `tool_access` lisible (RLS) pour la session.
 * - `linked_hidden` : ligne existante mais masquée (ex. privé sans rôle Manager).
 * - `orphan` : aucune ligne ne référence ce secret.
 */
type VaultSecretLink = "linked_visible" | "linked_hidden" | "orphan";

async function classifyVaultSecretForSession(
  userSupabase: SupabaseClient,
  vaultSecretRef: string,
): Promise<VaultSecretLink> {
  const { data: visible } = await userSupabase
    .from("tool_access")
    .select("id")
    .eq("vault_secret_id", vaultSecretRef)
    .maybeSingle();

  if (visible) return "linked_visible";

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("tool_access")
    .select("id", { count: "exact", head: true })
    .eq("vault_secret_id", vaultSecretRef);

  if (error) return "linked_hidden";
  if ((count ?? 0) > 0) return "linked_hidden";
  return "orphan";
}

function parseReadSecretValue(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null && "read_secret" in data) {
    const v = (data as { read_secret?: unknown }).read_secret;
    return typeof v === "string" ? v : null;
  }
  return null;
}

/**
 * Crée un secret via RPC `insert_secret` (service role).
 * Retourne le nom métier (`vault_secret_id`).
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
  if (!password) {
    return { success: false, error: "Le mot de passe est obligatoire." };
  }

  const secretName = buildToolAccessSecretName(tid, label);

  try {
    const admin = createAdminClient();
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

/**
 * Met à jour le mot de passe si la session peut lire la ligne `tool_access`.
 */
export async function updateVaultSecret(
  vaultSecretRef: string,
  newPassword: string,
): Promise<VaultActionResult<null>> {
  const ref = vaultSecretRef.trim();
  if (!ref) {
    return { success: false, error: ERR_NOT_FOUND };
  }
  if (!newPassword) {
    return { success: false, error: "Le mot de passe est obligatoire." };
  }

  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const supabase = await createClient();
  const link = await classifyVaultSecretForSession(supabase, ref);
  if (link === "linked_hidden") {
    return { success: false, error: ERR_FORBIDDEN };
  }
  if (link === "orphan") {
    return { success: false, error: ERR_NOT_FOUND };
  }

  try {
    const admin = createAdminClient();

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

/**
 * Supprime un secret Vault (nom métier ou UUID hérité).
 * Autorisé si la ligne est visible ou orpheline (nettoyage après échec d'insert).
 */
export async function deleteVaultSecret(
  vaultSecretRef: string,
): Promise<VaultActionResult<null>> {
  const ref = vaultSecretRef.trim();
  if (!ref) {
    return { success: false, error: ERR_NOT_FOUND };
  }

  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const supabase = await createClient();
  const link = await classifyVaultSecretForSession(supabase, ref);
  if (link === "linked_hidden") {
    return { success: false, error: ERR_FORBIDDEN };
  }

  try {
    const admin = createAdminClient();

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

/**
 * Lit le mot de passe déchiffré uniquement si la session peut lire
 * la ligne `tool_access` associée (preuve RLS, cf. `05_security_rls.mdc`).
 */
export async function readVaultSecret(
  vaultSecretRef: string,
): Promise<VaultActionResult<{ password: string }>> {
  const ref = vaultSecretRef.trim();
  if (!ref) {
    return { success: false, error: ERR_NOT_FOUND };
  }

  const session = await requireActiveCollaboratorAction();
  if (!session.success) {
    return { success: false, error: session.error };
  }

  const supabase = await createClient();
  const link = await classifyVaultSecretForSession(supabase, ref);

  if (link === "linked_hidden") {
    return { success: false, error: "Accès refusé." };
  }
  if (link === "orphan") {
    return { success: false, error: ERR_NOT_FOUND };
  }

  try {
    const admin = createAdminClient();

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
