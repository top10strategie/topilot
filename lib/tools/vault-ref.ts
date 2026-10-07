import { isUuid } from "@/lib/uuid";

export const TOOL_ACCESS_NAME_PREFIX = "tool_access_";

export function slugifyAccessLabel(label: string): string {
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
export function buildToolAccessSecretName(
  toolId: string,
  label: string,
  uniq: string = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12),
): string {
  const slug = slugifyAccessLabel(label.trim());
  return `${TOOL_ACCESS_NAME_PREFIX}${toolId}_${slug}_${uniq}`;
}

export function isLegacyVaultUuidRef(ref: string): boolean {
  return isUuid(ref);
}

export function isNameBasedVaultRef(ref: string): boolean {
  return ref.startsWith(TOOL_ACCESS_NAME_PREFIX);
}

export function parseReadSecretValue(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null && "read_secret" in data) {
    const v = (data as { read_secret?: unknown }).read_secret;
    return typeof v === "string" ? v : null;
  }
  return null;
}
