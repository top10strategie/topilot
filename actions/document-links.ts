"use server";

import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import type { DocumentLinkEntity } from "@/lib/documents/types";
import {
  crmEntityFk,
  documentJunctionTable,
  revalidateCrmEntity,
} from "@/lib/revalidate-crm-entity";
import { looseClient } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type DocumentLinkActionResult =
  | { success: true }
  | { success: false; error: string };

export async function linkDocumentToEntity(input: {
  entity: DocumentLinkEntity;
  entityId: string;
  documentId: string;
}): Promise<DocumentLinkActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  const documentId = input.documentId.trim();
  if (!isUuid(entityId) || !isUuid(documentId)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const supabase = looseClient(await createClient());
  const table = documentJunctionTable(input.entity);
  const fk = crmEntityFk(input.entity);

  const { error } = await supabase.from(table).upsert(
    { [fk]: entityId, document_id: documentId },
    { onConflict: `${fk},document_id`, ignoreDuplicates: true },
  );

  if (error) {
    return {
      success: false,
      error: `Impossible de lier le document : ${error.message}`,
    };
  }

  revalidateCrmEntity(input.entity, entityId, ["/documents"]);
  return { success: true };
}

export async function unlinkDocumentFromEntity(input: {
  entity: DocumentLinkEntity;
  entityId: string;
  documentId: string;
}): Promise<DocumentLinkActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  const documentId = input.documentId.trim();
  if (!isUuid(entityId) || !isUuid(documentId)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const supabase = looseClient(await createClient());
  const table = documentJunctionTable(input.entity);
  const fk = crmEntityFk(input.entity);

  const { error } = await supabase
    .from(table)
    .delete()
    .eq(fk, entityId)
    .eq("document_id", documentId);

  if (error) {
    return {
      success: false,
      error: `Impossible de retirer le document : ${error.message}`,
    };
  }

  revalidateCrmEntity(input.entity, entityId, ["/documents"]);
  return { success: true };
}
