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

export const WikiFormDrawer = dynamic(
  () =>
    import("@/components/wiki/wiki-form-drawer").then(
      (mod) => mod.WikiFormDrawer,
    ),
  { ssr: false, loading: () => <DrawerLoading /> },
);

export const WikiConsultationDrawer = dynamic(
  () =>
    import("@/components/wiki/wiki-consultation-drawer").then(
      (mod) => mod.WikiConsultationDrawer,
    ),
  { ssr: false, loading: () => <DrawerLoading /> },
);

export type WikiFormDrawerProps = ComponentProps<typeof WikiFormDrawer>;
