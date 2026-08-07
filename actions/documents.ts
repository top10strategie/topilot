"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import {
  removeStoragePaths,
  uploadDocumentFile,
} from "@/lib/documents/storage";
import { formBool, formFile, formText } from "@/lib/form-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { looseClient } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import type { DocumentLinkEntity } from "@/lib/documents/types";

export type DocumentActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<
        Record<
          "document_name" | "document_type_id" | "file" | "url" | "storage_type",
          string
        >
      >;
    };

export type DeleteDocumentResult =
  | { success: true }
  | { success: false; error: string };

function revalidateDocuments(extraPaths: string[] = []) {
  revalidatePath("/documents");
  for (const path of extraPaths) {
    revalidatePath(path);
  }
}

function entityPaths(
  entity: DocumentLinkEntity | null,
  entityId: string | null,
): string[] {
  if (!entity || !entityId) return [];
  if (entity === "client") return [`/clients/${entityId}`, "/clients"];
  if (entity === "mission") return [`/missions/${entityId}`, "/missions"];
  return [`/opportunities/${entityId}`, "/opportunities"];
}

async function linkDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  entity: DocumentLinkEntity,
  entityId: string,
): Promise<string | null> {
  const table =
    entity === "client"
      ? "client_document"
      : entity === "mission"
        ? "mission_document"
        : "opportunity_document";
  const fk =
    entity === "client"
      ? "client_id"
      : entity === "mission"
        ? "mission_id"
        : "opportunity_id";

  const { error } = await looseClient(supabase).from(table).upsert(
    { [fk]: entityId, document_id: documentId },
    { onConflict: `${fk},document_id`, ignoreDuplicates: true },
  );
  return error ? error.message : null;
}

/**
 * Crée un document (fichier Supabase ou URL) + liaison optionnelle.
 */
export async function createDocument(
  formData: FormData,
): Promise<DocumentActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const documentName = formText(formData, "document_name");
  const documentTypeId = formText(formData, "document_type_id");
  const storageType = formText(formData, "storage_type") as "supabase" | "url";
  const url = formText(formData, "url");
  const isVisual = formBool(formData, "is_visual");
  const file = formFile(formData, "file");
  const linkEntityRaw = formText(formData, "link_entity");
  const linkEntityId = formText(formData, "link_entity_id");
  const linkEntity =
    linkEntityRaw === "client" ||
    linkEntityRaw === "mission" ||
    linkEntityRaw === "opportunity"
      ? linkEntityRaw
      : null;

  const fieldErrors: NonNullable<
    Extract<DocumentActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!documentName) {
    fieldErrors.document_name = "Le titre est obligatoire.";
  } else if (documentName.length > 200) {
    fieldErrors.document_name = "Le titre ne peut pas dépasser 200 caractères.";
  }
  if (!documentTypeId || !isUuid(documentTypeId)) {
    fieldErrors.document_type_id = "Le type est obligatoire.";
  }
  if (storageType !== "supabase" && storageType !== "url") {
    fieldErrors.storage_type = "Source invalide.";
  } else if (storageType === "supabase" && !file) {
    fieldErrors.file = "Sélectionnez un fichier.";
  } else if (storageType === "url") {
    if (!url) {
      fieldErrors.url = "L'URL est obligatoire.";
    } else {
      try {
        new URL(url);
      } catch {
        fieldErrors.url = "URL invalide.";
      }
    }
  }
  if (linkEntity && (!linkEntityId || !isUuid(linkEntityId))) {
    return { success: false, error: "Entité parente invalide." };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  if (storageType === "url") {
    const { data, error } = await supabase
      .from("document")
      .insert({
        document_name: documentName,
        document_type_id: documentTypeId,
        storage_type: "url",
        url,
        file_path: null,
        is_visual: isVisual,
        version_number: 1,
        parent_document_id: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("createDocument url:", error);
      return {
        success: false,
        error: `Impossible de créer le document : ${error?.message ?? "inconnu"}`,
      };
    }

    if (linkEntity && linkEntityId) {
      const linkError = await linkDocument(
        supabase,
        data.id,
        linkEntity,
        linkEntityId,
      );
      if (linkError) {
        return {
          success: false,
          error: `Document créé mais liaison impossible : ${linkError}`,
        };
      }
    }

    revalidateDocuments(entityPaths(linkEntity, linkEntityId || null));
    return { success: true, id: data.id };
  }

  // storage_type = supabase — insert via admin pour file_path pending puis upload
  const { data: document, error: insertError } = await admin
    .from("document")
    .insert({
      document_name: documentName,
      document_type_id: documentTypeId,
      storage_type: "supabase",
      file_path: "pending",
      url: null,
      is_visual: isVisual,
      version_number: 1,
      parent_document_id: null,
    })
    .select("id")
    .single();

  if (insertError || !document) {
    console.error("createDocument insert:", insertError);
    return {
      success: false,
      error: `Impossible de créer le document : ${insertError?.message ?? "inconnu"}`,
      fieldErrors: { file: insertError?.message },
    };
  }

  try {
    const { filePath } = await uploadDocumentFile({
      documentId: document.id,
      file: file!,
      isVisual,
    });

    const { error: pathError } = await admin
      .from("document")
      .update({ file_path: filePath })
      .eq("id", document.id);

    if (pathError) {
      await removeStoragePaths([{ filePath, isVisual }]);
      await admin.from("document").delete().eq("id", document.id);
      return {
        success: false,
        error: `Impossible de finaliser le document : ${pathError.message}`,
        fieldErrors: { file: pathError.message },
      };
    }
  } catch (err) {
    await admin.from("document").delete().eq("id", document.id);
    const message = err instanceof Error ? err.message : "Upload échoué.";
    return {
      success: false,
      error: message,
      fieldErrors: { file: message },
    };
  }

  if (linkEntity && linkEntityId) {
    const linkError = await linkDocument(
      supabase,
      document.id,
      linkEntity,
      linkEntityId,
    );
    if (linkError) {
      return {
        success: false,
        error: `Document créé mais liaison impossible : ${linkError}`,
      };
    }
  }

  revalidateDocuments(entityPaths(linkEntity, linkEntityId || null));
  return { success: true, id: document.id };
}

/**
 * Met à jour les métadonnées. Un nouveau fichier déclenche createDocumentVersion.
 */
export async function updateDocument(
  documentId: string,
  formData: FormData,
): Promise<DocumentActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(documentId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const documentName = formText(formData, "document_name");
  const documentTypeId = formText(formData, "document_type_id");
  const storageType = formText(formData, "storage_type") as "supabase" | "url";
  const url = formText(formData, "url");
  const file = formFile(formData, "file");
  const isVisual = formBool(formData, "is_visual");

  const fieldErrors: NonNullable<
    Extract<DocumentActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!documentName) {
    fieldErrors.document_name = "Le titre est obligatoire.";
  }
  if (!documentTypeId || !isUuid(documentTypeId)) {
    fieldErrors.document_type_id = "Le type est obligatoire.";
  }
  if (storageType !== "supabase" && storageType !== "url") {
    fieldErrors.storage_type = "Source invalide.";
  }

  // Nouveau fichier → versionning (pas d'update in-place du fichier)
  if (file) {
    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        error: "Corrigez les erreurs du formulaire.",
        fieldErrors,
      };
    }
    return createDocumentVersion(documentId, formData);
  }

  if (storageType === "url") {
    if (!url) {
      fieldErrors.url = "L'URL est obligatoire.";
    } else {
      try {
        new URL(url);
      } catch {
        fieldErrors.url = "URL invalide.";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("document")
    .select("id, storage_type")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { success: false, error: "Document introuvable." };
  }

  // Métadonnées uniquement — jamais is_visual sans nouvel upload
  const payload: Record<string, unknown> = {
    document_name: documentName,
    document_type_id: documentTypeId,
  };

  if (existing.storage_type === "url" && storageType === "url") {
    payload.url = url;
  }

  // Changer de supabase → url sans fichier n'est pas supporté sans version
  if (existing.storage_type === "supabase" && storageType === "url") {
    return {
      success: false,
      error:
        "Pour passer en lien externe, uploadez une nouvelle version ou créez un nouveau document.",
    };
  }

  const { data, error } = await supabase
    .from("document")
    .update(payload as never)
    .eq("id", documentId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("updateDocument:", error);
    return {
      success: false,
      error: `Impossible de mettre à jour : ${error.message}`,
    };
  }
  if (!data) {
    return { success: false, error: "Document introuvable." };
  }

  // isVisual unused without file — silence unused
  void isVisual;

  revalidateDocuments();
  return { success: true, id: data.id };
}

/**
 * Nouvelle version : INSERT version_number+1, parent → racine.
 */
export async function createDocumentVersion(
  sourceDocumentId: string,
  formData: FormData,
): Promise<DocumentActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(sourceDocumentId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const documentName = formText(formData, "document_name");
  const documentTypeId = formText(formData, "document_type_id");
  const storageType = formText(formData, "storage_type") as "supabase" | "url";
  const url = formText(formData, "url");
  const isVisual = formBool(formData, "is_visual");
  const file = formFile(formData, "file");

  const fieldErrors: NonNullable<
    Extract<DocumentActionResult, { success: false }>["fieldErrors"]
  > = {};

  if (!documentName) fieldErrors.document_name = "Le titre est obligatoire.";
  if (!documentTypeId || !isUuid(documentTypeId)) {
    fieldErrors.document_type_id = "Le type est obligatoire.";
  }
  if (storageType === "supabase" && !file) {
    fieldErrors.file = "Sélectionnez un fichier pour la nouvelle version.";
  }
  if (storageType === "url") {
    if (!url) fieldErrors.url = "L'URL est obligatoire.";
    else {
      try {
        new URL(url);
      } catch {
        fieldErrors.url = "URL invalide.";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase
    .from("document")
    .select(
      "id, version_number, parent_document_id, client_document(client_id), opportunity_document(opportunity_id), mission_document(mission_id)",
    )
    .eq("id", sourceDocumentId)
    .maybeSingle();

  if (sourceError || !source) {
    return { success: false, error: "Document source introuvable." };
  }

  const rootId = source.parent_document_id ?? source.id;

  const { data: maxRow } = await supabase
    .from("document")
    .select("version_number")
    .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version_number ?? source.version_number) + 1;
  const admin = createAdminClient();

  if (storageType === "url") {
    const { data: created, error } = await admin
      .from("document")
      .insert({
        document_name: documentName,
        document_type_id: documentTypeId,
        storage_type: "url",
        url,
        file_path: null,
        is_visual: isVisual,
        version_number: nextVersion,
        parent_document_id: rootId,
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        success: false,
        error: `Impossible de créer la version : ${error?.message ?? "inconnu"}`,
      };
    }

    await copyLinksToNewVersion(supabase, source, created.id);
    revalidateDocuments();
    return { success: true, id: created.id };
  }

  const { data: created, error: insertError } = await admin
    .from("document")
    .insert({
      document_name: documentName,
      document_type_id: documentTypeId,
      storage_type: "supabase",
      file_path: "pending",
      url: null,
      is_visual: isVisual,
      version_number: nextVersion,
      parent_document_id: rootId,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return {
      success: false,
      error: `Impossible de créer la version : ${insertError?.message ?? "inconnu"}`,
    };
  }

  try {
    const { filePath } = await uploadDocumentFile({
      documentId: created.id,
      file: file!,
      isVisual,
    });
    const { error: pathError } = await admin
      .from("document")
      .update({ file_path: filePath })
      .eq("id", created.id);
    if (pathError) {
      await removeStoragePaths([{ filePath, isVisual }]);
      await admin.from("document").delete().eq("id", created.id);
      return {
        success: false,
        error: pathError.message,
        fieldErrors: { file: pathError.message },
      };
    }
  } catch (err) {
    await admin.from("document").delete().eq("id", created.id);
    const message = err instanceof Error ? err.message : "Upload échoué.";
    return {
      success: false,
      error: message,
      fieldErrors: { file: message },
    };
  }

  await copyLinksToNewVersion(supabase, source, created.id);
  revalidateDocuments();
  return { success: true, id: created.id };
}

/** Migre les jonctions de la version source vers la nouvelle (évite les doublons en fiche). */
async function copyLinksToNewVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  source: {
    id: string;
    client_document?: Array<{ client_id: string }> | null;
    opportunity_document?: Array<{ opportunity_id: string }> | null;
    mission_document?: Array<{ mission_id: string }> | null;
  },
  newDocumentId: string,
) {
  for (const row of source.client_document ?? []) {
    await supabase.from("client_document").upsert(
      { client_id: row.client_id, document_id: newDocumentId },
      { onConflict: "client_id,document_id", ignoreDuplicates: true },
    );
    await supabase
      .from("client_document")
      .delete()
      .eq("client_id", row.client_id)
      .eq("document_id", source.id);
  }
  for (const row of source.opportunity_document ?? []) {
    await supabase.from("opportunity_document").upsert(
      { opportunity_id: row.opportunity_id, document_id: newDocumentId },
      { onConflict: "opportunity_id,document_id", ignoreDuplicates: true },
    );
    await supabase
      .from("opportunity_document")
      .delete()
      .eq("opportunity_id", row.opportunity_id)
      .eq("document_id", source.id);
  }
  for (const row of source.mission_document ?? []) {
    await supabase.from("mission_document").upsert(
      { mission_id: row.mission_id, document_id: newDocumentId },
      { onConflict: "mission_id,document_id", ignoreDuplicates: true },
    );
    await supabase
      .from("mission_document")
      .delete()
      .eq("mission_id", row.mission_id)
      .eq("document_id", source.id);
  }
}

async function purgeAfterDelete(
  filePaths: string[] | null,
  isVisual: boolean,
): Promise<void> {
  const paths = (filePaths ?? [])
    .filter((p): p is string => Boolean(p) && p !== "pending")
    .map((filePath) => ({ filePath, isVisual }));
  await removeStoragePaths(paths);
}

export async function deleteDocumentVersion(
  documentId: string,
): Promise<DeleteDocumentResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(documentId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("document")
    .select("id, is_visual")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: "Document introuvable." };
  }

  const { data: paths, error } = await supabase.rpc("delete_document_version", {
    p_document_id: documentId,
  });

  if (error) {
    console.error("deleteDocumentVersion:", error);
    return {
      success: false,
      error: error.message.includes("version la plus récente")
        ? error.message
        : `Impossible de supprimer : ${error.message}`,
    };
  }

  const filePaths = (paths as Array<{ file_path: string | null }> | null)?.map(
    (row) => row.file_path,
  ).filter((p): p is string => Boolean(p)) ?? [];

  await purgeAfterDelete(filePaths, doc.is_visual);
  revalidateDocuments();
  return { success: true };
}

export async function deleteDocumentLineage(
  documentId: string,
): Promise<DeleteDocumentResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(documentId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const supabase = await createClient();

  // Récupérer is_visual + file_paths de toute la lignée avant suppression
  const { data: doc } = await supabase
    .from("document")
    .select("id, parent_document_id, is_visual")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: "Document introuvable." };
  }

  const rootId = doc.parent_document_id ?? doc.id;
  const { data: lineage } = await supabase
    .from("document")
    .select("file_path, is_visual")
    .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`);

  const storageTargets = (lineage ?? [])
    .filter((row) => row.file_path && row.file_path !== "pending")
    .map((row) => ({
      filePath: row.file_path as string,
      isVisual: row.is_visual as boolean,
    }));

  const { error } = await supabase.rpc("delete_document_lineage", {
    p_document_id: documentId,
  });

  if (error) {
    console.error("deleteDocumentLineage:", error);
    return {
      success: false,
      error: `Impossible de supprimer : ${error.message}`,
    };
  }

  await removeStoragePaths(storageTargets);
  revalidateDocuments();
  return { success: true };
}
