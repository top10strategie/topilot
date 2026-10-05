/** `file_path` Storage doit être préfixé par l'id document (`{id}/nom`). */

export function isOwnedDocumentFilePath(
  documentId: string,
  filePath: string | null | undefined,
): boolean {
  if (filePath == null || filePath === "pending") return true;
  return filePath.startsWith(`${documentId}/`) && filePath.length > documentId.length + 1;
}
