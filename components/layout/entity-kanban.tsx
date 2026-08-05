"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLUMN_WIDTH_CLASS = "w-72";

export type EntityKanbanUpdate<TStatus extends string> = {
  id: string;
  kanban_status: TStatus;
  kanban_order: number;
};

export type EntityKanbanItem<TStatus extends string> = {
  id: string;
  kanban_status: TStatus;
};

type Board<TStatus extends string, TItem> = Record<TStatus, TItem[]>;

type EntityKanbanProps<
  TStatus extends string,
  TItem extends EntityKanbanItem<TStatus>,
> = {
  /** Identifiant stable DndContext (évite les collisions multi-boards). */
  dndId: string;
  columnIds: readonly TStatus[];
  items: TItem[];
  buildBoard: (items: TItem[]) => Board<TStatus, TItem>;
  getColumnTitle: (status: TStatus) => string;
  /** Sous le titre/badge (ex. totaux prix opportunités). */
  renderColumnMeta?: (items: TItem[]) => ReactNode;
  renderCard: (item: TItem) => ReactNode;
  onOpenItem: (id: string) => void;
  persistUpdates: (
    updates: EntityKanbanUpdate<TStatus>[],
  ) => Promise<{ success: boolean; error?: string }>;
  countLabel: string;
};

function findColumnForItem<
  TStatus extends string,
  TItem extends EntityKanbanItem<TStatus>,
>(
  board: Board<TStatus, TItem>,
  columnIds: readonly TStatus[],
  itemId: string,
): TStatus | null {
  for (const status of columnIds) {
    if (board[status].some((item) => item.id === itemId)) {
      return status;
    }
  }
  return null;
}

function boardToUpdates<
  TStatus extends string,
  TItem extends EntityKanbanItem<TStatus>,
>(
  board: Board<TStatus, TItem>,
  columnIds: readonly TStatus[],
): EntityKanbanUpdate<TStatus>[] {
  const updates: EntityKanbanUpdate<TStatus>[] = [];
  for (const status of columnIds) {
    board[status].forEach((item, index) => {
      updates.push({
        id: item.id,
        kanban_status: status,
        kanban_order: index,
      });
    });
  }
  return updates;
}

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

function StaticKanbanCard({
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

function SortableKanbanCard({
  itemId,
  onOpen,
  children,
}: {
  itemId: string;
  onOpen: (id: string) => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <Card
        role="link"
        tabIndex={0}
        className="cursor-grab touch-none transition-shadow hover:shadow-md active:cursor-grabbing"
        onClick={() => {
          if (!isDragging) onOpen(itemId);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(itemId);
          }
        }}
      >
        {children}
      </Card>
    </div>
  );
}

function KanbanColumn<
  TStatus extends string,
  TItem extends EntityKanbanItem<TStatus>,
>({
  status,
  title,
  items,
  columnMeta,
  onOpen,
  renderCard,
}: {
  status: TStatus;
  title: string;
  items: TItem[];
  columnMeta?: ReactNode;
  onOpen: (id: string) => void;
  renderCard: (item: TItem) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col",
        isOver && "rounded-lg ring-2 ring-primary/40 dark:ring-secondary/40",
      )}
    >
      <KanbanColumnShell
        title={title}
        itemsCount={items.length}
        columnMeta={columnMeta}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableKanbanCard
              key={item.id}
              itemId={item.id}
              onOpen={onOpen}
            >
              {renderCard(item)}
            </SortableKanbanCard>
          ))}
        </SortableContext>
      </KanbanColumnShell>
    </div>
  );
}

/**
 * Shell DnD partagé Missions / Opportunités.
 * Les wrappers domaine fournissent colonnes, cartes, buildBoard et persist.
 */
export function EntityKanban<
  TStatus extends string,
  TItem extends EntityKanbanItem<TStatus>,
>({
  dndId,
  columnIds,
  items,
  buildBoard,
  getColumnTitle,
  renderColumnMeta,
  renderCard,
  onOpenItem,
  persistUpdates,
  countLabel,
}: EntityKanbanProps<TStatus, TItem>) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board<TStatus, TItem>>(() =>
    buildBoard(items),
  );
  const boardBeforeDragRef = useRef<Board<TStatus, TItem> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const syncTokenRef = useRef(0);
  const columnIdSet = useMemo(() => new Set<string>(columnIds), [columnIds]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setBoard(buildBoard(items));
  }, [items, buildBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const status of columnIds) {
      const found = board[status].find((item) => item.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, board, columnIds]);

  const totalCount = useMemo(
    () => columnIds.reduce((sum, status) => sum + board[status].length, 0),
    [board, columnIds],
  );

  const isColumnId = (id: string): id is TStatus => columnIdSet.has(id);

  const persistBoard = async (
    nextBoard: Board<TStatus, TItem>,
    previous: Board<TStatus, TItem>,
  ) => {
    const token = ++syncTokenRef.current;
    const previousUpdates = boardToUpdates(previous, columnIds);
    const nextUpdates = boardToUpdates(nextBoard, columnIds);
    const previousById = new Map(previousUpdates.map((u) => [u.id, u]));
    const changed = nextUpdates.filter((update) => {
      const before = previousById.get(update.id);
      return (
        !before ||
        before.kanban_status !== update.kanban_status ||
        before.kanban_order !== update.kanban_order
      );
    });

    if (changed.length === 0) return;

    const result = await persistUpdates(changed);
    if (token !== syncTokenRef.current) return;

    if (!result.success) {
      setBoard(previous);
      toast.error(result.error ?? "Mise à jour impossible.");
      return;
    }
    router.refresh();
  };

  const handleDragStart = (event: DragStartEvent) => {
    boardBeforeDragRef.current = board;
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      boardBeforeDragRef.current = null;
      return;
    }

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const previous = boardBeforeDragRef.current ?? board;
    boardBeforeDragRef.current = null;

    const sourceStatus = findColumnForItem(previous, columnIds, activeItemId);
    if (!sourceStatus) return;

    const destStatus = isColumnId(overId)
      ? overId
      : findColumnForItem(previous, columnIds, overId);
    if (!destStatus) return;

    let nextBoard: Board<TStatus, TItem>;

    if (sourceStatus === destStatus) {
      const columnItems = [...previous[sourceStatus]];
      const oldIndex = columnItems.findIndex((item) => item.id === activeItemId);
      const newIndex = isColumnId(overId)
        ? columnItems.length - 1
        : columnItems.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      nextBoard = {
        ...previous,
        [sourceStatus]: arrayMove(columnItems, oldIndex, newIndex),
      };
    } else {
      const sourceItems = [...previous[sourceStatus]];
      const sourceIndex = sourceItems.findIndex(
        (item) => item.id === activeItemId,
      );
      if (sourceIndex < 0) return;
      const [moved] = sourceItems.splice(sourceIndex, 1);
      const destItems = [...previous[destStatus]];
      const overIndex = isColumnId(overId)
        ? destItems.length
        : destItems.findIndex((item) => item.id === overId);
      const insertAt = overIndex < 0 ? destItems.length : overIndex;
      destItems.splice(insertAt, 0, {
        ...moved,
        kanban_status: destStatus,
      });
      nextBoard = {
        ...previous,
        [sourceStatus]: sourceItems,
        [destStatus]: destItems,
      };
    }

    setBoard(nextBoard);
    void persistBoard(nextBoard, previous);
  };

  const boardColumns = (
    <div className="flex h-full min-h-0 flex-1 items-stretch gap-3 overflow-x-auto pb-2">
      {columnIds.map((status) => {
        const columnItems = board[status];
        const title = getColumnTitle(status);
        const columnMeta = renderColumnMeta?.(columnItems);

        return mounted ? (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            items={columnItems}
            columnMeta={columnMeta}
            onOpen={onOpenItem}
            renderCard={renderCard}
          />
        ) : (
          <KanbanColumnShell
            key={status}
            title={title}
            itemsCount={columnItems.length}
            columnMeta={columnMeta}
          >
            {columnItems.map((item) => (
              <StaticKanbanCard
                key={item.id}
                itemId={item.id}
                onOpen={onOpenItem}
              >
                {renderCard(item)}
              </StaticKanbanCard>
            ))}
          </KanbanColumnShell>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {mounted ? (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            if (boardBeforeDragRef.current) {
              setBoard(boardBeforeDragRef.current);
              boardBeforeDragRef.current = null;
            }
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col">{boardColumns}</div>
          <DragOverlay>
            {activeItem ? (
              <Card className="w-72 cursor-grabbing shadow-lg">
                {renderCard(activeItem)}
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        boardColumns
      )}
      <p className="shrink-0 text-sm text-muted-foreground">
        {countLabel} : {totalCount}
      </p>
    </div>
  );
}
