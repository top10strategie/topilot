"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cards,
  FunnelSimple,
  MagnifyingGlass,
  Table,
  UserPlus,
} from "@phosphor-icons/react";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { ClientLogo } from "@/components/clients/client-logo";
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
import {
  CLIENTS_PAGE_SIZE,
  clientsListHref,
  DEFAULT_CLIENTS_LIST_FILTERS,
  type ClientsListFilters,
  type ClientsListStatus,
  type ClientsMissionBucket,
} from "@/lib/clients/list-filters";
import {
  getClientResponsibleName,
  getClientStatusLabel,
} from "@/lib/clients/labels";
import type { ClientListItem } from "@/lib/clients/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";

const CLIENT_VIEW_TABS: ListViewTab[] = [
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

type ClientsPageClientProps = {
  clients: ClientListItem[];
  totalCount: number;
  filters: ClientsListFilters;
  cities: string[];
  collaborators: CollaboratorListItem[];
  categories: CategoryItem[];
};

type DialogFilters = Pick<
  ClientsListFilters,
  | "status"
  | "responsibleId"
  | "teamId"
  | "city"
  | "categoryIds"
  | "missionBucket"
>;

function toDialogFilters(filters: ClientsListFilters): DialogFilters {
  return {
    status: filters.status,
    responsibleId: filters.responsibleId,
    teamId: filters.teamId,
    city: filters.city,
    categoryIds: filters.categoryIds,
    missionBucket: filters.missionBucket,
  };
}

function hasActiveFilters(filters: ClientsListFilters): boolean {
  return (
    Boolean(filters.q.trim()) ||
    filters.status !== DEFAULT_CLIENTS_LIST_FILTERS.status ||
    Boolean(filters.responsibleId) ||
    Boolean(filters.teamId) ||
    Boolean(filters.city) ||
    filters.missionBucket !== DEFAULT_CLIENTS_LIST_FILTERS.missionBucket ||
    filters.categoryIds.length > 0
  );
}

export function ClientsPageClient({
  clients,
  totalCount,
  filters,
  cities,
  collaborators,
  categories,
}: ClientsPageClientProps) {
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

  const navigate = (next: ClientsListFilters) => {
    startTransition(() => {
      router.push(clientsListHref(next));
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

  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE));

  const openCreate = () => {
    void pushDrawer({
      title: "Nouveau client",
      content: (helpers) => (
        <ClientFormDrawer
          mode="create"
          collaborators={collaborators}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const emptyMessage = hasActiveFilters(filters)
    ? "Aucun client ne correspond aux critères."
    : "Aucun client pour le moment. Créez-en un pour commencer.";

  return (
    <ListViewTabs
      value={view}
      onValueChange={(value) => {
        setView(value as "cards" | "table");
      }}
    >
      <PageHero
        title="Clients"
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
                aria-label="Recherche contextuelle clients"
                disabled={isPending}
              />
            </div>
            <ListViewTabsSwitcher tabs={CLIENT_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(toDialogFilters(filters));
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouveau client" onClick={openCreate}>
              <UserPlus className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <ListViewTabsContent value="cards" className="flex-none">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {clients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader className="space-y-3 p-4 pb-2">
                      <div className="flex items-start gap-3">
                        <ClientLogo
                          src={client.logo_url}
                          name={client.client_name}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-snug">
                            {client.client_name}
                          </CardTitle>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                client.is_active ? "default" : "secondary"
                              }
                            >
                              {getClientStatusLabel(client.is_active)}
                            </Badge>
                            {client.facilitator ? (
                              <Badge variant="outline">
                                Apporteur d&apos;affaires
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 p-4 pt-2 text-xs text-muted-foreground">
                      <p>
                        {client.mission_count} mission
                        {client.mission_count > 1 ? "s" : ""} ·{" "}
                        {client.opportunity_count} opportunité
                        {client.opportunity_count > 1 ? "s" : ""}
                      </p>
                      <p>
                        Resp. {getClientResponsibleName(client.responsible)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </ListViewTabsContent>

        <ListViewTabsContent value="table" className="flex-none">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">
                    Apporteur d&apos;affaires
                  </th>
                  <th className="px-3 py-2 font-medium">Catégories</th>
                  <th className="px-3 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 font-medium">Téléphone</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-3 py-2 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <ClientLogo
                            src={client.logo_url}
                            name={client.client_name}
                            size="sm"
                          />
                          {client.client_name}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {getClientStatusLabel(client.is_active)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {client.facilitator ? "oui" : ""}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {client.categories.map((c) => c.label).join(", ") ||
                          "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {client.website || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {client.main_contact?.phone_number || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {client.main_contact?.email_address || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {getClientResponsibleName(client.responsible)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ListViewTabsContent>
      </div>

      <ListPaginationFooter
        countLabel="Nombre de clients"
        count={totalCount}
        page={filters.page}
        totalPages={totalPages}
        pageSize={CLIENTS_PAGE_SIZE}
        onPageChange={(page) => navigate({ ...filters, page })}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-visible sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtres clients</DialogTitle>
          </DialogHeader>
          <div className="relative py-2">
            <div
              ref={filterPortalRef}
              data-slot="dialog-portal-container"
              className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <Label>Statut</Label>
                <Select
                  value={draftFilters.status}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      status: value as ClientsListStatus,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
                    <SelectItem value="all">Tous</SelectItem>
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
                <Label>Ville</Label>
                <Select
                  value={draftFilters.city || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      city: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label>Missions</Label>
                <Select
                  value={draftFilters.missionBucket}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      missionBucket: value as ClientsMissionBucket,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="lt5">&lt; 5</SelectItem>
                    <SelectItem value="5to20">5 – 20</SelectItem>
                    <SelectItem value="gt20">&gt; 20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
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
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilters(toDialogFilters(DEFAULT_CLIENTS_LIST_FILTERS));
                setQuery("");
                setFilterOpen(false);
                navigate({ ...DEFAULT_CLIENTS_LIST_FILTERS });
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListViewTabs>
  );
}
