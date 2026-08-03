"use server";

import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import {
  crmEntityFk,
  revalidateCrmEntity,
  toolJunctionTable,
  type CrmLinkEntity,
} from "@/lib/revalidate-crm-entity";
import { createClient } from "@/lib/supabase/server";
import { getToolById } from "@/lib/tools/queries";
import type { ToolDetail } from "@/lib/tools/types";
import { isUuid } from "@/lib/uuid";

export type ToolLinkActionResult =
  | { success: true }
  | { success: false; error: string };

export type ToolLinkEntity = CrmLinkEntity;

export async function fetchToolForConsultation(
  toolId: string,
): Promise<
  { success: true; tool: ToolDetail } | { success: false; error: string }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(toolId.trim())) {
    return { success: false, error: "Outil invalide." };
  }
  const tool = await getToolById(toolId.trim());
  if (!tool) {
    return { success: false, error: "Outil introuvable." };
  }
  return { success: true, tool };
}

export async function linkToolToEntity(input: {
  entity: ToolLinkEntity;
  entityId: string;
  toolId: string;
}): Promise<ToolLinkActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  const toolId = input.toolId.trim();
  if (!isUuid(entityId) || !isUuid(toolId)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const table = toolJunctionTable(input.entity);
  const fk = crmEntityFk(input.entity);

  const { error } = await supabase.from(table).upsert(
    { [fk]: entityId, tool_id: toolId },
    { onConflict: `${fk},tool_id`, ignoreDuplicates: true },
  );

  if (error) {
    return {
      success: false,
      error: `Impossible de lier l'outil : ${error.message}`,
    };
  }

  revalidateCrmEntity(input.entity, entityId, [
    "/tools",
    `/tools/${toolId}`,
  ]);
  return { success: true };
}

export async function unlinkToolFromEntity(input: {
  entity: ToolLinkEntity;
  entityId: string;
  toolId: string;
}): Promise<ToolLinkActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  const toolId = input.toolId.trim();
  if (!isUuid(entityId) || !isUuid(toolId)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const table = toolJunctionTable(input.entity);
  const fk = crmEntityFk(input.entity);

  const { error } = await supabase
    .from(table)
    .delete()
    .eq(fk, entityId)
    .eq("tool_id", toolId);

  if (error) {
    return {
      success: false,
      error: `Impossible de retirer l'outil : ${error.message}`,
    };
  }

  revalidateCrmEntity(input.entity, entityId, [
    "/tools",
    `/tools/${toolId}`,
  ]);
  return { success: true };
}
