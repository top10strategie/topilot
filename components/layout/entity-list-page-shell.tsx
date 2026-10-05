"use client";

import type { ReactNode } from "react";
import { DuplicateConfirmDialog } from "@/components/layout/duplicate-confirm-dialog";
import { ListPaginationFooter } from "@/components/layout/list-pagination-footer";
import {
  ListViewTabs,
  ListViewTabsSwitcher,
  type ListViewTab,
} from "@/components/layout/list-view-tabs";
import { PageHero } from "@/components/layout/page-hero";
import { PageSearchInput } from "@/components/layout/page-search-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EntityListPageShellProps = {
  title: string;
  searchAriaLabel: string;
  view: string;
  onViewChange: (value: string) => void;
  viewTabs: ListViewTab[];
  query: string;
  onSearch: (query: string) => void;
  searchDisabled?: boolean;
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
  onSearch,
  searchDisabled = false,
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
            <PageSearchInput
              value={query}
              onSearch={onSearch}
              aria-label={searchAriaLabel}
              disabled={searchDisabled}
            />
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
