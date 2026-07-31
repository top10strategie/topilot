"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListPaginationFooterProps = {
  /** Ex. « Nombre d'outils » — le compteur est ajouté après. */
  countLabel: string;
  count: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/**
 * Pied de page fixe des listes : compteur + pagination.
 * Hauteur constante (réserve toujours la zone pagination, comme sur `/tools`).
 */
export function ListPaginationFooter({
  countLabel,
  count,
  page,
  totalPages,
  pageSize,
  onPageChange,
  className,
}: ListPaginationFooterProps) {
  const showPagination = count > pageSize;

  return (
    <footer
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-3 border-t bg-background px-4 text-sm text-muted-foreground md:px-6",
        className,
      )}
    >
      <p className="min-w-0 truncate">
        {countLabel} : {count}
      </p>
      <div
        className={cn(
          "flex shrink-0 items-center gap-2",
          !showPagination && "invisible",
        )}
        aria-hidden={!showPagination}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!showPagination || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Précédent
        </Button>
        <span className="tabular-nums whitespace-nowrap">
          Page : {page}/{Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!showPagination || page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Suivant
        </Button>
      </div>
    </footer>
  );
}
