"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chargement différé du Kanban opportunités (évite d'embarquer @dnd-kit hors vue kanban).
 */
export const OpportunitiesKanban = dynamic(
  () =>
    import("@/components/opportunities/opportunities-kanban").then(
      (mod) => mod.OpportunitiesKanban,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);
