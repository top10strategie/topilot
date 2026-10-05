import type { Session } from "@supabase/supabase-js";

function methodsFromAmr(
  amr: unknown,
): string[] {
  if (!Array.isArray(amr)) return [];
  return amr
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "method" in entry) {
        const method = (entry as { method?: unknown }).method;
        return typeof method === "string" ? method : null;
      }
      return null;
    })
    .filter((method): method is string => Boolean(method));
}

function methodsFromAccessToken(accessToken: string): string[] {
  const parts = accessToken.split(".");
  if (parts.length < 2) return [];
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  try {
    const json = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      amr?: unknown;
    };
    return methodsFromAmr(json.amr);
  } catch {
    return [];
  }
}

/**
 * Session issue d'un reset e-mail ou d'une invitation (pas un login mot de passe).
 */
export function isPasswordRecoveryOrInviteSession(
  session: Session | null,
): boolean {
  if (!session) return false;
  const fromUser = methodsFromAmr(
    (session.user as { amr?: unknown } | undefined)?.amr,
  );
  const fromJwt = methodsFromAccessToken(session.access_token);
  const methods = new Set([...fromUser, ...fromJwt]);
  return methods.has("recovery") || methods.has("invite");
}
