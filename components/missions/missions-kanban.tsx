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

const TERMINAL_STATUSES: MissionKanbanStatus[] = ["terminee", "archivee"];

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

function compareByKanbanOrder(a: MissionListItem, b: MissionListItem): number {
  const orderA = a.kanban_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.kanban_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.mission_name.localeCompare(b.mission_name, "fr");
}

/** Plus récentes en haut ; sans end_at → en bas. */
function compareByEndAtDesc(a: MissionListItem, b: MissionListItem): number {
  if (a.end_at && b.end_at) {
    if (a.end_at !== b.end_at) return b.end_at.localeCompare(a.end_at);
  } else if (a.end_at) {
    return -1;
  } else if (b.end_at) {
    return 1;
  }
  return a.mission_name.localeCompare(b.mission_name, "fr");
}

function buildBoard(items: MissionListItem[]): Board {
  const board = emptyBoard();
  for (const item of items) {
    if (item.kanban_status === "archivee") {
      if (isRecentArchive(item)) {
        board.archivee.push(item);
      }
    } else {
      board[item.kanban_status].push(item);
    }
  }
  for (const status of MISSION_KANBAN_STATUSES) {
    board[status].sort(
      TERMINAL_STATUSES.includes(status)
        ? compareByEndAtDesc
        : compareByKanbanOrder,
    );
  }
  return board;
}

type MissionsKanbanProps = {
  items: MissionListItem[];
  /** Colonnes closes en vague 2 : skeletons de cartes jusqu’à réception. */
  closedColumnsLoading?: boolean;
};

/** Vue Kanban missions — shell générique + contenu carte domaine. */
export function MissionsKanban({
  items,
  closedColumnsLoading = false,
}: MissionsKanbanProps) {
  const router = useRouter();

  return (
    <EntityKanban
      dndId="missions-kanban"
      columnIds={MISSION_KANBAN_STATUSES}
      items={items}
      buildBoard={buildBoard}
      getColumnTitle={getMissionKanbanStatusLabel}
      loadingColumnIds={
        closedColumnsLoading ? TERMINAL_STATUSES : undefined
      }
      renderCard={(item) => <MissionKanbanCardContent item={item} />}
      onOpenItem={(id) => router.push(`/missions/${id}`)}
      persistUpdates={updateMissionsKanban}
      countLabel="Nombre de missions"
    />
  );
}
