"use client";

import { createClient } from "@/lib/supabase/client";

type HashSession = {
  access_token: string;
  refresh_token: string;
  type: string | null;
};

function parseHashSession(hash: string): HashSession | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;

  const params = new URLSearchParams(raw);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;

  return {
    access_token,
    refresh_token,
    type: params.get("type"),
  };
}

/**
 * Établit une session depuis le hash (flux implicite) ou une session déjà présente.
 * Nettoie le hash de l'URL après succès.
 */
export async function establishSessionFromUrl(): Promise<{
  ok: boolean;
  type: string | null;
  error?: string;
}> {
  const supabase = createClient();
  const hashSession = parseHashSession(window.location.hash);

  if (hashSession) {
    const { error } = await supabase.auth.setSession({
      access_token: hashSession.access_token,
      refresh_token: hashSession.refresh_token,
    });

    if (error) {
      return { ok: false, type: hashSession.type, error: error.message };
    }

    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url.pathname + url.search);

    return { ok: true, type: hashSession.type };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return { ok: true, type: null };
  }

  return { ok: false, type: null, error: "No token hash or type" };
}
