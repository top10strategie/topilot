import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertAllowedImageFile } from "@/lib/visuels/allowed-image-types";

const VISUELS_BUCKET = "visuels";

export const CLIENT_LOGO_TYPE_LABEL = "Logo client";
export const PROFILE_PICTURE_TYPE_LABEL = "Photo de profil";

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  return base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

async function getDocumentTypeId(label: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_type")
    .select("id")
    .eq("label", label)
    .maybeSingle();

  if (error) {
    throw new Error(`Type documentaire introuvable : ${error.message}`);
  }
  if (!data) {
    throw new Error(`Le type documentaire « ${label} » est manquant.`);
  }
  return data.id;
}

/**
 * Upload un visuel (logo / avatar) dans `visuels` + ligne `document` (`is_visual`).
 */
export async function uploadClientVisual(
  file: File,
  typeLabel: string,
  fallbackName: string,
): Promise<{ documentId: string }> {
  const contentType = assertAllowedImageFile(file);

  const documentTypeId = await getDocumentTypeId(typeLabel);
  const admin = createAdminClient();
  const documentName = sanitizeFileName(file.name) || fallbackName;

  const { data: document, error: insertError } = await admin
    .from("document")
    .insert({
      document_name: documentName,
      document_type_id: documentTypeId,
      storage_type: "supabase",
      file_path: "pending",
      is_visual: true,
    })
    .select("id")
    .single();

  if (insertError || !document) {
    throw new Error(
      `Impossible de créer le document : ${insertError?.message ?? "inconnu"}`,
    );
  }

  const filePath = `${document.id}/${documentName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(VISUELS_BUCKET)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    await admin.from("document").delete().eq("id", document.id);
    throw new Error(`Upload Storage échoué : ${uploadError.message}`);
  }

  const { error: pathError } = await admin
    .from("document")
    .update({ file_path: filePath })
    .eq("id", document.id);

  if (pathError) {
    await admin.storage.from(VISUELS_BUCKET).remove([filePath]);
    await admin.from("document").delete().eq("id", document.id);
    throw new Error(`Impossible de finaliser le document : ${pathError.message}`);
  }

  return { documentId: document.id };
}

export async function uploadClientLogo(file: File) {
  return uploadClientVisual(file, CLIENT_LOGO_TYPE_LABEL, "logo");
}

export async function uploadContactProfilePicture(file: File) {
  return uploadClientVisual(file, PROFILE_PICTURE_TYPE_LABEL, "avatar");
}
