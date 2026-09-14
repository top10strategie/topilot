"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
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

export const MissionFormDrawer = dynamic(
  () =>
    import("@/components/missions/mission-form-drawer").then(
      (mod) => mod.MissionFormDrawer,
    ),
  { ssr: false, loading: () => <DrawerLoading /> },
);

export type MissionFormDrawerProps = ComponentProps<typeof MissionFormDrawer>;
