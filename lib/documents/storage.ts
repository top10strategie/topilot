import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { assertAllowedImageFile } from "@/lib/visuels/allowed-image-types";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENTS_BUCKET,
  VISUELS_BUCKET,
} from "@/lib/documents/constants";

export {
  DOCUMENT_MAX_BYTES,
  DOCUMENTS_BUCKET,
  VISUELS_BUCKET,
} from "@/lib/documents/constants";

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "fichier";
  return base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export function bucketForVisual(isVisual: boolean): string {
  return isVisual ? VISUELS_BUCKET : DOCUMENTS_BUCKET;
}

export function publicVisuelUrl(filePath: string): string {
  return `${getSupabaseUrl()}/storage/v1/object/public/${VISUELS_BUCKET}/${filePath}`;
}

/**
 * Upload un fichier dans le bucket adapté (`documents` / `visuels`).
 * Prérequis : la ligne `document` existe déjà avec `file_path` provisoire éventuel.
 */
export async function uploadDocumentFile(input: {
  documentId: string;
  file: File;
  isVisual: boolean;
}): Promise<{ filePath: string }> {
  if (input.file.size <= 0) {
    throw new Error("Le fichier est vide.");
  }
  if (input.file.size > DOCUMENT_MAX_BYTES) {
    throw new Error("Le fichier ne doit pas dépasser 50 Mo.");
  }

  let contentType = input.file.type || "application/octet-stream";
  if (input.isVisual) {
    contentType = assertAllowedImageFile(input.file);
  }

  const documentName = sanitizeFileName(input.file.name) || "fichier";
  const filePath = `${input.documentId}/${documentName}`;
  const bucket = bucketForVisual(input.isVisual);
  const admin = createAdminClient();
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload Storage échoué : ${uploadError.message}`);
  }

  return { filePath };
}

/**
 * Supprime des objets Storage. Échec non bloquant (fichiers orphelins).
 */
export async function removeStoragePaths(
  paths: Array<{ filePath: string; isVisual: boolean }>,
): Promise<void> {
  const byBucket = new Map<string, string[]>();
  for (const item of paths) {
    if (!item.filePath || item.filePath === "pending") continue;
    const bucket = bucketForVisual(item.isVisual);
    const list = byBucket.get(bucket) ?? [];
    list.push(item.filePath);
    byBucket.set(bucket, list);
  }

  if (byBucket.size === 0) return;

  const admin = createAdminClient();
  for (const [bucket, filePaths] of byBucket) {
    const { error } = await admin.storage.from(bucket).remove(filePaths);
    if (error) {
      console.error(
        `removeStoragePaths (${bucket}):`,
        error.message,
        filePaths,
      );
    }
  }
}
