"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKey, PencilSimple, Trash } from "@phosphor-icons/react";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { ListPaginationFooter } from "@/components/layout/list-pagination-footer";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PAGE_SIZE = 25;

type LabelEntity = {
  id: string;
  label: string;
  is_private?: boolean;
};

type LabelEntityGridProps = {
  items: LabelEntity[];
  query: string;
  countLabel: string;
  onEdit: (item: LabelEntity) => void;
  onDelete: (item: LabelEntity) => void;
  emptyMessage: string;
};

/**
 * Grille de cartes label + crayon/poubelle, footer compteur/pagination
 * (même `ListPaginationFooter` que les listes CRM).
 */
export function LabelEntityGrid({
  items,
  query,
  countLabel,
  onEdit,
  onDelete,
  emptyMessage,
}: LabelEntityGridProps) {
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) {
      return items;
    }
    return items.filter((item) =>
      item.label.toLocaleLowerCase("fr").includes(normalized),
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {pageItems.map((item) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4">
                  <CardTitle className="min-w-0 text-base leading-snug">
                    {item.label}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.is_private ? (
                      <span
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
                        title="Catégorie privée"
                        aria-label="Catégorie privée"
                      >
                        <LockKey className="size-4" aria-hidden />
                      </span>
                    ) : null}
                    <IconActionButton
                      label={`Modifier ${item.label}`}
                      onClick={() => onEdit(item)}
                    >
                      <PencilSimple className="size-4" />
                    </IconActionButton>
                    <IconActionButton
                      label={`Supprimer ${item.label}`}
                      attention
                      onClick={() => onDelete(item)}
                    >
                      <Trash className="size-4" />
                    </IconActionButton>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ListPaginationFooter
        countLabel={countLabel}
        count={filtered.length}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        className="-mx-4 px-4 md:-mx-6 md:px-6"
      />
    </div>
  );
}
