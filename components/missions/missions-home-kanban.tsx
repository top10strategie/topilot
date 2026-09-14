"use client";

import { useRouter } from "next/navigation";
import { EntityKanbanReadonly } from "@/components/layout/entity-kanban-readonly";
import { MissionKanbanCardContent } from "@/components/missions/mission-kanban-card";
import { getMissionKanbanStatusLabel } from "@/lib/missions/labels";
import type {
  MissionKanbanStatus,
  MissionListItem,
} from "@/lib/missions/types";

const HOME_MISSION_COLUMNS: MissionKanbanStatus[] = ["a_faire", "en_cours"];

type HomeBoard = Record<"a_faire" | "en_cours", MissionListItem[]>;

function buildHomeBoard(items: MissionListItem[]): HomeBoard {
  const board: HomeBoard = { a_faire: [], en_cours: [] };
  const sorted = [...items].sort((a, b) => {
    const orderA = a.kanban_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.kanban_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.mission_name.localeCompare(b.mission_name, "fr");
  });
  for (const item of sorted) {
    if (item.kanban_status === "a_faire" || item.kanban_status === "en_cours") {
      board[item.kanban_status].push(item);
    }
  }
  return board;
}

type MissionsHomeKanbanProps = {
  items: MissionListItem[];
};

/** Kanban accueil missions — lecture seule, 2 colonnes, hauteur compacte. */
export function MissionsHomeKanban({ items }: MissionsHomeKanbanProps) {
  const router = useRouter();

  return (
    <EntityKanbanReadonly
      columnIds={HOME_MISSION_COLUMNS}
      items={items}
      buildBoard={buildHomeBoard}
      getColumnTitle={getMissionKanbanStatusLabel}
      renderCard={(item) => <MissionKanbanCardContent item={item} />}
      onOpenItem={(id) => router.push(`/missions/${id}`)}
      countLabel="Nombre de missions"
      boardClassName="h-[28rem]"
    />
  );
}
