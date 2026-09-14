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

export const ClientFormDrawer = dynamic(
  () =>
    import("@/components/clients/client-form-drawer").then(
      (mod) => mod.ClientFormDrawer,
    ),
  { ssr: false, loading: () => <DrawerLoading /> },
);

export type ClientFormDrawerProps = ComponentProps<typeof ClientFormDrawer>;
