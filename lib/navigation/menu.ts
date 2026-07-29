import type { Icon } from "@phosphor-icons/react";
import {
  AddressBookTabs,
  BookOpen,
  Buildings,
  Cardholder,
  ChartDonut,
  CirclesFour,
  File,
  Intersect,
  Screwdriver,
} from "@phosphor-icons/react";

export type NavItem = {
  title: string;
  href: string;
  icon: Icon;
};

export const primaryNavItems: NavItem[] = [
  {
    title: "Top10 Stratégie",
    href: "/top10",
    icon: Buildings,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: AddressBookTabs,
  },
  {
    title: "Opportunités",
    href: "/opportunities",
    icon: Cardholder,
  },
  {
    title: "Missions",
    href: "/missions",
    icon: CirclesFour,
  },
  {
    title: "Outils",
    href: "/tools",
    icon: Screwdriver,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: File,
  },
  {
    title: "Wikis",
    href: "/wikis",
    icon: BookOpen,
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    title: "Études et Analyses",
    href: "/analyses",
    icon: ChartDonut,
  },
  {
    title: "Gestion Admin",
    href: "/administration",
    icon: Intersect,
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === "/") {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
