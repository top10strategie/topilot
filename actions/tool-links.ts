"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";
import { getToolById } from "@/lib/tools/queries";
import type { ToolDetail } from "@/lib/tools/types";
import { isUuid } from "@/lib/uuid";

export type ToolLinkActionResult =
  | { success: true }
  | { success: false; error: string };

export type ToolLinkEntity = "client" | "mission" | "opportunity";

function revalidateEntity(
  entity: ToolLinkEntity,
  entityId: string,
  toolId?: string,
) {
  if (entity === "client") {
    revalidatePath(`/clients/${entityId}`);
    revalidatePath("/clients");
  } else if (entity === "mission") {
    revalidatePath(`/missions/${entityId}`);
    revalidatePath("/missions");
  } else {
    revalidatePath(`/opportunities/${entityId}`);
    revalidatePath("/opportunities");
  }
  revalidatePath("/tools");
  if (toolId) revalidatePath(`/tools/${toolId}`);
}

function tableFor(entity: ToolLinkEntity): string {
  if (entity === "client") return "client_tool";
  if (entity === "mission") return "mission_tool";
  return "opportunity_tool";
}

function fkFor(entity: ToolLinkEntity): string {
  if (entity === "client") return "client_id";
  if (entity === "mission") return "mission_id";
  return "opportunity_id";
}

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
  const table = tableFor(input.entity);
  const fk = fkFor(input.entity);

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

  revalidateEntity(input.entity, entityId, toolId);
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
  const table = tableFor(input.entity);
  const fk = fkFor(input.entity);

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

  revalidateEntity(input.entity, entityId, toolId);
  return { success: true };
}
