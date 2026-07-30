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

/**
 * Si l'URL d'erreur contient encore un hash de session (flux implicite),
 * établit la session et redirige vers `next`.
 */
export function AuthErrorRecovery({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<"checking" | "recovering" | "idle">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!window.location.hash.includes("access_token")) {
        if (!cancelled) setPhase("idle");
        return;
      }

      if (!cancelled) setPhase("recovering");

      const next = resolveClientNext(searchParams.get("next"));
      const result = await establishSessionFromUrl();
      if (cancelled) return;

      if (result.ok) {
        router.replace(next);
        router.refresh();
        return;
      }

      setPhase("idle");
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (phase === "checking" || phase === "recovering") {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Connexion en cours…
      </p>
    );
  }

  return children;
}
