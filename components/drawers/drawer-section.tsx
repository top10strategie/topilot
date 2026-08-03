import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerSectionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Zone scrollable du contenu d'un tiroir (padding horizontal + vertical).
 */
export function DrawerBody({ children, className }: DrawerSectionProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Pied de tiroir (Annuler / Enregistrer / Aller à…) — padding vers les bords.
 */
export function DrawerFooterActions({
  children,
  className,
}: DrawerSectionProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 justify-end gap-2 border-t bg-background px-4 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
