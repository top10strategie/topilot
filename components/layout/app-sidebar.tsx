"use client";

import { GlobalSearchTrigger } from "@/components/layout/global-search-trigger";
import { LogoutDialog } from "@/components/layout/logout-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { CurrentCollaborator } from "@/lib/auth/collaborator-display";
import {
  getCollaboratorDisplayName,
  getCollaboratorInitials,
} from "@/lib/auth/collaborator-display";
import {
  isNavItemActive,
  primaryNavItems,
  secondaryNavItems,
} from "@/lib/navigation/menu";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AppSidebarProps = {
  collaborator: CurrentCollaborator | null;
};

export function AppSidebar({ collaborator }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const displayName = collaborator
    ? getCollaboratorDisplayName(collaborator)
    : "Utilisateur";
  const initials = collaborator
    ? getCollaboratorInitials(collaborator)
    : "?";

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={pathname === "/"}
              tooltip="TOPilot"
            >
              <Link href="/">
                {/* SVG local : balise img (next/image gère mal les SVG en public) */}
                <img
                  src="/logo_topilot.svg"
                  alt="TOPilot"
                  width={36}
                  height={36}
                  className="size-10 shrink-0"
                />
                <span className="truncate text-base font-semibold tracking-tight">
                  TOPilot
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" weight="regular" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-auto max-w-[80%]" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" weight="regular" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isMobile ? (
          <>
            <Separator className="mx-auto max-w-[80%]" />
            <SidebarGroup>
              <SidebarGroupContent className="flex flex-col gap-1 px-2">
                <GlobalSearchTrigger withLabel />
                <ThemeToggle withLabel />
                <LogoutDialog withLabel />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={isNavItemActive(pathname, "/settings")}
              tooltip={displayName}
            >
              <Link href="/settings">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{displayName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
