"use client";

import { BackButton } from "@/components/layout/back-button";
import { GlobalSearchTrigger } from "@/components/layout/global-search-trigger";
import { LogoutDialog } from "@/components/layout/logout-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { shouldShowBackButton } from "@/lib/navigation/path";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const showBack = shouldShowBackButton(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
      <div className="flex items-center gap-1">
        <SidebarTrigger className="md:hidden" />
        <SidebarTrigger className="hidden md:inline-flex lg:hidden" />
        {showBack ? <BackButton /> : null}
      </div>

      <div className="ml-auto hidden items-center gap-1 md:flex">
        <GlobalSearchTrigger />
        <ThemeToggle />
        <LogoutDialog />
      </div>
    </header>
  );
}
