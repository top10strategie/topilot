import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_DENIED_PATH,
  AUTH_PUBLIC_PREFIXES,
  FORCE_PASSWORD_CHANGE_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import type { AuthGateState } from "@/lib/auth/types";
import { getSupabaseAnonKey, getSupabaseUrl, hasEnvVars } from "./env";

function isPublicAuthPath(pathname: string): boolean {
  return AUTH_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Ne pas intercaler de code entre createServerClient et getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicAuthPath(pathname) || pathname === FORCE_PASSWORD_CHANGE_PATH) {
      // update-password sans session : laisser passer (flux reset e-mail).
      return supabaseResponse;
    }
    return redirectTo(request, LOGIN_PATH);
  }

  // Session présente : évaluer le gate métier (collaborateur actif + mot de passe).
  const { data: gateRows, error: gateError } = await supabase.rpc(
    "get_auth_gate_state",
  );

  if (gateError) {
    console.error("get_auth_gate_state a échoué:", gateError.message);
    return redirectTo(request, ACCESS_DENIED_PATH);
  }

  const gate = (Array.isArray(gateRows) ? gateRows[0] : gateRows) as
    | AuthGateState
    | undefined;

  if (!gate || gate.status !== "actif") {
    if (pathname === ACCESS_DENIED_PATH || isPublicAuthPath(pathname)) {
      return supabaseResponse;
    }
    return redirectTo(request, ACCESS_DENIED_PATH);
  }

  if (gate.must_change_password) {
    if (pathname === FORCE_PASSWORD_CHANGE_PATH) {
      return supabaseResponse;
    }
    return redirectTo(request, FORCE_PASSWORD_CHANGE_PATH);
  }

  // Mot de passe déjà à jour : inutile de rester sur la page forcée.
  if (pathname === FORCE_PASSWORD_CHANGE_PATH) {
    return redirectTo(request, "/");
  }

  // Utilisateur déjà connecté et actif : pas besoin des pages login / forgot.
  if (isPublicAuthPath(pathname) && pathname !== "/auth/error") {
    return redirectTo(request, "/");
  }

  return supabaseResponse;
}
