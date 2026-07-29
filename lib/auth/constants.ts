/** Routes accessibles sans session Supabase Auth. */
export const AUTH_PUBLIC_PREFIXES = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/confirm",
  "/auth/error",
] as const;

/** Route autorisée quand must_change_password = true. */
export const FORCE_PASSWORD_CHANGE_PATH = "/auth/update-password";

export const LOGIN_PATH = "/auth/login";

export const ACCESS_DENIED_PATH = "/auth/access-denied";

export const DEFAULT_AUTHENTICATED_PATH = "/";
