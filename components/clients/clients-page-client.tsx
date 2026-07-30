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
} from "@phosphor-icons/react";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { IconActionButton } from "@/components/layout/icon-action-button";
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
  getClientResponsibleName,
  getClientStatusLabel,
  getContactFullName,
} from "@/lib/clients/labels";
import type { ClientListItem } from "@/lib/clients/types";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";

const PAGE_SIZE = 25;

const CLIENT_VIEW_TABS: ListViewTab[] = [
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

type ClientsPageClientProps = {
  clients: ClientListItem[];
  collaborators: CollaboratorListItem[];
  categories: CategoryItem[];
};

type Filters = {
  categoryIds: string[];
  responsibleId: string;
  city: string;
  missionBucket: "all" | "lt5" | "5to20" | "gt20";
  status: "active" | "inactive" | "all";
};

const DEFAULT_FILTERS: Filters = {
  categoryIds: [],
  responsibleId: "",
  city: "",
  missionBucket: "all",
  status: "active",
};

export function ClientsPageClient({
  clients,
  collaborators,
  categories,
}: ClientsPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
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

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const client of clients) {
      if (client.address_city) set.add(client.address_city);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [clients]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return clients.filter((client) => {
      if (filters.status === "active" && !client.is_active) return false;
      if (filters.status === "inactive" && client.is_active) return false;

      if (
        filters.responsibleId &&
        client.responsible.id !== filters.responsibleId
      ) {
        return false;
      }

      if (filters.city && client.address_city !== filters.city) {
        return false;
      }

      if (filters.categoryIds.length > 0) {
        const ids = new Set(client.categories.map((c) => c.id));
        if (!filters.categoryIds.every((id) => ids.has(id))) return false;
      }

      if (filters.missionBucket === "lt5" && client.mission_count >= 5) {
        return false;
      }
      if (
        filters.missionBucket === "5to20" &&
        (client.mission_count < 5 || client.mission_count > 20)
      ) {
        return false;
      }
      if (filters.missionBucket === "gt20" && client.mission_count <= 20) {
        return false;
      }

      if (!q) return true;
      const blob = [
        client.client_name,
        client.website,
        client.address_city,
        getClientResponsibleName(client.responsible),
        ...client.categories.map((c) => c.label),
        client.main_contact
          ? getContactFullName(client.main_contact)
          : "",
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [clients, filters, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  return (
    <ListViewTabs
      value={view}
      onValueChange={(value) => {
        setView(value as "cards" | "table");
        setPage(1);
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
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="pl-8"
                aria-label="Recherche contextuelle clients"
              />
            </div>
            <ListViewTabsSwitcher tabs={CLIENT_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(filters);
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouveau client" onClick={openCreate}>
              <PencilSimple className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6">
        {pageItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query.trim() ||
            filters.status !== "active" ||
            filters.responsibleId ||
            filters.city ||
            filters.missionBucket !== "all" ||
            filters.categoryIds.length > 0
              ? "Aucun client ne correspond aux critères."
              : "Aucun client pour le moment."}
          </p>
        ) : (
          <>
            <ListViewTabsContent value="cards">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {pageItems.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card className="h-full transition-colors hover:bg-muted/40">
                      <CardHeader className="space-y-3 p-4 pb-2">
                        <div className="flex items-start gap-3">
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-sm font-semibold">
                            {client.logo_url ? (
                              <img
                                src={client.logo_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              client.client_name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base leading-snug">
                              {client.client_name}
                            </CardTitle>
                            <Badge
                              variant={
                                client.is_active ? "default" : "secondary"
                              }
                              className="mt-1"
                            >
                              {getClientStatusLabel(client.is_active)}
                            </Badge>
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
            </ListViewTabsContent>

            <ListViewTabsContent value="table">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Client</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-3 py-2 font-medium">Catégories</th>
                      <th className="px-3 py-2 font-medium">Site</th>
                      <th className="px-3 py-2 font-medium">Téléphone</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((client) => (
                      <tr
                        key={client.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <td className="px-3 py-2 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex size-8 items-center justify-center overflow-hidden rounded bg-muted text-[10px] font-semibold">
                              {client.logo_url ? (
                                <img
                                  src={client.logo_url}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                client.client_name.slice(0, 2).toUpperCase()
                              )}
                            </span>
                            {client.client_name}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {getClientStatusLabel(client.is_active)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </ListViewTabsContent>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>Nombre de clients : {filtered.length}</p>
          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <span>
                Page : {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>Filtres clients</DialogTitle>
          </DialogHeader>
          <div className="relative space-y-4 py-2">
            <div
              ref={filterPortalRef}
              data-slot="dialog-portal-container"
              className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
            />
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select
                value={draftFilters.status}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    status: value as Filters["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
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
                <SelectTrigger>
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
            <div className="grid gap-2">
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
                <SelectTrigger>
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
            <div className="grid gap-2">
              <Label>Missions</Label>
              <Select
                value={draftFilters.missionBucket}
                onValueChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    missionBucket: value as Filters["missionBucket"],
                  }))
                }
              >
                <SelectTrigger>
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
            <div className="grid gap-2">
              <Label>Catégories</Label>
              <CategoryMultiCombobox
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
