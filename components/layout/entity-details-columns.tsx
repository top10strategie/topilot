import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type EntityDetailsColumnsProps = {
  left: ReactNode;
  right: ReactNode;
  className?: string;
};

/**
 * Présentation « Détails / Informations » d'une fiche entité (§6) :
 * 2 colonnes desktop séparées verticalement, 1 colonne tablette/mobile.
 * Le contenu de chaque colonne reste libre (identité, notes, adresse…).
 */
export function EntityDetailsColumns({
  left,
  right,
  className,
}: EntityDetailsColumnsProps) {
  return (
    <div
      className={cn(
        "grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-0",
        className,
      )}
    >
      <div className="space-y-6 lg:pr-8">{left}</div>
      <Separator
        orientation="vertical"
        className="hidden h-auto self-stretch lg:block"
      />
      <div className="space-y-6 lg:pl-8">{right}</div>
    </div>
  );
}
