"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FunnelSimple,
  Kanban,
  MagnifyingGlass,
  PencilSimple,
  SquaresFour,
  Table,
} from "@phosphor-icons/react";
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
import { MissionFormDrawer } from "@/components/missions/mission-form-drawer";
import { MissionsKanban } from "@/components/missions/missions-kanban";
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
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import {
  formatMissionCharge,
  formatMissionDate,
  getMissionKanbanStatusLabel,
  getMissionResponsibleName,
  getMissionScopeLabel,
  MISSION_KANBAN_STATUSES,
  MISSION_SCOPES,
} from "@/lib/missions/labels";
import type {
  MissionKanbanStatus,
  MissionListItem,
  MissionOpportunityOption,
  MissionScope,
} from "@/lib/missions/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

const MISSION_VIEW_TABS: ListViewTab[] = [
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

type MissionsPageClientProps = {
  missions: MissionListItem[];
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  categories: CategoryItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
};

type Filters = {
  clientId: string;
  responsibleId: string;
  teamId: string;
  categoryIds: string[];
  scope: MissionScope | "";
  statuses: MissionKanbanStatus[];
  startFrom: string;
  startTo: string;
  endFrom: string;
  endTo: string;
};

const DEFAULT_FILTERS: Filters = {
  clientId: "",
  responsibleId: "",
  teamId: "",
  categoryIds: [],
  scope: "",
  statuses: [],
  startFrom: "",
  startTo: "",
  endFrom: "",
  endTo: "",
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDateRange(
  value: string | null | undefined,
  from: string,
  to: string,
): boolean {
  const date = parseDate(value);
  if (!date) return !from && !to;
  if (from) {
    const fromDate = parseDate(from);
    if (fromDate && date < fromDate) return false;
  }
  if (to) {
    const toDate = parseDate(to);
    if (toDate && date > toDate) return false;
  }
  return true;
}

export function MissionsPageClient({
  missions,
  collaborators,
  clients,
  categories,
  opportunityOptions,
  currentCollaboratorId,
}: MissionsPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"kanban" | "cards" | "table">("kanban");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
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
    return missions.filter((item) => {
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

      if (filters.scope && item.mission_scope !== filters.scope) {
        return false;
      }

      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(item.kanban_status)) return false;
      }

      if (!matchesDateRange(item.start_at, filters.startFrom, filters.startTo)) {
        return false;
      }

      if (!matchesDateRange(item.end_at, filters.endFrom, filters.endTo)) {
        return false;
      }

      if (!q) return true;
      const blob = [
        item.mission_name,
        item.client?.client_name,
        item.opportunity?.opportunity_name,
        getMissionResponsibleName(item.responsible),
        getMissionKanbanStatusLabel(item.kanban_status),
        getMissionScopeLabel(item.mission_scope),
        ...item.categories.map((c) => c.label),
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [missions, filters, query, teamIdByCollaboratorId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    Boolean(filters.clientId) ||
    Boolean(filters.responsibleId) ||
    Boolean(filters.teamId) ||
    filters.categoryIds.length > 0 ||
    Boolean(filters.scope) ||
    filters.statuses.length > 0 ||
    Boolean(filters.startFrom) ||
    Boolean(filters.startTo) ||
    Boolean(filters.endFrom) ||
    Boolean(filters.endTo);

  const openCreate = () => {
    void pushDrawer({
      title: "Nouvelle mission",
      content: (helpers) => (
        <MissionFormDrawer
          mode="create"
          collaborators={collaborators}
          clients={clients}
          availableCategories={categories}
          opportunityOptions={opportunityOptions}
          currentCollaboratorId={currentCollaboratorId}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const toggleDraftStatus = (status: MissionKanbanStatus) => {
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
    <ListViewTabs
      value={view}
      onValueChange={(value) => {
        setView(value as "kanban" | "cards" | "table");
        setPage(1);
      }}
    >
      <PageHero
        title="Missions"
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
                aria-label="Recherche contextuelle missions"
              />
            </div>
            <ListViewTabsSwitcher tabs={MISSION_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(filters);
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouvelle mission" onClick={openCreate}>
              <PencilSimple className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div
        className={cn(
          "min-h-0 flex-1 px-4 py-4 md:px-6",
          view === "kanban" ? "flex flex-col overflow-hidden" : "overflow-y-auto",
        )}
      >
        <ListViewTabsContent value="kanban" className="min-h-0 flex-1">
          <MissionsKanban items={filtered} />
        </ListViewTabsContent>

        <ListViewTabsContent value="cards" className="flex-none">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim() || hasActiveFilters
                ? "Aucune mission ne correspond aux critères."
                : "Aucune mission pour le moment. Créez-en une pour commencer."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((item) => (
                <Link key={item.id} href={`/missions/${item.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader className="space-y-2 p-4 pb-2">
                      <CardTitle className="text-base leading-snug">
                        {item.mission_name}
                      </CardTitle>
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
                        {item.mission_scope === "interne" ? (
                          <Badge variant="secondary" className="shrink-0">
                            Interne
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 p-4 pt-2 text-xs text-muted-foreground">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {item.mission_scope === "interne"
                            ? "Interne"
                            : (item.client?.client_name ?? "—")}
                        </span>
                        <span className="shrink-0 text-right">
                          {getMissionResponsibleName(item.responsible)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant="outline" className="font-normal">
                            {getMissionKanbanStatusLabel(item.kanban_status)}
                          </Badge>
                          <span>{formatMissionCharge(item.estimated_charge)}</span>
                        </div>
                        <span className="shrink-0 text-primary-foreground">
                          {formatMissionDate(item.end_at)}
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
                  <th className="px-3 py-2 font-medium">Périmètre</th>
                  <th className="px-3 py-2 font-medium">Catégories</th>
                  <th className="px-3 py-2 font-medium">Début</th>
                  <th className="px-3 py-2 font-medium">Fin</th>
                  <th className="px-3 py-2 font-medium">Temps vendu</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {query.trim() || hasActiveFilters
                        ? "Aucune mission ne correspond aux critères."
                        : "Aucune mission pour le moment. Créez-en une pour commencer."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                      onClick={() => router.push(`/missions/${item.id}`)}
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.mission_name}
                      </td>
                      <td className="px-3 py-2">
                        {item.mission_scope === "interne"
                          ? "Interne"
                          : (item.client?.client_name ?? "—")}
                      </td>
                      <td className="px-3 py-2">
                        {getMissionResponsibleName(item.responsible)}
                      </td>
                      <td className="px-3 py-2">
                        {getMissionKanbanStatusLabel(item.kanban_status)}
                      </td>
                      <td className="px-3 py-2">
                        {getMissionScopeLabel(item.mission_scope)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.categories.map((c) => c.label).join(", ") ||
                          "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatMissionDate(item.start_at)}
                      </td>
                      <td className="px-3 py-2 text-primary-foreground">
                        {formatMissionDate(item.end_at)}
                      </td>
                      <td className="px-3 py-2">
                        {formatMissionCharge(item.estimated_charge)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ListViewTabsContent>
      </div>

      {view !== "kanban" ? (
        <ListPaginationFooter
          countLabel="Nombre de missions"
          count={filtered.length}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-visible sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtres missions</DialogTitle>
          </DialogHeader>
          <div className="relative py-2">
            <div
              ref={filterPortalRef}
              data-slot="dialog-portal-container"
              className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
            />
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
                <Label>Périmètre</Label>
                <Select
                  value={draftFilters.scope || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      scope: value === "all" ? "" : (value as MissionScope),
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {MISSION_SCOPES.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {getMissionScopeLabel(scope)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Statut</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MISSION_KANBAN_STATUSES.map((status) => {
                    const selected = draftFilters.statuses.includes(status);
                    return (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleDraftStatus(status)}
                      >
                        {getMissionKanbanStatusLabel(status)}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Plage de filtre pour les date de début</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={draftFilters.startFrom}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        startFrom: event.target.value,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    value={draftFilters.startTo}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        startTo: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Plage de filtre pour les date de fin</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={draftFilters.endFrom}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        endFrom: event.target.value,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    value={draftFilters.endTo}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        endTo: event.target.value,
                      }))
                    }
                  />
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListViewTabs>
  );
}
