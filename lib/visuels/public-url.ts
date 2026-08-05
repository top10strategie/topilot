import { publicVisuelUrl } from "@/lib/documents/storage";

export type VisualDocumentRef = {
  file_path: string | null;
  is_visual: boolean;
};

/**
 * URL publique Storage du bucket `visuels`, ou null si non applicable.
 */
export function resolveVisualPublicUrl(
  document: VisualDocumentRef | null | undefined,
): string | null {
  if (!document?.is_visual || !document.file_path) {
    return null;
  }
  return publicVisuelUrl(document.file_path);
}
