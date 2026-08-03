"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { formCategoryIds as formCategoryIdsRaw, formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { WikiLinkEntity } from "@/lib/wiki/types";
import { isUuid } from "@/lib/uuid";

export type WikiActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<
        Record<"title" | "content_html" | "tags" | "category_ids", string>
      >;
    };

export type DeleteWikiResult =
  | { success: true }
  | { success: false; error: string };

function formCategoryIds(formData: FormData): string[] {
  return formCategoryIdsRaw(formData).filter(isUuid);
}

function parseTags(raw: string): string[] {
  if (!raw.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  ];
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function revalidateWikis(extra: string[] = []) {
  revalidatePath("/wikis");
  for (const path of extra) revalidatePath(path);
}

async function syncWikiCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wikiId: string,
  categoryIds: string[],
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from("wiki_category")
    .delete()
    .eq("wiki_id", wikiId);
  if (deleteError) return deleteError.message;

  if (categoryIds.length === 0) return null;

  const { error: insertError } = await supabase.from("wiki_category").insert(
    categoryIds.map((category_id) => ({ wiki_id: wikiId, category_id })),
  );
  return insertError ? insertError.message : null;
}

async function linkWiki(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wikiId: string,
  entity: WikiLinkEntity,
  entityId: string,
): Promise<string | null> {
  const table = entity === "client" ? "client_wiki" : "mission_wiki";
  const fk = entity === "client" ? "client_id" : "mission_id";
  const { error } = await supabase.from(table).upsert(
    { [fk]: entityId, wiki_id: wikiId },
    { onConflict: `${fk},wiki_id`, ignoreDuplicates: true },
  );
  return error ? error.message : null;
}

export async function createWiki(
  formData: FormData,
): Promise<WikiActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const title = formText(formData, "title");
  const contentHtml = formText(formData, "content_html") || "<p></p>";
  const tags = parseTags(formText(formData, "tags"));
  const categoryIds = formCategoryIds(formData);
  const linkEntityRaw = formText(formData, "link_entity");
  const linkEntityId = formText(formData, "link_entity_id");
  const linkEntity =
    linkEntityRaw === "client" || linkEntityRaw === "mission"
      ? linkEntityRaw
      : null;

  const fieldErrors: NonNullable<
    Extract<WikiActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!title) fieldErrors.title = "Le titre est obligatoire.";
  else if (title.length > 200) {
    fieldErrors.title = "Le titre ne peut pas dépasser 200 caractères.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  if (linkEntity && (!linkEntityId || !isUuid(linkEntityId))) {
    return { success: false, error: "Entité parente invalide." };
  }

  const contentText = htmlToText(contentHtml) || title;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wiki")
    .insert({
      title,
      content_html: contentHtml,
      content_text: contentText,
      tags,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createWiki:", error);
    return {
      success: false,
      error: `Impossible de créer le wiki : ${error?.message ?? "inconnu"}`,
    };
  }

  const syncError = await syncWikiCategories(supabase, data.id, categoryIds);
  if (syncError) {
    return {
      success: false,
      error: `Wiki créé mais catégories non synchronisées : ${syncError}`,
    };
  }

  if (linkEntity && linkEntityId) {
    const linkError = await linkWiki(supabase, data.id, linkEntity, linkEntityId);
    if (linkError) {
      return {
        success: false,
        error: `Wiki créé mais liaison impossible : ${linkError}`,
      };
    }
  }

  const extra =
    linkEntity === "client" && linkEntityId
      ? [`/clients/${linkEntityId}`, "/clients"]
      : linkEntity === "mission" && linkEntityId
        ? [`/missions/${linkEntityId}`, "/missions"]
        : [];
  revalidateWikis(extra);
  return { success: true, id: data.id };
}

export async function updateWiki(
  wikiId: string,
  formData: FormData,
): Promise<WikiActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(wikiId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const title = formText(formData, "title");
  const contentHtml = formText(formData, "content_html") || "<p></p>";
  const tags = parseTags(formText(formData, "tags"));
  const categoryIds = formCategoryIds(formData);

  const fieldErrors: NonNullable<
    Extract<WikiActionResult, { success: false }>["fieldErrors"]
  > = {};
  if (!title) fieldErrors.title = "Le titre est obligatoire.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const contentText = htmlToText(contentHtml) || title;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wiki")
    .update({
      title,
      content_html: contentHtml,
      content_text: contentText,
      tags,
    })
    .eq("id", wikiId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("updateWiki:", error);
    return {
      success: false,
      error: `Impossible de mettre à jour : ${error.message}`,
    };
  }
  if (!data) {
    return { success: false, error: "Wiki introuvable." };
  }

  const syncError = await syncWikiCategories(supabase, data.id, categoryIds);
  if (syncError) {
    return {
      success: false,
      error: `Mise à jour partielle : ${syncError}`,
    };
  }

  revalidateWikis();
  return { success: true, id: data.id };
}

export async function deleteWiki(wikiId: string): Promise<DeleteWikiResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(wikiId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("wiki").delete().eq("id", wikiId);

  if (error) {
    console.error("deleteWiki:", error);
    return {
      success: false,
      error: `Impossible de supprimer : ${error.message}`,
    };
  }

  revalidateWikis();
  return { success: true };
}
