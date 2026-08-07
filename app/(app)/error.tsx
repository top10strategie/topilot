"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Boundary d'erreur du segment authentifié.
 */
export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("Erreur segment (app):", error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Impossible d&apos;afficher cette page. Vous pouvez réessayer ou
        revenir à l&apos;accueil.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}
