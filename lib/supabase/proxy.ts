import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_DENIED_PATH,
  FORCE_PASSWORD_CHANGE_PATH,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import {
  isPublicAuthPath,
  resolveAuthGatePath,
} from "@/lib/auth/auth-gate-path";
import type { AuthGateState } from "@/lib/auth/types";
import type { Database } from "./database.types";
import { getSupabaseAnonKey, getSupabaseUrl, hasEnvVars } from "./env";

function redirectTo(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  // Obligatoire : sinon le refresh token rotaté n'atteint pas le navigateur.
  // ResponseCookies n'expose pas setAll — recopier cookie par cookie.
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirectResponse.cookies.set(name, value, options);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  // Les crons Vercel s’authentifient via Bearer CRON_SECRET dans le handler —
  // ne pas exiger de session cookie (sinon redirect /login avant le secret).
  if (pathname.startsWith("/api/cron")) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Ne pas intercaler de code entre createServerClient et getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    if (isPublicAuthPath(pathname) || pathname === FORCE_PASSWORD_CHANGE_PATH) {
      // update-password sans session : laisser passer (flux reset e-mail).
      return supabaseResponse;
    }
    return redirectTo(request, LOGIN_PATH, supabaseResponse);
  }

  // Session présente : évaluer le gate métier (collaborateur actif + mot de passe).
  const { data: gateRows, error: gateError } = await supabase.rpc(
    "get_auth_gate_state",
  );

  if (gateError) {
    console.error("get_auth_gate_state a échoué:", gateError.message);
    return redirectTo(request, ACCESS_DENIED_PATH, supabaseResponse);
  }

  const gate = (Array.isArray(gateRows) ? gateRows[0] : gateRows) as
    | AuthGateState
    | undefined;

  const decision = resolveAuthGatePath(pathname, gate);
  if (decision.action === "redirect") {
    return redirectTo(request, decision.pathname, supabaseResponse);
  }

  return supabaseResponse;
}
