"use client";

import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEndDateToneClass } from "@/lib/dates/end-date-tone";
import {
  formatOpportunityDate,
  formatOpportunityPrice,
  formatOpportunityProbability,
  getOpportunityPriorityLabel,
  getOpportunityResponsibleName,
} from "@/lib/opportunities/labels";
import type { OpportunityListItem } from "@/lib/opportunities/types";
import { cn } from "@/lib/utils";

export function OpportunityKanbanCardContent({
  item,
}: {
  item: OpportunityListItem;
}) {
  return (
    <>
      <CardHeader className="space-y-2 p-3 pb-1">
        <CardTitle className="text-sm leading-snug uppercase">
          {item.client.client_name}
        </CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-1 text-[11px] text-muted-foreground">
        <p className="truncate text-xs font-semibold text-foreground">
          {item.opportunity_name}
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate">
            {getOpportunityResponsibleName(item.responsible)}
          </span>
          <span className="shrink-0">
            {getOpportunityPriorityLabel(item.priority)}
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
          <span
            className={cn(
              "shrink-0",
              getEndDateToneClass(item.due_date_at, {
                muted:
                  item.kanban_status === "gagne" ||
                  item.kanban_status === "perdue",
              }),
            )}
          >
            {formatOpportunityDate(item.due_date_at)}
          </span>
        </div>
      </CardContent>
    </>
  );
}
