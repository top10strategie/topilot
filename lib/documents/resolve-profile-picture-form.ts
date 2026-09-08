import { PROFILE_PICTURE_TYPE_LABEL } from "@/lib/clients/visuals";
import { assertVisualDocumentOfType } from "@/lib/documents/visual-document";
import { formBool, formText } from "@/lib/form-data";
import { isUuid } from "@/lib/uuid";

/**
 * Lit `profile_picture_id` / `clear_avatar` depuis le FormData des tiroirs.
 */
export async function resolveProfilePictureIdFromForm(
  formData: FormData,
  currentId: string | null,
): Promise<
  | { success: true; profile_picture_id: string | null }
  | { success: false; error: string; fieldError?: string }
> {
  if (formBool(formData, "clear_avatar", false)) {
    return { success: true, profile_picture_id: null };
  }

  const pictureId = formText(formData, "profile_picture_id");
  if (!pictureId) {
    return { success: true, profile_picture_id: currentId };
  }
  if (!isUuid(pictureId)) {
    return {
      success: false,
      error: "Photo invalide.",
      fieldError: "Document invalide.",
    };
  }

  const check = await assertVisualDocumentOfType(
    pictureId,
    PROFILE_PICTURE_TYPE_LABEL,
  );
  if (!check.ok) {
    return { success: false, error: check.error, fieldError: check.error };
  }
  return { success: true, profile_picture_id: pictureId };
}
