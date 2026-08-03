"use server";

import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { revalidateCrmEntity } from "@/lib/revalidate-crm-entity";
import { createClient } from "@/lib/supabase/server";
import { getWikiById } from "@/lib/wiki/queries";
import type { WikiLinkEntity, WikiListItem } from "@/lib/wiki/types";
import { isUuid } from "@/lib/uuid";

export type WikiLinkActionResult =
  | { success: true }
  | { success: false; error: string };

function revalidateEntity(entity: WikiLinkEntity, entityId: string) {
  revalidateCrmEntity(
    entity === "client" ? "client" : "mission",
    entityId,
    ["/wikis"],
  );
}

export async function fetchWikiForConsultation(
  wikiId: string,
): Promise<
  { success: true; wiki: WikiListItem } | { success: false; error: string }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(wikiId.trim())) {
    return { success: false, error: "Wiki invalide." };
  }
  const wiki = await getWikiById(wikiId.trim());
  if (!wiki) {
    return { success: false, error: "Wiki introuvable." };
  }
  return { success: true, wiki };
}

export async function linkWikiToEntity(input: {
  entity: WikiLinkEntity;
  entityId: string;
  wikiId: string;
}): Promise<WikiLinkActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  const wikiId = input.wikiId.trim();
  if (!isUuid(entityId) || !isUuid(wikiId)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const table = input.entity === "client" ? "client_wiki" : "mission_wiki";
  const fk = input.entity === "client" ? "client_id" : "mission_id";

  const { error } = await supabase.from(table).upsert(
    { [fk]: entityId, wiki_id: wikiId },
    { onConflict: `${fk},wiki_id`, ignoreDuplicates: true },
  );

  if (error) {
    return {
      success: false,
      error: `Impossible de lier le wiki : ${error.message}`,
    };
  }

  revalidateEntity(input.entity, entityId);
  return { success: true };
}

export async function unlinkWikiFromEntity(input: {
  entity: WikiLinkEntity;
  entityId: string;
  wikiId: string;
}): Promise<WikiLinkActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  const wikiId = input.wikiId.trim();
  if (!isUuid(entityId) || !isUuid(wikiId)) {
    return { success: false, error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const table = input.entity === "client" ? "client_wiki" : "mission_wiki";
  const fk = input.entity === "client" ? "client_id" : "mission_id";

  const { error } = await supabase
    .from(table)
    .delete()
    .eq(fk, entityId)
    .eq("wiki_id", wikiId);

  if (error) {
    return {
      success: false,
      error: `Impossible de retirer le wiki : ${error.message}`,
    };
  }

  revalidateEntity(input.entity, entityId);
  return { success: true };
}
