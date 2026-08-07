"use client";

import type { ReactNode } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { DuplicateConfirmDialog } from "@/components/layout/duplicate-confirm-dialog";
import { ListPaginationFooter } from "@/components/layout/list-pagination-footer";
import {
  ListViewTabs,
  ListViewTabsSwitcher,
  type ListViewTab,
} from "@/components/layout/list-view-tabs";
import { PageHero } from "@/components/layout/page-hero";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EntityListPageShellProps = {
  title: string;
  searchAriaLabel: string;
  view: string;
  onViewChange: (value: string) => void;
  viewTabs: ListViewTab[];
  query: string;
  onQueryChange: (value: string) => void;
  /** Actions après search + switcher (filtres, créer, …). */
  toolbarActions?: ReactNode;
  /** Contenu des TabsContent (kanban / cartes / tableau). */
  children: ReactNode;
  /** overflow kanban vs scroll listes. */
  kanbanLayout?: boolean;
  pagination?: {
    countLabel: string;
    count: number;
    page: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  } | null;
  duplicate?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityLabel: "mission" | "opportunité";
    entityName: string;
    onConfirm: () => void;
  } | null;
  filterDialog?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    portalRef?: React.RefObject<HTMLDivElement | null>;
    children: ReactNode;
    footer: ReactNode;
  } | null;
};

/**
 * Chrome commun des listes missions / opportunités :
 * hero (recherche + vues + actions), zone contenu, pagination, duplicate, filtres.
 */
export function EntityListPageShell({
  title,
  searchAriaLabel,
  view,
  onViewChange,
  viewTabs,
  query,
  onQueryChange,
  toolbarActions,
  children,
  kanbanLayout = false,
  pagination = null,
  duplicate = null,
  filterDialog = null,
}: EntityListPageShellProps) {
  return (
    <ListViewTabs value={view} onValueChange={onViewChange}>
      <PageHero
        title={title}
        actions={
          <div className="flex w-full max-w-xl flex-wrap items-center gap-2 md:w-auto md:max-w-none md:flex-nowrap">
            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto md:w-72 md:flex-none lg:w-80">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher…"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="pl-8"
                aria-label={searchAriaLabel}
              />
            </div>
            <ListViewTabsSwitcher tabs={viewTabs} showLabels={false} />
            {toolbarActions}
          </div>
        }
      />

      <div
        className={cn(
          "min-h-0 flex-1 px-4 py-4 md:px-6",
          kanbanLayout
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto",
        )}
      >
        {children}
      </div>

      {pagination ? (
        <ListPaginationFooter
          countLabel={pagination.countLabel}
          count={pagination.count}
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      ) : null}

      {duplicate ? (
        <DuplicateConfirmDialog
          open={duplicate.open}
          onOpenChange={duplicate.onOpenChange}
          entityLabel={duplicate.entityLabel}
          entityName={duplicate.entityName}
          onConfirm={duplicate.onConfirm}
        />
      ) : null}

      {filterDialog ? (
        <Dialog
          open={filterDialog.open}
          onOpenChange={filterDialog.onOpenChange}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-visible sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{filterDialog.title}</DialogTitle>
            </DialogHeader>
            <div className="relative py-2">
              {filterDialog.portalRef ? (
                <div
                  ref={filterDialog.portalRef}
                  data-slot="dialog-portal-container"
                  className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
                />
              ) : null}
              {filterDialog.children}
            </div>
            <DialogFooter>{filterDialog.footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </ListViewTabs>
  );
}
