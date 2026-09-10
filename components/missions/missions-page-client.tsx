"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cards,
  CirclesThreePlus,
  CopySimple,
  FunnelSimple,
  Kanban,
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
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { buildMissionDuplicatePrefill } from "@/lib/crm/duplicate-prefill";
import { getEndDateToneClass } from "@/lib/dates/end-date-tone";
import {
  DEFAULT_MISSIONS_LIST_FILTERS,
  MISSIONS_PAGE_SIZE,
  missionsListHref,
  type MissionsListFilters,
  type MissionsListView,
} from "@/lib/missions/list-filters";
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

const MISSION_VIEW_TABS: ListViewTab[] = [
  {
    value: "kanban",
    label: "Kanban",
    icon: <Kanban className="size-3.5" aria-hidden />,
  },
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

type MissionsPageClientProps = {
  missions: MissionListItem[];
  totalCount: number;
  filters?: MissionsListFilters;
  collaborators: CollaboratorListItem[];
  clients: ClientOption[];
  categories: CategoryItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
};

type DialogFilters = Pick<
  MissionsListFilters,
  | "clientId"
  | "responsibleId"
  | "teamId"
  | "categoryIds"
  | "scope"
  | "statuses"
  | "startFrom"
  | "startTo"
  | "endFrom"
  | "endTo"
>;

function toDialogFilters(filters: MissionsListFilters): DialogFilters {
  return {
    clientId: filters.clientId,
    responsibleId: filters.responsibleId,
    teamId: filters.teamId,
    categoryIds: filters.categoryIds,
    scope: filters.scope,
    statuses: filters.statuses,
    startFrom: filters.startFrom,
    startTo: filters.startTo,
    endFrom: filters.endFrom,
    endTo: filters.endTo,
  };
}

function hasActiveDialogFilters(filters: MissionsListFilters): boolean {
  return (
    Boolean(filters.clientId) ||
    Boolean(filters.responsibleId) ||
    Boolean(filters.teamId) ||
    filters.categoryIds.length > 0 ||
    Boolean(filters.scope) ||
    filters.statuses.length > 0 ||
    Boolean(filters.startFrom) ||
    Boolean(filters.startTo) ||
    Boolean(filters.endFrom) ||
    Boolean(filters.endTo)
  );
}

export function MissionsPageClient({
  missions,
  totalCount,
  filters: filtersProp,
  collaborators,
  clients,
  categories,
  opportunityOptions,
  currentCollaboratorId,
}: MissionsPageClientProps) {
  const filters = filtersProp ?? DEFAULT_MISSIONS_LIST_FILTERS;
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const [draftFilters, setDraftFilters] = useState<DialogFilters>(() =>
    toDialogFilters(filters),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] =
    useState<MissionListItem | null>(null);
  const filterPortalRef = useRef<HTMLDivElement>(null);

  const navigate = (next: MissionsListFilters) => {
    startTransition(() => {
      router.push(missionsListHref(next));
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

  const clientOptions = useMemo(
    () =>
      [...clients].sort((a, b) =>
        a.client_name.localeCompare(b.client_name, "fr"),
      ),
    [clients],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / MISSIONS_PAGE_SIZE));
  const hasActiveFilters = hasActiveDialogFilters(filters);

  const openCreate = (duplicateSource?: MissionListItem) => {
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
          duplicatePrefill={
            duplicateSource
              ? buildMissionDuplicatePrefill(duplicateSource)
              : undefined
          }
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const requestDuplicate = (event: MouseEvent, item: MissionListItem) => {
    event.preventDefault();
    event.stopPropagation();
    setDuplicateTarget(item);
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
    <EntityListPageShell
      title="Missions"
      searchAriaLabel="Recherche contextuelle missions"
      view={filters.view}
      onViewChange={(value) => {
        navigate({
          ...filters,
          view: value as MissionsListView,
          page: 1,
        });
      }}
      viewTabs={MISSION_VIEW_TABS}
      query={query}
      onQueryChange={setQuery}
      toolbarActions={
        <>
          <IconActionButton
            label={
              hasActiveFilters
                ? `Filtres (${filters.categoryIds.length > 0 ? `${filters.categoryIds.length} catégorie${filters.categoryIds.length > 1 ? "s" : ""}` : "actifs"})`
                : "Filtres"
            }
            variant={hasActiveFilters ? "default" : "outline"}
            onClick={() => {
              setDraftFilters(toDialogFilters(filters));
              setFilterOpen(true);
            }}
          >
            <FunnelSimple
              className="size-4"
              weight={hasActiveFilters ? "fill" : "regular"}
            />
          </IconActionButton>
          <IconActionButton
            label="Nouvelle mission"
            onClick={() => openCreate()}
          >
            <CirclesThreePlus className="size-4" />
          </IconActionButton>
        </>
      }
      kanbanLayout={filters.view === "kanban"}
      pagination={
        filters.view !== "kanban"
          ? {
              countLabel: "Nombre de missions",
              count: totalCount,
              page: filters.page,
              totalPages,
              pageSize: MISSIONS_PAGE_SIZE,
              onPageChange: (page) => navigate({ ...filters, page }),
            }
          : null
      }
      duplicate={{
        open: duplicateTarget != null,
        onOpenChange: (open) => {
          if (!open) setDuplicateTarget(null);
        },
        entityLabel: "mission",
        entityName: duplicateTarget?.mission_name ?? "",
        onConfirm: () => {
          if (duplicateTarget) openCreate(duplicateTarget);
        },
      }}
      filterDialog={{
        open: filterOpen,
        onOpenChange: setFilterOpen,
        title: "Filtres missions",
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
        ),
        footer: (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilterOpen(false);
                navigate({
                  ...DEFAULT_MISSIONS_LIST_FILTERS,
                  view: filters.view,
                });
              }}
            >
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFilterOpen(false);
                navigate({
                  ...filters,
                  ...draftFilters,
                  q: query.trim(),
                  page: 1,
                });
              }}
            >
              Appliquer
            </Button>
          </>
        ),
      }}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col",
          isPending && "opacity-60 transition-opacity",
        )}
      >
        <ListViewTabsContent value="kanban" className="min-h-0 flex-1">
          <MissionsKanban items={missions} />
        </ListViewTabsContent>

        <ListViewTabsContent value="cards" className="flex-none">
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filters.q.trim() || hasActiveFilters
                ? "Aucune mission ne correspond aux critères."
                : "Aucune mission pour le moment. Créez-en une pour commencer."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {missions.map((item) => (
                <Link key={item.id} href={`/missions/${item.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader className="space-y-2 p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="min-w-0 text-base leading-snug">
                          {item.mission_name}
                        </CardTitle>
                        <IconActionButton
                          label="Dupliquer la mission"
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
                          <span>
                            {formatMissionCharge(item.estimated_charge)}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 ${getEndDateToneClass(item.end_at, {
                            muted:
                              item.kanban_status === "terminee" ||
                              item.kanban_status === "archivee",
                          })}`}
                        >
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
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {missions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {filters.q.trim() || hasActiveFilters
                        ? "Aucune mission ne correspond aux critères."
                        : "Aucune mission pour le moment. Créez-en une pour commencer."}
                    </td>
                  </tr>
                ) : (
                  missions.map((item) => (
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
                        {item.categories.map((c) => c.label).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatMissionDate(item.start_at)}
                      </td>
                      <td
                        className={`px-3 py-2 ${getEndDateToneClass(item.end_at, {
                          muted:
                            item.kanban_status === "terminee" ||
                            item.kanban_status === "archivee",
                        })}`}
                      >
                        {formatMissionDate(item.end_at)}
                      </td>
                      <td className="px-3 py-2">
                        {formatMissionCharge(item.estimated_charge)}
                      </td>
                      <td className="px-3 py-2">
                        <IconActionButton
                          label="Dupliquer la mission"
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
      </div>
    </EntityListPageShell>
  );
}
