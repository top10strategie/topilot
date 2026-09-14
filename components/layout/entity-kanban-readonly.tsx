"use client";

import { useMemo, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLUMN_WIDTH_CLASS = "w-72";

export type EntityKanbanReadonlyItem<TStatus extends string> = {
  id: string;
  kanban_status: TStatus;
};

type Board<TStatus extends string, TItem> = Record<TStatus, TItem[]>;

type EntityKanbanReadonlyProps<
  TStatus extends string,
  TItem extends EntityKanbanReadonlyItem<TStatus>,
> = {
  columnIds: readonly TStatus[];
  items: TItem[];
  buildBoard: (items: TItem[]) => Board<TStatus, TItem>;
  getColumnTitle: (status: TStatus) => string;
  renderColumnMeta?: (items: TItem[]) => ReactNode;
  renderCard: (item: TItem) => ReactNode;
  onOpenItem: (id: string) => void;
  countLabel: string;
  boardClassName?: string;
};

function KanbanColumnShell({
  title,
  itemsCount,
  columnMeta,
  children,
}: {
  title: string;
  itemsCount: number;
  columnMeta?: ReactNode;
  children: ReactNode;
}) {
  const hasMeta = columnMeta !== undefined;

  return (
    <div
      className={cn(
        COLUMN_WIDTH_CLASS,
        "flex h-full min-h-0 shrink-0 flex-col rounded-lg border border-primary bg-card dark:border-secondary",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-primary/20 px-3 dark:border-secondary/20",
          hasMeta
            ? "h-14 flex-col justify-center gap-1"
            : "h-14 items-center justify-between gap-2",
        )}
      >
        {hasMeta ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-primary-foreground">
                {title}
              </h3>
              {itemsCount > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {itemsCount}
                </Badge>
              ) : null}
            </div>
            {columnMeta}
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-primary-foreground">
              {title}
            </h3>
            {itemsCount > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {itemsCount}
              </Badge>
            ) : null}
          </>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {children}
      </div>
    </div>
  );
}

function ReadonlyKanbanCard({
  itemId,
  onOpen,
  children,
}: {
  itemId: string;
  onOpen: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <Card
      role="link"
      tabIndex={0}
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onOpen(itemId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(itemId);
        }
      }}
    >
      {children}
    </Card>
  );
}

/** Kanban consultation (Home) — colonnes + cartes cliquables, sans @dnd-kit. */
export function EntityKanbanReadonly<
  TStatus extends string,
  TItem extends EntityKanbanReadonlyItem<TStatus>,
>({
  columnIds,
  items,
  buildBoard,
  getColumnTitle,
  renderColumnMeta,
  renderCard,
  onOpenItem,
  countLabel,
  boardClassName,
}: EntityKanbanReadonlyProps<TStatus, TItem>) {
  const board = useMemo(() => buildBoard(items), [buildBoard, items]);
  const totalCount = useMemo(
    () => columnIds.reduce((sum, status) => sum + board[status].length, 0),
    [board, columnIds],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex min-h-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden",
          boardClassName,
        )}
      >
        {columnIds.map((status) => {
          const columnItems = board[status] ?? [];
          const title = getColumnTitle(status);
          const columnMeta = renderColumnMeta?.(columnItems);

          return (
            <KanbanColumnShell
              key={status}
              title={title}
              itemsCount={columnItems.length}
              columnMeta={columnMeta}
            >
              {columnItems.map((item) => (
                <ReadonlyKanbanCard
                  key={item.id}
                  itemId={item.id}
                  onOpen={onOpenItem}
                >
                  {renderCard(item)}
                </ReadonlyKanbanCard>
              ))}
            </KanbanColumnShell>
          );
        })}
      </div>
      <p className="shrink-0 text-sm text-muted-foreground">
        {countLabel} : {totalCount}
      </p>
    </div>
  );
}
