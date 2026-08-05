"use client";

import { useRouter } from "next/navigation";
import { updateOpportunitiesKanban } from "@/actions/opportunities";
import { EntityKanban } from "@/components/layout/entity-kanban";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <span
              className={cn(
                item.kanban_status === "perdue" && "text-destructive",
              )}
            >
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

type OpportunitiesKanbanProps = {
  items: OpportunityListItem[];
};

/** Vue Kanban opportunités — shell générique + totaux colonne + carte domaine. */
export function OpportunitiesKanban({ items }: OpportunitiesKanbanProps) {
  const router = useRouter();

  return (
    <EntityKanban
      dndId="opportunities-kanban"
      columnIds={OPPORTUNITY_KANBAN_STATUSES}
      items={items}
      buildBoard={buildBoard}
      getColumnTitle={getOpportunityKanbanStatusLabel}
      renderColumnMeta={(columnItems) => {
        const totals = columnPriceTotals(columnItems);
        return (
          <p className="min-h-4 text-xs text-ring">
            {totals
              ? `${formatOpportunityPrice(totals.priceSum)} (${formatOpportunityPrice(totals.averagePriceSum)})`
              : "\u00A0"}
          </p>
        );
      }}
      renderCard={(item) => <OpportunityKanbanCardContent item={item} />}
      onOpenItem={(id) => router.push(`/opportunities/${id}`)}
      persistUpdates={updateOpportunitiesKanban}
      countLabel="Nombre d'opportunités"
    />
  );
}
