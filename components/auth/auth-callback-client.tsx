"use client";

import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth/constants";
import { establishSessionFromUrl } from "@/lib/auth/session-from-url";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function resolveClientNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return FORCE_PASSWORD_CHANGE_PATH;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Connexion en cours…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next = resolveClientNext(searchParams.get("next"));
      const result = await establishSessionFromUrl();

      if (cancelled) return;

      if (result.ok) {
        router.replace(next);
        router.refresh();
        return;
      }

      setMessage(result.error ?? "Impossible d'établir la session.");
      router.replace(
        `/auth/error?error=${encodeURIComponent(result.error ?? "No token hash or type")}&next=${encodeURIComponent(next)}`,
      );
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  );
}
