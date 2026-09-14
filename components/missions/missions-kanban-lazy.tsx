"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chargement différé du Kanban missions (évite d'embarquer @dnd-kit hors vue kanban).
 */
export const MissionsKanban = dynamic(
  () =>
    import("@/components/missions/missions-kanban").then(
      (mod) => mod.MissionsKanban,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);
