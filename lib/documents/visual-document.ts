import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

/**
 * Vérifie qu'un document peut servir de logo / avatar / photo :
 * existe, `is_visual`, type conforme.
 */
export async function assertVisualDocumentOfType(
  documentId: string,
  expectedTypeLabel: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(documentId)) {
    return { ok: false, error: "Document invalide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document")
    .select("id, is_visual, document_type:document_type_id ( label )")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Document introuvable." };
  }
  if (!data.is_visual) {
    return { ok: false, error: "Le document doit être un visuel." };
  }

  const type = Array.isArray(data.document_type)
    ? data.document_type[0]
    : data.document_type;
  const label =
    type && typeof type === "object" && "label" in type
      ? String((type as { label: string }).label)
      : null;

  if (label !== expectedTypeLabel) {
    return {
      ok: false,
      error: `Le document doit être de type « ${expectedTypeLabel} ».`,
    };
  }

  return { ok: true };
}
