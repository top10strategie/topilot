"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FunnelSimple,
  MagnifyingGlass,
  PencilSimple,
  SquaresFour,
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
import type { ClientListItem } from "@/lib/clients/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import {
  computeToolMonthlyBadge,
  formatToolMonthlyBadge,
  hasActiveSubscriptionCost,
  monthlyCostEuros,
} from "@/lib/tools/pricing";
import type { ToolListItem } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

const TOOL_VIEW_TABS: ListViewTab[] = [
  {
    value: "cards",
    label: "Cartes",
    icon: <SquaresFour className="size-3.5" aria-hidden />,
  },
  {
    value: "table",
    label: "Tableau",
    icon: <Table className="size-3.5" aria-hidden />,
  },
];

type ToolsPageClientProps = {
  tools: ToolListItem[];
  categories: CategoryItem[];
  clients: ClientListItem[];
  collaborators: CollaboratorListItem[];
  canManagePrivacy: boolean;
};

const OWNER_INTERNE_ID = "__interne__";

type CostBucket = "all" | "lt10" | "10to20" | "gt20";

type Filters = {
  categoryIds: string[];
  clientIds: string[];
  costBucket: CostBucket;
  withSubscription: boolean;
  withoutSubscription: boolean;
};

const DEFAULT_FILTERS: Filters = {
  categoryIds: [],
  clientIds: [],
  costBucket: "all",
  withSubscription: false,
  withoutSubscription: false,
};

export function ToolsPageClient({
  tools,
  categories,
  clients,
  collaborators,
  canManagePrivacy,
}: ToolsPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPortalRef = useRef<HTMLDivElement>(null);
  const [toolPendingDelete, setToolPendingDelete] =
    useState<ToolListItem | null>(null);
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(
    () => new Set<string>(),
  );

  const visibleTools = useMemo(
    () => tools.filter((tool) => !optimisticallyRemovedIds.has(tool.id)),
    [tools, optimisticallyRemovedIds],
  );

  const ownerOptions = useMemo(
    () => [
      { id: OWNER_INTERNE_ID, label: "Interne" },
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

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return visibleTools.filter((item) => {
      if (filters.categoryIds.length > 0) {
        const ids = new Set(item.categories.map((c) => c.id));
        if (!filters.categoryIds.every((id) => ids.has(id))) return false;
      }

      if (filters.clientIds.length > 0) {
        const wantsInterne = filters.clientIds.includes(OWNER_INTERNE_ID);
        const selectedClientIds = filters.clientIds.filter(
          (id) => id !== OWNER_INTERNE_ID,
        );
        const isInterne = item.clients.length === 0;
        const matchesClient = selectedClientIds.some((id) =>
          item.clients.some((client) => client.id === id),
        );
        if (!((wantsInterne && isInterne) || matchesClient)) return false;
      }

      const badge = badgesByToolId.get(item.id) ?? { kind: "none" as const };
      const hasCost = hasActiveSubscriptionCost(badge);

      if (filters.withSubscription && !filters.withoutSubscription && !hasCost) {
        return false;
      }
      if (filters.withoutSubscription && !filters.withSubscription && hasCost) {
        return false;
      }

      if (filters.costBucket !== "all") {
        const monthly = monthlyCostEuros(badge);
        if (monthly == null) return false;
        if (filters.costBucket === "lt10" && monthly >= 10) return false;
        if (
          filters.costBucket === "10to20" &&
          (monthly < 10 || monthly > 20)
        ) {
          return false;
        }
        if (filters.costBucket === "gt20" && monthly <= 20) return false;
      }

      if (!q) return true;
      const blob = [
        item.tool_name,
        item.url,
        item.description,
        ...item.categories.map((c) => c.label),
        ...item.clients.map((c) => c.client_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [visibleTools, filters, query, badgesByToolId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    filters.categoryIds.length > 0 ||
    filters.clientIds.length > 0 ||
    filters.costBucket !== "all" ||
    filters.withSubscription ||
    filters.withoutSubscription;

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
        setPage(1);
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
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="pl-8"
                aria-label="Recherche contextuelle outils"
              />
            </div>
            <ListViewTabsSwitcher tabs={TOOL_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(filters);
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouvel outil" onClick={openCreate}>
              <PencilSimple className="size-4" />
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
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim() || hasActiveFilters
                ? "Aucun outil ne correspond aux critères."
                : "Aucun outil pour le moment. Créez-en un pour commencer."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((item) => {
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
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {query.trim() || hasActiveFilters
                        ? "Aucun outil ne correspond aux critères."
                        : "Aucun outil pour le moment. Créez-en un pour commencer."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => {
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
        count={filtered.length}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
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
                      costBucket: value as CostBucket,
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
                setDraftFilters(DEFAULT_FILTERS);
                setFilters(DEFAULT_FILTERS);
                setPage(1);
                setFilterOpen(false);
              }}
            >
              Effacer
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFilters(draftFilters);
                setPage(1);
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
