/**
 * Helpers FormData partagés par les server actions.
 */

export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function formOptional(formData: FormData, key: string): string | null {
  const value = formText(formData, key);
  return value.length > 0 ? value : null;
}

export function formBool(
  formData: FormData,
  key: string,
  fallback = false,
): boolean {
  const value = formData.get(key);
  if (value === null) return fallback;
  return value === "true" || value === "on" || value === "1";
}

export function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export function formCategoryIds(formData: FormData): string[] {
  return formData
    .getAll("category_ids")
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}
