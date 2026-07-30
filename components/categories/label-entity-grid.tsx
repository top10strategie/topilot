"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PAGE_SIZE = 25;

type LabelEntity = {
  id: string;
  label: string;
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
 * Grille de cartes label + crayon/poubelle, pagination 25/page.
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
    <div className="space-y-4">
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pageItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4">
                <CardTitle className="text-base leading-snug">
                  {item.label}
                </CardTitle>
                <div className="flex shrink-0 gap-1">
                  <IconActionButton
                    label={`Modifier ${item.label}`}
                    onClick={() => onEdit(item)}
                  >
                    <PencilSimple className="size-4" />
                  </IconActionButton>
                  <IconActionButton
                    label={`Supprimer ${item.label}`}
                    variant="destructive"
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {countLabel} : {filtered.length}
        </p>
        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <span>
              Page : {page}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Suivant
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
