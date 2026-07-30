import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertAllowedImageFile } from "@/lib/visuels/allowed-image-types";

const PROFILE_PICTURE_TYPE_LABEL = "Photo de profil";
const VISUELS_BUCKET = "visuels";

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "avatar";
  return base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

async function getProfilePictureTypeId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_type")
    .select("id")
    .eq("label", PROFILE_PICTURE_TYPE_LABEL)
    .maybeSingle();

  if (error) {
    throw new Error(`Type documentaire introuvable : ${error.message}`);
  }
  if (!data) {
    throw new Error(
      `Le type documentaire « ${PROFILE_PICTURE_TYPE_LABEL} » est manquant.`,
    );
  }
  return data.id;
}

/**
 * Upload une photo de profil dans le bucket `visuels` + ligne `document`.
 * Retourne l'id document à lier sur `collaborator.profile_picture_id`.
 */
export async function uploadCollaboratorProfilePicture(
  file: File,
): Promise<{ documentId: string }> {
  const contentType = assertAllowedImageFile(file);

  const documentTypeId = await getProfilePictureTypeId();
  const admin = createAdminClient();

  const { data: document, error: insertError } = await admin
    .from("document")
    .insert({
      document_name: sanitizeFileName(file.name) || "avatar",
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

  const filePath = `${document.id}/${sanitizeFileName(file.name) || "avatar"}`;
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
