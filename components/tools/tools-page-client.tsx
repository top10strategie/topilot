"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cards,
  FunnelSimple,
  MagnifyingGlass,
  StackPlus,
  Table,
  Trash,
} from "@phosphor-icons/react";
import { deleteToolRecord } from "@/actions/tools";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { ListPaginationFooter } from "@/components/layout/list-pagination-footer";
import {
  ListViewTabs,
  ListViewTabsContent,
  ListViewTabsSwitcher,
  type ListViewTab,
} from "@/components/layout/list-view-tabs";
import { PageHero } from "@/components/layout/page-hero";
import { DeleteToolDialog } from "@/components/tools/delete-tool-dialog";
import { ToolFormDrawer } from "@/components/tools/tool-form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryItem } from "@/lib/categories/types";
import type { ClientOption } from "@/lib/clients/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import {
  computeToolMonthlyBadge,
  formatToolMonthlyBadge,
} from "@/lib/tools/pricing";
import {
  DEFAULT_TOOLS_LIST_FILTERS,
  TOOLS_OWNER_INTERNE_ID,
  TOOLS_PAGE_SIZE,
  toolsListHref,
  type ToolsCostBucket,
  type ToolsListFilters,
} from "@/lib/tools/list-filters";
import type { ToolListItem } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

const TOOL_VIEW_TABS: ListViewTab[] = [
  {
    value: "cards",
    label: "Cartes",
    icon: <Cards className="size-3.5" aria-hidden />,
  },
  {
    value: "table",
    label: "Tableau",
    icon: <Table className="size-3.5" aria-hidden />,
  },
];

type ToolsPageClientProps = {
  tools: ToolListItem[];
  totalCount: number;
  filters?: ToolsListFilters;
  categories: CategoryItem[];
  clients: ClientOption[];
  collaborators: CollaboratorListItem[];
  canManagePrivacy: boolean;
};

type DialogFilters = Pick<
  ToolsListFilters,
  | "categoryIds"
  | "clientIds"
  | "costBucket"
  | "withSubscription"
  | "withoutSubscription"
>;

function toDialogFilters(filters: ToolsListFilters): DialogFilters {
  return {
    categoryIds: filters.categoryIds,
    clientIds: filters.clientIds,
    costBucket: filters.costBucket,
    withSubscription: filters.withSubscription,
    withoutSubscription: filters.withoutSubscription,
  };
}

function hasActiveFilters(filters: ToolsListFilters): boolean {
  return (
    Boolean(filters.q.trim()) ||
    filters.categoryIds.length > 0 ||
    filters.clientIds.length > 0 ||
    filters.costBucket !== DEFAULT_TOOLS_LIST_FILTERS.costBucket ||
    filters.withSubscription ||
    filters.withoutSubscription
  );
}

export function ToolsPageClient({
  tools,
  totalCount,
  filters: filtersProp,
  categories,
  clients,
  collaborators,
  canManagePrivacy,
}: ToolsPageClientProps) {
  const filters = filtersProp ?? DEFAULT_TOOLS_LIST_FILTERS;
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [draftFilters, setDraftFilters] = useState<DialogFilters>(() =>
    toDialogFilters(filters),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPortalRef = useRef<HTMLDivElement>(null);
  const [toolPendingDelete, setToolPendingDelete] =
    useState<ToolListItem | null>(null);
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(
    () => new Set<string>(),
  );

  const navigate = (next: ToolsListFilters) => {
    startTransition(() => {
      router.push(toolsListHref(next));
    });
  };

  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  useEffect(() => {
    setDraftFilters(toDialogFilters(filters));
  }, [filters]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === filters.q) return;
    const handle = window.setTimeout(() => {
      navigate({ ...filters, q: trimmed, page: 1 });
    }, 300);
    return () => window.clearTimeout(handle);
    // Intentionnel : debounce sur la saisie locale uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const visibleTools = useMemo(
    () => tools.filter((tool) => !optimisticallyRemovedIds.has(tool.id)),
    [tools, optimisticallyRemovedIds],
  );

  const ownerOptions = useMemo(
    () => [
      { id: TOOLS_OWNER_INTERNE_ID, label: "Interne" },
      ...[...clients]
        .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr"))
        .map((client) => ({ id: client.id, label: client.client_name })),
    ],
    [clients],
  );

  const draftSelectedCategories = useMemo(
    () =>
      categories.filter((category) =>
        draftFilters.categoryIds.includes(category.id),
      ),
    [categories, draftFilters.categoryIds],
  );

  const draftSelectedOwners = useMemo(
    () =>
      ownerOptions.filter((owner) =>
        draftFilters.clientIds.includes(owner.id),
      ),
    [ownerOptions, draftFilters.clientIds],
  );

  const badgesByToolId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeToolMonthlyBadge>>();
    for (const tool of visibleTools) {
      map.set(tool.id, computeToolMonthlyBadge(tool.subscriptions));
    }
    return map;
  }, [visibleTools]);

  const totalPages = Math.max(1, Math.ceil(totalCount / TOOLS_PAGE_SIZE));
  const emptyMessage = hasActiveFilters(filters)
    ? "Aucun outil ne correspond aux critères."
    : "Aucun outil pour le moment. Créez-en un pour commencer.";

  const openCreate = () => {
    void pushDrawer({
      title: "Nouvel outil",
      content: (helpers) => (
        <ToolFormDrawer
          mode="create"
          availableCategories={categories}
          clients={clients.map((c) => ({
            id: c.id,
            client_name: c.client_name,
          }))}
          collaborators={collaborators}
          canManagePrivacy={canManagePrivacy}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const handleDelete = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!toolPendingDelete) return { success: false };
    const id = toolPendingDelete.id;
    setOptimisticallyRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const result = await deleteToolRecord(id);
    if (!result.success) {
      setOptimisticallyRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return { success: false, error: result.error };
    }
    return { success: true };
  };

  return (
    <ListViewTabs
      value={view}
      onValueChange={(value) => {
        setView(value as "cards" | "table");
      }}
    >
      <PageHero
        title="Outils"
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
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                aria-label="Recherche contextuelle outils"
                disabled={isPending}
              />
            </div>
            <ListViewTabsSwitcher tabs={TOOL_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(toDialogFilters(filters));
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouvel outil" onClick={openCreate}>
              <StackPlus className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6",
        )}
      >
        <ListViewTabsContent value="cards" className="flex-none">
          {visibleTools.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTools.map((item) => {
                const badge = badgesByToolId.get(item.id) ?? {
                  kind: "none" as const,
                };
                const monthlyLabel = formatToolMonthlyBadge(badge);
                return (
                  <Link key={item.id} href={`/tools/${item.id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/40">
                      <CardHeader className="space-y-2 p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-snug">
                            {item.tool_name}
                          </CardTitle>
                          {monthlyLabel ? (
                            <Badge variant="secondary" className="shrink-0">
                              {monthlyLabel}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {item.categories.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            item.categories.slice(0, 3).map((category) => (
                              <Badge key={category.id} variant="secondary">
                                {category.label}
                              </Badge>
                            ))
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-xs text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-2">
                          <p
                            className="min-w-0 flex-1 truncate"
                            title={item.url}
                          >
                            {item.url}
                          </p>
                          <IconActionButton
                            label="Supprimer l'outil"
                            attention
                            className="shrink-0"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setToolPendingDelete(item);
                            }}
                          >
                            <Trash className="size-4" />
                          </IconActionButton>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </ListViewTabsContent>

        <ListViewTabsContent value="table" className="flex-none">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Lien direct</th>
                  <th className="px-3 py-2 font-medium">Catégories</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Coût mensuel</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTools.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  visibleTools.map((item) => {
                    const badge = badgesByToolId.get(item.id) ?? {
                      kind: "none" as const,
                    };
                    const monthlyLabel = formatToolMonthlyBadge(badge);
                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                        onClick={() => router.push(`/tools/${item.id}`)}
                      >
                        <td className="px-3 py-2 font-medium">
                          {item.tool_name}
                        </td>
                        <td className="max-w-64 truncate px-3 py-2 text-muted-foreground">
                          {item.url}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {item.categories.map((c) => c.label).join(", ") ||
                            "—"}
                        </td>
                        <td className="max-w-80 truncate px-3 py-2 text-muted-foreground">
                          {item.description || "—"}
                        </td>
                        <td className="px-3 py-2">{monthlyLabel ?? "—"}</td>
                        <td className="px-3 py-2">
                          <IconActionButton
                            label="Supprimer l'outil"
                            attention
                            onClick={(event) => {
                              event.stopPropagation();
                              setToolPendingDelete(item);
                            }}
                          >
                            <Trash className="size-4" />
                          </IconActionButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ListViewTabsContent>
      </div>

      <ListPaginationFooter
        countLabel="Nombre d'outils"
        count={totalCount}
        page={filters.page}
        totalPages={totalPages}
        pageSize={TOOLS_PAGE_SIZE}
        onPageChange={(page) => navigate({ ...filters, page })}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-visible sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtres outils</DialogTitle>
          </DialogHeader>
          <div className="relative py-2">
            <div
              ref={filterPortalRef}
              data-slot="dialog-portal-container"
              className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <Label>Catégories</Label>
                <CategoryMultiCombobox
                  className="w-full"
                  items={categories}
                  value={draftSelectedCategories}
                  onValueChange={(next) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      categoryIds: next.map((item) => item.id),
                    }))
                  }
                  placeholder="Filtrer par catégories…"
                  emptyListMessage="Aucune catégorie"
                  container={filterPortalRef}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label>Propriétaire</Label>
                <CategoryMultiCombobox
                  className="w-full"
                  items={ownerOptions}
                  value={draftSelectedOwners}
                  onValueChange={(next) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      clientIds: next.map((item) => item.id),
                    }))
                  }
                  placeholder="Filtrer par propriétaire…"
                  emptyListMessage="Aucun propriétaire"
                  container={filterPortalRef}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label>Coût mensuel</Label>
                <Select
                  value={draftFilters.costBucket}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      costBucket: value as ToolsCostBucket,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="lt10">&lt; 10 €</SelectItem>
                    <SelectItem value="10to20">10 – 20 €</SelectItem>
                    <SelectItem value="gt20">&gt; 20 €</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label>Abonnement</Label>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      id="with_subscription"
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={draftFilters.withSubscription}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          withSubscription: event.target.checked,
                        }))
                      }
                    />
                    <Label
                      htmlFor="with_subscription"
                      className="font-normal"
                    >
                      Avec abonnement
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="without_subscription"
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={draftFilters.withoutSubscription}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          withoutSubscription: event.target.checked,
                        }))
                      }
                    />
                    <Label
                      htmlFor="without_subscription"
                      className="font-normal"
                    >
                      Sans abonnement
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cleared = toDialogFilters(DEFAULT_TOOLS_LIST_FILTERS);
                setDraftFilters(cleared);
                navigate({
                  ...filters,
                  ...cleared,
                  page: 1,
                });
                setFilterOpen(false);
              }}
            >
              Effacer
            </Button>
            <Button
              type="button"
              onClick={() => {
                navigate({
                  ...filters,
                  ...draftFilters,
                  page: 1,
                });
                setFilterOpen(false);
              }}
            >
              Filtrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toolPendingDelete ? (
        <DeleteToolDialog
          open={Boolean(toolPendingDelete)}
          onOpenChange={(open) => {
            if (!open) setToolPendingDelete(null);
          }}
          toolName={toolPendingDelete.tool_name}
          onConfirm={handleDelete}
          onDeleted={() => {
            setToolPendingDelete(null);
            router.refresh();
          }}
        />
      ) : null}
    </ListViewTabs>
  );
}
