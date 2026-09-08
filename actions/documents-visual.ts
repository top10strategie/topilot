"use server";

import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { listDocumentTypes } from "@/lib/categories/queries";
import { listVisualDocumentOptions } from "@/lib/documents/queries";
import type { DocumentTypeItem } from "@/lib/categories/types";
import type { VisualDocumentOption } from "@/lib/documents/types";

export type LoadVisualDocumentPickerResult =
  | {
      success: true;
      options: VisualDocumentOption[];
      documentTypes: DocumentTypeItem[];
      lockedTypeId: string | null;
    }
  | { success: false; error: string };

/** Données pour le sélecteur logo / avatar / photo dans les tiroirs. */
export async function loadVisualDocumentPicker(
  expectedTypeLabel: string,
): Promise<LoadVisualDocumentPickerResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    const [options, documentTypes] = await Promise.all([
      listVisualDocumentOptions(expectedTypeLabel),
      listDocumentTypes(),
    ]);
    const lockedTypeId =
      documentTypes.find((type) => type.label === expectedTypeLabel)?.id ??
      null;
    return {
      success: true,
      options,
      documentTypes,
      lockedTypeId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de charger les documents visuels.",
    };
  }
}
