"use client";

import { useRouter } from "next/navigation";
import { updateOpportunitiesKanban } from "@/actions/opportunities";
import { EntityKanban } from "@/components/layout/entity-kanban";
import { OpportunityKanbanCardContent } from "@/components/opportunities/opportunity-kanban-card";
import {
  formatOpportunityPrice,
  getOpportunityKanbanStatusLabel,
  OPPORTUNITY_KANBAN_STATUSES,
} from "@/lib/opportunities/labels";
import type {
  OpportunityKanbanStatus,
  OpportunityListItem,
} from "@/lib/opportunities/types";

type Board = Record<OpportunityKanbanStatus, OpportunityListItem[]>;

const TERMINAL_STATUSES: OpportunityKanbanStatus[] = ["gagne", "perdue"];

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

function isRecentDue(opportunity: OpportunityListItem): boolean {
  if (!opportunity.due_date_at) return false;
  const dueDate = new Date(`${opportunity.due_date_at}T00:00:00`);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return dueDate >= threeMonthsAgo;
}

function compareByKanbanOrder(
  a: OpportunityListItem,
  b: OpportunityListItem,
): number {
  const orderA = a.kanban_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.kanban_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.opportunity_name.localeCompare(b.opportunity_name, "fr");
}

/** Plus récentes en haut ; sans due_date_at → en bas. */
function compareByDueDateDesc(
  a: OpportunityListItem,
  b: OpportunityListItem,
): number {
  if (a.due_date_at && b.due_date_at) {
    if (a.due_date_at !== b.due_date_at) {
      return b.due_date_at.localeCompare(a.due_date_at);
    }
  } else if (a.due_date_at) {
    return -1;
  } else if (b.due_date_at) {
    return 1;
  }
  return a.opportunity_name.localeCompare(b.opportunity_name, "fr");
}

function buildBoard(items: OpportunityListItem[]): Board {
  const board = emptyBoard();
  for (const item of items) {
    if (TERMINAL_STATUSES.includes(item.kanban_status)) {
      if (isRecentDue(item)) {
        board[item.kanban_status].push(item);
      }
    } else {
      board[item.kanban_status].push(item);
    }
  }
  for (const status of OPPORTUNITY_KANBAN_STATUSES) {
    board[status].sort(
      TERMINAL_STATUSES.includes(status)
        ? compareByDueDateDesc
        : compareByKanbanOrder,
    );
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
