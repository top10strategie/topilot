"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const OpportunitiesHomeKanban = dynamic(
  () =>
    import("@/components/opportunities/opportunities-home-kanban").then(
      (mod) => mod.OpportunitiesHomeKanban,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);
