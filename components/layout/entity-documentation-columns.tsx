import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EntityDocumentationSectionProps = {
  title: string;
  /** Bouton d'ajout (icône) à droite du titre — cf. §6 / pages fiche. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Bloc d'une colonne Documentation : libellé + action optionnelle + liste.
 */
export function EntityDocumentationSection({
  title,
  action,
  children,
  className,
}: EntityDocumentationSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
