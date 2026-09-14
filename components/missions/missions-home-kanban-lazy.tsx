"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const MissionsHomeKanban = dynamic(
  () =>
    import("@/components/missions/missions-home-kanban").then(
      (mod) => mod.MissionsHomeKanban,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);
