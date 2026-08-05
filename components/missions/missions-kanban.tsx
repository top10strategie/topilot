"use client";

import { useRouter } from "next/navigation";
import { updateMissionsKanban } from "@/actions/missions";
import { EntityKanban } from "@/components/layout/entity-kanban";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatMissionDate,
  getMissionKanbanStatusLabel,
  getMissionResponsibleName,
  getMissionScopeLabel,
  MISSION_KANBAN_STATUSES,
} from "@/lib/missions/labels";
import type {
  MissionKanbanStatus,
  MissionListItem,
} from "@/lib/missions/types";

type Board = Record<MissionKanbanStatus, MissionListItem[]>;

function emptyBoard(): Board {
  return {
    a_faire: [],
    en_cours: [],
    terminee: [],
    archivee: [],
  };
}

function isRecentArchive(mission: MissionListItem): boolean {
  if (!mission.archived_at) return false;
  const archivedDate = new Date(mission.archived_at);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return archivedDate >= threeMonthsAgo;
}

function buildBoard(items: MissionListItem[]): Board {
  const board = emptyBoard();
  const sorted = [...items].sort((a, b) => {
    const orderA = a.kanban_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.kanban_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.mission_name.localeCompare(b.mission_name, "fr");
  });
  for (const item of sorted) {
    if (item.kanban_status === "archivee") {
      if (isRecentArchive(item)) {
        board.archivee.push(item);
      }
    } else {
      board[item.kanban_status].push(item);
    }
  }
  return board;
}

function MissionKanbanCardContent({ item }: { item: MissionListItem }) {
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
          <span className="shrink-0 text-primary-foreground">
            {formatMissionDate(item.start_at)}
            {item.end_at ? ` → ${formatMissionDate(item.end_at)}` : ""}
          </span>
        </div>
      </CardContent>
    </>
  );
}

type MissionsKanbanProps = {
  items: MissionListItem[];
};

/** Vue Kanban missions — shell générique + contenu carte domaine. */
export function MissionsKanban({ items }: MissionsKanbanProps) {
  const router = useRouter();

  return (
    <EntityKanban
      dndId="missions-kanban"
      columnIds={MISSION_KANBAN_STATUSES}
      items={items}
      buildBoard={buildBoard}
      getColumnTitle={getMissionKanbanStatusLabel}
      renderCard={(item) => <MissionKanbanCardContent item={item} />}
      onOpenItem={(id) => router.push(`/missions/${id}`)}
      persistUpdates={updateMissionsKanban}
      countLabel="Nombre de missions"
    />
  );
}
