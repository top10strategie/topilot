import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppSidebarFallback } from "@/components/layout/app-sidebar-fallback";
import { DrawerStackHost } from "@/components/drawers/drawer-stack-host";
import { DrawerStackProvider } from "@/components/drawers/drawer-stack-context";
import { GlobalSearchDialog } from "@/components/search/global-search-dialog";
import { GlobalSearchProvider } from "@/components/search/global-search-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import type { CSSProperties, ReactNode } from "react";
import { Suspense } from "react";

async function AppSidebarWithUser() {
  const collaborator = await getCurrentCollaborator();
  return (
    <Suspense fallback={<AppSidebarFallback />}>
      <AppSidebar collaborator={collaborator} />
    </Suspense>
  );
}

export default function AppShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
    >
      <DrawerStackProvider>
        <GlobalSearchProvider>
          <Suspense fallback={<AppSidebarFallback />}>
            <AppSidebarWithUser />
          </Suspense>
          <SidebarInset className="flex max-h-svh flex-col overflow-hidden">
            <Suspense fallback={<div className="h-14 shrink-0 border-b" />}>
              <AppHeader />
            </Suspense>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </SidebarInset>
          <DrawerStackHost />
          <GlobalSearchDialog />
          <Toaster richColors position="top-right" />
        </GlobalSearchProvider>
      </DrawerStackProvider>
    </SidebarProvider>
  );
}
