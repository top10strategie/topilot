import {
  ACCESS_DENIED_PATH,
  AUTH_PUBLIC_PREFIXES,
  FORCE_PASSWORD_CHANGE_PATH,
} from "@/lib/auth/constants";
import type { AuthGateState } from "@/lib/auth/types";

export type AuthGatePathDecision =
  | { action: "stay" }
  | { action: "redirect"; pathname: string };

export function isPublicAuthPath(pathname: string): boolean {
  return AUTH_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Destination après session Auth présente et RPC `get_auth_gate_state` lue.
 * `null` gate = collaborateur introuvable / inactif.
 */
export function resolveAuthGatePath(
  pathname: string,
  gate: AuthGateState | undefined,
): AuthGatePathDecision {
  if (!gate || gate.status !== "actif") {
    if (pathname === ACCESS_DENIED_PATH || isPublicAuthPath(pathname)) {
      return { action: "stay" };
    }
    return { action: "redirect", pathname: ACCESS_DENIED_PATH };
  }

  if (gate.must_change_password) {
    if (pathname === FORCE_PASSWORD_CHANGE_PATH) {
      return { action: "stay" };
    }
    return { action: "redirect", pathname: FORCE_PASSWORD_CHANGE_PATH };
  }

  if (pathname === FORCE_PASSWORD_CHANGE_PATH) {
    return { action: "redirect", pathname: "/" };
  }

  if (isPublicAuthPath(pathname) && pathname !== "/auth/error") {
    return { action: "redirect", pathname: "/" };
  }

  return { action: "stay" };
}
