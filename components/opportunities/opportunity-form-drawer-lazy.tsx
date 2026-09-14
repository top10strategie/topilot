"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function DrawerLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export const OpportunityFormDrawer = dynamic(
  () =>
    import("@/components/opportunities/opportunity-form-drawer").then(
      (mod) => mod.OpportunityFormDrawer,
    ),
  { ssr: false, loading: () => <DrawerLoading /> },
);
