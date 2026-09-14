"use client";

import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEndDateToneClass } from "@/lib/dates/end-date-tone";
import {
  formatMissionDate,
  getMissionResponsibleName,
  getMissionScopeLabel,
} from "@/lib/missions/labels";
import type { MissionListItem } from "@/lib/missions/types";
import { cn } from "@/lib/utils";

export function MissionKanbanCardContent({
  item,
}: {
  item: MissionListItem;
}) {
  return (
    <>
      <CardHeader className="space-y-2 p-3 pb-1">
        <CardTitle className="text-sm leading-snug">
          {item.mission_name}
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
            {getMissionScopeLabel(item.mission_scope)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 p-3 pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate">
            {item.mission_scope === "interne"
              ? "Interne"
              : (item.client?.client_name ?? "—")}
          </span>
          <span className="shrink-0 text-right">
            {getMissionResponsibleName(item.responsible)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">
            {item.opportunity?.opportunity_name ?? "—"}
          </span>
          <span
            className={cn(
              "shrink-0",
              getEndDateToneClass(item.end_at, {
                muted:
                  item.kanban_status === "terminee" ||
                  item.kanban_status === "archivee",
              }),
            )}
          >
            {formatMissionDate(item.start_at)}
            {item.end_at ? ` → ${formatMissionDate(item.end_at)}` : ""}
          </span>
        </div>
      </CardContent>
    </>
  );
}
