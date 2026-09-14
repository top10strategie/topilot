"use client";

import { useRouter } from "next/navigation";
import { EntityKanbanReadonly } from "@/components/layout/entity-kanban-readonly";
import { OpportunityKanbanCardContent } from "@/components/opportunities/opportunity-kanban-card";
import {
  formatOpportunityPrice,
  getOpportunityKanbanStatusLabel,
} from "@/lib/opportunities/labels";
import type {
  OpportunityKanbanStatus,
  OpportunityListItem,
} from "@/lib/opportunities/types";

const HOME_OPPORTUNITY_COLUMNS: OpportunityKanbanStatus[] = [
  "suspect",
  "prospect",
  "besoin_specifie",
  "proposition_envoyee",
];

type HomeStatus =
  | "suspect"
  | "prospect"
  | "besoin_specifie"
  | "proposition_envoyee";

type HomeBoard = Record<HomeStatus, OpportunityListItem[]>;

function buildHomeBoard(items: OpportunityListItem[]): HomeBoard {
  const board: HomeBoard = {
    suspect: [],
    prospect: [],
    besoin_specifie: [],
    proposition_envoyee: [],
  };
  const sorted = [...items].sort((a, b) => {
    const orderA = a.kanban_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.kanban_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.opportunity_name.localeCompare(b.opportunity_name, "fr");
  });
  for (const item of sorted) {
    if (
      item.kanban_status === "suspect" ||
      item.kanban_status === "prospect" ||
      item.kanban_status === "besoin_specifie" ||
      item.kanban_status === "proposition_envoyee"
    ) {
      board[item.kanban_status].push(item);
    }
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

type OpportunitiesHomeKanbanProps = {
  items: OpportunityListItem[];
};

/** Kanban accueil opportunités — lecture seule, sans Gagné/Perdue, hauteur compacte. */
export function OpportunitiesHomeKanban({
  items,
}: OpportunitiesHomeKanbanProps) {
  const router = useRouter();

  return (
    <EntityKanbanReadonly
      columnIds={HOME_OPPORTUNITY_COLUMNS}
      items={items}
      buildBoard={buildHomeBoard}
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
      countLabel="Nombre d'opportunités"
      boardClassName="h-[28rem]"
    />
  );
}
