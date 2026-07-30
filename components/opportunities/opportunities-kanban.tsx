"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import {
  updateOpportunitiesKanban,
  type OpportunityKanbanUpdate,
} from "@/actions/opportunities";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatOpportunityDate,
  formatOpportunityPrice,
  formatOpportunityProbability,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
  getOpportunityResponsibleName,
  OPPORTUNITY_KANBAN_STATUSES,
} from "@/lib/opportunities/labels";
import type {
  OpportunityKanbanStatus,
  OpportunityListItem,
} from "@/lib/opportunities/types";
import { cn } from "@/lib/utils";

const COLUMN_WIDTH_CLASS = "w-72";

type Board = Record<OpportunityKanbanStatus, OpportunityListItem[]>;

function emptyBoard(): Board {
  return {
    suspect: [],
    prospect: [],
    besoin_specifie: [],
    proposition_envoyee: [],
    gagne: [],
    perdue: [],
  };
}

function buildBoard(items: OpportunityListItem[]): Board {
  const board = emptyBoard();
  const sorted = [...items].sort((a, b) => {
    const orderA = a.kanban_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.kanban_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.opportunity_name.localeCompare(b.opportunity_name, "fr");
  });
  for (const item of sorted) {
    board[item.kanban_status].push(item);
  }
  return board;
}

function findColumnForItem(
  board: Board,
  itemId: string,
): OpportunityKanbanStatus | null {
  for (const status of OPPORTUNITY_KANBAN_STATUSES) {
    if (board[status].some((item) => item.id === itemId)) {
      return status;
    }
  }
  return null;
}

function isColumnId(id: string): id is OpportunityKanbanStatus {
  return (OPPORTUNITY_KANBAN_STATUSES as string[]).includes(id);
}

function columnPriceTotals(items: OpportunityListItem[]): {
  priceSum: number;
  averagePriceSum: number;
} | null {
  if (items.length === 0) return null;
  let priceSum = 0;
  let averagePriceSum = 0;
  for (const item of items) {
    priceSum += item.price ?? 0;
    averagePriceSum += item.average_price ?? 0;
  }
  return { priceSum, averagePriceSum };
}

function boardToUpdates(board: Board): OpportunityKanbanUpdate[] {
  const updates: OpportunityKanbanUpdate[] = [];
  for (const status of OPPORTUNITY_KANBAN_STATUSES) {
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

function OpportunityKanbanCardContent({
  item,
}: {
  item: OpportunityListItem;
}) {
  return (
    <>
      <CardHeader className="space-y-2 p-3 pb-1">
        <CardTitle className="text-sm leading-snug">
          {item.opportunity_name}
        </CardTitle>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {item.categories.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">—</span>
            ) : (
              item.categories.slice(0, 2).map((category) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="text-[10px]"
                >
                  {category.label}
                </Badge>
              ))
            )}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {getOpportunityPriorityLabel(item.priority)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate">{item.client.client_name}</span>
          <span className="shrink-0 text-right">
            {getOpportunityResponsibleName(item.responsible)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-x-2">
            <span>{formatOpportunityPrice(item.price)}</span>
            <span>
              {formatOpportunityProbability(item.probability_confirmation)}
            </span>
          </div>
          <span className="shrink-0 text-primary-foreground">
            {formatOpportunityDate(item.end_at)}
          </span>
        </div>
      </CardContent>
    </>
  );
}

function KanbanColumnShell({
  status,
  items,
  children,
}: {
  status: OpportunityKanbanStatus;
  items: OpportunityListItem[];
  children: ReactNode;
}) {
  const totals = columnPriceTotals(items);

  return (
    <div
      className={cn(
        COLUMN_WIDTH_CLASS,
        "flex h-full min-h-0 shrink-0 flex-col rounded-lg border border-primary bg-card dark:border-secondary",
      )}
    >
      <div className="flex h-14 shrink-0 flex-col justify-center gap-1 border-b border-primary/20 px-3 dark:border-secondary/20">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-primary-foreground">
            {getOpportunityKanbanStatusLabel(status)}
          </h3>
          {items.length > 0 ? (
            <Badge variant="secondary" className="tabular-nums">
              {items.length}
            </Badge>
          ) : null}
        </div>
        <p className="min-h-4 text-xs text-ring">
          {totals
            ? `${formatOpportunityPrice(totals.priceSum)} (${formatOpportunityPrice(totals.averagePriceSum)})`
            : "\u00A0"}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {children}
      </div>
    </div>
  );
}

function StaticOpportunityCard({
  item,
  onOpen,
}: {
  item: OpportunityListItem;
  onOpen: (id: string) => void;
}) {
  return (
    <Card
      role="link"
      tabIndex={0}
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onOpen(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item.id);
        }
      }}
    >
      <OpportunityKanbanCardContent item={item} />
    </Card>
  );
}

function SortableOpportunityCard({
  item,
  onOpen,
}: {
  item: OpportunityListItem;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
          if (!isDragging) onOpen(item.id);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(item.id);
          }
        }}
      >
        <OpportunityKanbanCardContent item={item} />
      </Card>
    </div>
  );
}

function KanbanColumn({
  status,
  items,
  onOpen,
}: {
  status: OpportunityKanbanStatus;
  items: OpportunityListItem[];
  onOpen: (id: string) => void;
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
      <KanbanColumnShell status={status} items={items}>
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableOpportunityCard
              key={item.id}
              item={item}
              onOpen={onOpen}
            />
          ))}
        </SortableContext>
      </KanbanColumnShell>
    </div>
  );
}

type OpportunitiesKanbanProps = {
  items: OpportunityListItem[];
};

export function OpportunitiesKanban({ items }: OpportunitiesKanbanProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board>(() => buildBoard(items));
  const boardBeforeDragRef = useRef<Board | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const syncTokenRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setBoard(buildBoard(items));
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const status of OPPORTUNITY_KANBAN_STATUSES) {
      const found = board[status].find((item) => item.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, board]);

  const totalCount = useMemo(
    () =>
      OPPORTUNITY_KANBAN_STATUSES.reduce(
        (sum, status) => sum + board[status].length,
        0,
      ),
    [board],
  );

  const openOpportunity = (id: string) => {
    router.push(`/opportunities/${id}`);
  };

  const persistBoard = async (nextBoard: Board, previous: Board) => {
    const token = ++syncTokenRef.current;
    const previousUpdates = boardToUpdates(previous);
    const nextUpdates = boardToUpdates(nextBoard);
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

    const result = await updateOpportunitiesKanban(changed);
    if (token !== syncTokenRef.current) return;

    if (!result.success) {
      setBoard(previous);
      toast.error(result.error);
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

    const sourceStatus = findColumnForItem(previous, activeItemId);
    if (!sourceStatus) return;

    const destStatus = isColumnId(overId)
      ? overId
      : findColumnForItem(previous, overId);
    if (!destStatus) return;

    let nextBoard: Board;

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
      {OPPORTUNITY_KANBAN_STATUSES.map((status) =>
        mounted ? (
          <KanbanColumn
            key={status}
            status={status}
            items={board[status]}
            onOpen={openOpportunity}
          />
        ) : (
          <KanbanColumnShell
            key={status}
            status={status}
            items={board[status]}
          >
            {board[status].map((item) => (
              <StaticOpportunityCard
                key={item.id}
                item={item}
                onOpen={openOpportunity}
              />
            ))}
          </KanbanColumnShell>
        ),
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {mounted ? (
        <DndContext
          id="opportunities-kanban"
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
                <OpportunityKanbanCardContent item={activeItem} />
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        boardColumns
      )}
      <p className="shrink-0 text-sm text-muted-foreground">
        Nombre d&apos;opportunités : {totalCount}
      </p>
    </div>
  );
}
