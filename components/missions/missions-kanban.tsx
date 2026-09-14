"use client";

import { useRouter } from "next/navigation";
import { updateMissionsKanban } from "@/actions/missions";
import { EntityKanban } from "@/components/layout/entity-kanban";
import { MissionKanbanCardContent } from "@/components/missions/mission-kanban-card";
import {
  getMissionKanbanStatusLabel,
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
