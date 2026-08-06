"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CopySimple,
  FunnelSimple,
  Kanban,
  PencilSimple,
  SquaresFour,
  Table,
} from "@phosphor-icons/react";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityListPageShell } from "@/components/layout/entity-list-page-shell";
import { IconActionButton } from "@/components/layout/icon-action-button";
import {
  ListViewTabsContent,
  type ListViewTab,
} from "@/components/layout/list-view-tabs";
import { OpportunityFormDrawer } from "@/components/opportunities/opportunity-form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { buildOpportunityDuplicatePrefill } from "@/lib/crm/duplicate-prefill";
import {
  formatOpportunityDate,
  formatOpportunityPrice,
  formatOpportunityProbability,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
  getOpportunityResponsibleName,
  OPPORTUNITY_KANBAN_STATUSES,
  OPPORTUNITY_PRIORITIES,
} from "@/lib/opportunities/labels";
import type {
  OpportunityContactOption,
  OpportunityKanbanStatus,
  OpportunityListItem,
  OpportunityPriority,
} from "@/lib/opportunities/types";

const OpportunitiesKanban = dynamic(
  () =>
    import("@/components/opportunities/opportunities-kanban").then((m) => ({
      default: m.OpportunitiesKanban,
    })),
  { ssr: false },
);

const PAGE_SIZE = 24;

const OPPORTUNITY_VIEW_TABS: ListViewTab[] = [
  {
    value: "kanban",
    label: "Kanban",
    icon: <Kanban className="size-3.5" aria-hidden />,
  },
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

type OpportunitiesPageClientProps = {
  opportunities: OpportunityListItem[];
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  contacts: OpportunityContactOption[];
  categories: CategoryItem[];
};

type Filters = {
  clientId: string;
  responsibleId: string;
  teamId: string;
  categoryIds: string[];
  amountBucket: "all" | "lt5k" | "5to20k" | "gt20k";
  statuses: OpportunityKanbanStatus[];
  probabilityBucket: "all" | "lt30" | "30to50" | "gt50";
  priority: OpportunityPriority | "";
  includeArchived: boolean;
};

const DEFAULT_FILTERS: Filters = {
  clientId: "",
  responsibleId: "",
  teamId: "",
  categoryIds: [],
  amountBucket: "all",
  statuses: [],
  probabilityBucket: "all",
  priority: "",
  includeArchived: false,
};

export function OpportunitiesPageClient({
  opportunities,
  collaborators,
  clients,
  contacts,
  categories,
}: OpportunitiesPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"kanban" | "cards" | "table">("kanban");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] =
    useState<OpportunityListItem | null>(null);
  const filterPortalRef = useRef<HTMLDivElement>(null);

  const draftSelectedCategories = useMemo(
    () =>
      categories.filter((category) =>
        draftFilters.categoryIds.includes(category.id),
      ),
    [categories, draftFilters.categoryIds],
  );

  const responsibleOptions = useMemo(
    () =>
      collaborators
        .filter((c) => c.status === "actif")
        .sort((a, b) =>
          getCollaboratorFullName(a).localeCompare(
            getCollaboratorFullName(b),
            "fr",
          ),
        ),
    [collaborators],
  );

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of collaborators) {
      if (person.team_id && person.team_name) {
        map.set(person.team_id, person.team_name);
      }
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [collaborators]);

  const teamIdByCollaboratorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of collaborators) {
      map.set(person.id, person.team_id);
    }
    return map;
  }, [collaborators]);

  const clientOptions = useMemo(
    () =>
      [...clients].sort((a, b) =>
        a.client_name.localeCompare(b.client_name, "fr"),
      ),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return opportunities.filter((item) => {
      // Kanban affiche les colonnes Gagné/Perdue : ne pas masquer les archivées.
      if (view !== "kanban" && !item.is_active) {
        const statusSelected = filters.statuses.includes(item.kanban_status);
        if (!filters.includeArchived && !statusSelected) return false;
      }

      if (filters.clientId && item.client_id !== filters.clientId) {
        return false;
      }

      if (
        filters.responsibleId &&
        item.responsible.id !== filters.responsibleId
      ) {
        return false;
      }

      if (filters.teamId) {
        const teamId = teamIdByCollaboratorId.get(item.responsible.id);
        if (teamId !== filters.teamId) return false;
      }

      if (filters.categoryIds.length > 0) {
        const ids = new Set(item.categories.map((c) => c.id));
        if (!filters.categoryIds.every((id) => ids.has(id))) return false;
      }

      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(item.kanban_status)) return false;
      }

      if (filters.priority && item.priority !== filters.priority) {
        return false;
      }

      const amount = item.price ?? 0;
      if (filters.amountBucket === "lt5k" && amount >= 5000) return false;
      if (
        filters.amountBucket === "5to20k" &&
        (amount < 5000 || amount > 20000)
      ) {
        return false;
      }
      if (filters.amountBucket === "gt20k" && amount <= 20000) return false;

      const prob = item.probability_confirmation;
      if (filters.probabilityBucket === "lt30" && prob >= 30) return false;
      if (
        filters.probabilityBucket === "30to50" &&
        (prob < 30 || prob > 50)
      ) {
        return false;
      }
      if (filters.probabilityBucket === "gt50" && prob <= 50) return false;

      if (!q) return true;
      const blob = [
        item.opportunity_name,
        item.client.client_name,
        getOpportunityResponsibleName(item.responsible),
        getOpportunityKanbanStatusLabel(item.kanban_status),
        getOpportunityPriorityLabel(item.priority),
        ...item.categories.map((c) => c.label),
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [opportunities, filters, query, view, teamIdByCollaboratorId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    filters.includeArchived ||
    Boolean(filters.clientId) ||
    Boolean(filters.responsibleId) ||
    Boolean(filters.teamId) ||
    filters.categoryIds.length > 0 ||
    filters.statuses.length > 0 ||
    Boolean(filters.priority) ||
    filters.amountBucket !== "all" ||
    filters.probabilityBucket !== "all";

  const openCreate = (duplicateSource?: OpportunityListItem) => {
    void pushDrawer({
      title: "Nouvelle opportunité",
      content: (helpers) => (
        <OpportunityFormDrawer
          mode="create"
          collaborators={collaborators}
          clients={clients}
          contacts={contacts}
          availableCategories={categories}
          duplicatePrefill={
            duplicateSource
              ? buildOpportunityDuplicatePrefill(duplicateSource)
              : undefined
          }
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const requestDuplicate = (
    event: MouseEvent,
    item: OpportunityListItem,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDuplicateTarget(item);
  };

  const toggleDraftStatus = (status: OpportunityKanbanStatus) => {
    setDraftFilters((prev) => {
      const has = prev.statuses.includes(status);
      return {
        ...prev,
        statuses: has
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status],
      };
    });
  };

  return (
    <EntityListPageShell
      title="Opportunités"
      searchAriaLabel="Recherche contextuelle opportunités"
      view={view}
      onViewChange={(value) => {
        setView(value as "kanban" | "cards" | "table");
        setPage(1);
      }}
      viewTabs={OPPORTUNITY_VIEW_TABS}
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setPage(1);
      }}
      toolbarActions={
        <>
          <IconActionButton
            label="Filtres"
            onClick={() => {
              setDraftFilters(filters);
              setFilterOpen(true);
            }}
          >
            <FunnelSimple className="size-4" />
          </IconActionButton>
          <IconActionButton
            label="Nouvelle opportunité"
            onClick={() => openCreate()}
          >
            <PencilSimple className="size-4" />
          </IconActionButton>
        </>
      }
      kanbanLayout={view === "kanban"}
      pagination={
        view !== "kanban"
          ? {
              countLabel: "Nombre d'opportunités",
              count: filtered.length,
              page,
              totalPages,
              pageSize: PAGE_SIZE,
              onPageChange: setPage,
            }
          : null
      }
      duplicate={{
        open: duplicateTarget != null,
        onOpenChange: (open) => {
          if (!open) setDuplicateTarget(null);
        },
        entityLabel: "opportunité",
        entityName: duplicateTarget?.opportunity_name ?? "",
        onConfirm: () => {
          if (duplicateTarget) openCreate(duplicateTarget);
        },
      }}
      filterDialog={{
        open: filterOpen,
        onOpenChange: setFilterOpen,
        title: "Filtres opportunités",
        portalRef: filterPortalRef,
        children: (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label>Client</Label>
              <Select
                value={draftFilters.clientId || "all"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    clientId: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {clientOptions.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Responsable</Label>
              <Select
                value={draftFilters.responsibleId || "all"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    responsibleId: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {responsibleOptions.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {getCollaboratorFullName(person)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Pôle</Label>
              <Select
                value={draftFilters.teamId || "all"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    teamId: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>Montant</Label>
              <Select
                value={draftFilters.amountBucket}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    amountBucket: value as Filters["amountBucket"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="lt5k">&lt; 5 000 €</SelectItem>
                  <SelectItem value="5to20k">5 000 – 20 000 €</SelectItem>
                  <SelectItem value="gt20k">&gt; 20 000 €</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Statut</Label>
              <div className="flex flex-wrap gap-1.5">
                {OPPORTUNITY_KANBAN_STATUSES.map((status) => {
                  const selected = draftFilters.statuses.includes(status);
                  return (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => toggleDraftStatus(status)}
                    >
                      {getOpportunityKanbanStatusLabel(status)}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Sans sélection : tous les statuts (hors archivées sauf option
                ci-dessous).
              </p>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Probabilité</Label>
              <Select
                value={draftFilters.probabilityBucket}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    probabilityBucket: value as Filters["probabilityBucket"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="lt30">&lt; 30 %</SelectItem>
                  <SelectItem value="30to50">30 – 50 %</SelectItem>
                  <SelectItem value="gt50">&gt; 50 %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-2">
              <Label>Urgence</Label>
              <Select
                value={draftFilters.priority || "all"}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    priority:
                      value === "all" ? "" : (value as OpportunityPriority),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {OPPORTUNITY_PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {getOpportunityPriorityLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="include_archived"
                type="checkbox"
                className="size-4 rounded border"
                checked={draftFilters.includeArchived}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    includeArchived: event.target.checked,
                  }))
                }
              />
              <Label htmlFor="include_archived" className="font-normal">
                Inclure les opportunités archivées (gagné / perdue)
              </Label>
            </div>
          </div>
        ),
        footer: (
          <>
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
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFilters(draftFilters);
                setPage(1);
                setFilterOpen(false);
              }}
            >
              Appliquer
            </Button>
          </>
        ),
      }}
    >
      <ListViewTabsContent value="kanban" className="min-h-0 flex-1">
        <OpportunitiesKanban items={filtered} />
      </ListViewTabsContent>

      <ListViewTabsContent value="cards" className="flex-none">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query.trim() || hasActiveFilters
              ? "Aucune opportunité ne correspond aux critères."
              : "Aucune opportunité pour le moment. Créez-en une pour commencer."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((item) => (
              <Link key={item.id} href={`/opportunities/${item.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader className="space-y-2 p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="min-w-0 text-base leading-snug">
                        {item.opportunity_name}
                      </CardTitle>
                      <IconActionButton
                        label="Dupliquer l'opportunité"
                        className="shrink-0"
                        onClick={(event) => requestDuplicate(event, item)}
                      >
                        <CopySimple className="size-4" />
                      </IconActionButton>
                    </div>
                    <div className="flex items-start justify-between gap-2">
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
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {getOpportunityPriorityLabel(item.priority)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 p-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {item.client.client_name}
                      </span>
                      <span className="shrink-0 text-right">
                        {getOpportunityResponsibleName(item.responsible)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge variant="outline" className="font-normal">
                          {getOpportunityKanbanStatusLabel(item.kanban_status)}
                        </Badge>
                        <span>{formatOpportunityPrice(item.price)}</span>
                        <span>
                          {formatOpportunityProbability(
                            item.probability_confirmation,
                          )}
                        </span>
                      </div>
                      <span className="shrink-0 text-primary-foreground">
                        {formatOpportunityDate(item.end_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </ListViewTabsContent>

      <ListViewTabsContent value="table" className="flex-none">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nom</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Responsable</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Urgence</th>
                <th className="px-3 py-2 font-medium">Catégories</th>
                <th className="px-3 py-2 font-medium">Échéance</th>
                <th className="px-3 py-2 font-medium">Clôture</th>
                <th className="px-3 py-2 font-medium">Montant</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-6 text-sm text-muted-foreground"
                  >
                    {query.trim() || hasActiveFilters
                      ? "Aucune opportunité ne correspond aux critères."
                      : "Aucune opportunité pour le moment. Créez-en une pour commencer."}
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    onClick={() => router.push(`/opportunities/${item.id}`)}
                  >
                    <td className="px-3 py-2 font-medium">
                      {item.opportunity_name}
                    </td>
                    <td className="px-3 py-2">{item.client.client_name}</td>
                    <td className="px-3 py-2">
                      {getOpportunityResponsibleName(item.responsible)}
                    </td>
                    <td className="px-3 py-2">
                      {getOpportunityKanbanStatusLabel(item.kanban_status)}
                    </td>
                    <td className="px-3 py-2">
                      {getOpportunityPriorityLabel(item.priority)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {item.categories.map((c) => c.label).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatOpportunityDate(item.due_date_at)}
                    </td>
                    <td className="px-3 py-2 text-primary-foreground">
                      {formatOpportunityDate(item.end_at)}
                    </td>
                    <td className="px-3 py-2">
                      {formatOpportunityPrice(item.price)}
                    </td>
                    <td className="px-3 py-2">
                      <IconActionButton
                        label="Dupliquer l'opportunité"
                        onClick={(event) => requestDuplicate(event, item)}
                      >
                        <CopySimple className="size-4" />
                      </IconActionButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ListViewTabsContent>
    </EntityListPageShell>
  );
}
