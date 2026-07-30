"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ListViewTab = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type ListViewTabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: ReactNode;
};

/**
 * Conteneur Tabs pour les vues liste (Cartes / Tableau / Kanban…).
 * Placer le switcher (`ListViewTabsSwitcher`) dans le Hero et les
 * `ListViewTabsContent` dans la zone de contenu — tous sous ce root.
 */
export function ListViewTabs({
  value,
  onValueChange,
  className,
  children,
}: ListViewTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn("flex min-h-0 flex-1 flex-col gap-0", className)}
    >
      {children}
    </Tabs>
  );
}

type ListViewTabsSwitcherProps = {
  tabs: ListViewTab[];
  className?: string;
  /** Affiche le libellé à côté de l'icône (recommandé dès 3 vues). */
  showLabels?: boolean;
};

/**
 * Switcher compact (ShadCN Tabs) pour le Hero des pages liste.
 * Adaptable à 2+ vues sans changer de présentation.
 */
export function ListViewTabsSwitcher({
  tabs,
  className,
  showLabels = true,
}: ListViewTabsSwitcherProps) {
  return (
    <TabsList
      variant="default"
      aria-label="Présentation de la liste"
      className={cn("h-8 shrink-0 gap-0.5 p-0.5", className)}
    >
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className={cn(
            "h-7 gap-1.5 rounded-md px-2.5 text-xs",
            !showLabels && "px-2",
          )}
          aria-label={tab.label}
          title={tab.label}
        >
          {tab.icon}
          {showLabels ? <span>{tab.label}</span> : null}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export function ListViewTabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsContent>) {
  return (
    <TabsContent
      className={cn("mt-0 flex min-h-0 flex-1 flex-col outline-none", className)}
      {...props}
    />
  );
}
