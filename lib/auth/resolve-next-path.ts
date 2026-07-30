import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth/constants";

/**
 * Valide le paramètre `next` des redirections Auth (relatif ou URL même origine).
 */
export function resolveNextPath(
  next: string | null,
  requestUrl: URL,
  fallback: string = FORCE_PASSWORD_CHANGE_PATH,
): string {
  if (!next) return fallback;

  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  try {
    const url = new URL(next);
    if (url.host === requestUrl.host) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    // ignore
  }

  return fallback;
}
