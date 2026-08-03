import type { DocumentListItem } from "@/lib/documents/types";

/**
 * Libellé d'extension / format pour affichage documents.
 * Priorité : `file_path` puis `document_name` ; URL → « URL » ; sinon « — ».
 */
export function getDocumentFileFormat(
  item: Pick<
    DocumentListItem,
    "file_path" | "document_name" | "storage_type" | "url"
  >,
): string {
  const fromPath = extensionFromName(item.file_path);
  if (fromPath) return fromPath;

  const fromName = extensionFromName(item.document_name);
  if (fromName) return fromName;

  if (item.storage_type === "url" || item.url) {
    return "URL";
  }

  return "—";
}

function extensionFromName(value: string | null | undefined): string | null {
  if (!value) return null;
  const base = value.split(/[\\/]/).pop() ?? value;
  const cleaned = base.split("?")[0]?.split("#")[0] ?? base;
  const dot = cleaned.lastIndexOf(".");
  if (dot <= 0 || dot === cleaned.length - 1) return null;
  return cleaned.slice(dot + 1).toLowerCase();
}
