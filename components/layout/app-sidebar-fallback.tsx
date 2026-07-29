"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

/** Fallback sans usePathname (compatible Cache Components / PPR). */
export function AppSidebarFallback() {
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="h-17 justify-center px-3">
        <div className="flex items-center gap-2">
          <img
            src="/logo_topilot.svg"
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 opacity-50"
          />
          <span className="truncate text-2xl font-semibold tracking-tight opacity-50 group-data-[collapsible=icon]:hidden">
            TOPilot
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent />
    </Sidebar>
  );
}
