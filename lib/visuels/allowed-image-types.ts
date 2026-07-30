/** Formats d’image acceptés pour logos / avatars (bucket `visuels`). */

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);

/** Extensions de secours quand `file.type` est vide (ex. certains SVG). */
const EXTENSION_TO_MIME: Record<string, AllowedImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

export const IMAGE_FILE_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",");

export const IMAGE_FILE_HELP =
  "JPEG, PNG, WebP, GIF, SVG ou AVIF — 5 Mo max.";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_UNSUPPORTED_MESSAGE =
  "Format d'image non supporté (JPEG, PNG, WebP, GIF, SVG ou AVIF).";

export const IMAGE_TOO_LARGE_MESSAGE = "L'image ne doit pas dépasser 5 Mo.";

function extensionOf(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Résout un type MIME autorisé depuis `file.type` ou l’extension du nom.
 * Retourne `null` si le format n’est pas supporté.
 */
export function resolveAllowedImageMime(file: File): AllowedImageMimeType | null {
  const declared = file.type.trim().toLowerCase();
  if (declared && ALLOWED_MIME_SET.has(declared)) {
    return declared as AllowedImageMimeType;
  }
  const fromExt = EXTENSION_TO_MIME[extensionOf(file.name)];
  return fromExt ?? null;
}

/**
 * Valide taille + format. Retourne le MIME à utiliser pour l’upload Storage.
 */
export function assertAllowedImageFile(file: File): AllowedImageMimeType {
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(IMAGE_TOO_LARGE_MESSAGE);
  }
  const mime = resolveAllowedImageMime(file);
  if (!mime) {
    throw new Error(IMAGE_UNSUPPORTED_MESSAGE);
  }
  return mime;
}
