"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FunnelSimple,
  MagnifyingGlass,
  PencilSimple,
  SquaresFour,
  Table,
  Trash,
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
import { DeleteWikiDialog } from "@/components/wiki/delete-wiki-dialog";
import { WikiFormDrawer } from "@/components/wiki/wiki-form-drawer";
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
import type { CategoryItem } from "@/lib/categories/types";
import type { WikiListItem } from "@/lib/wiki/types";

const PAGE_SIZE = 25;

const WIKI_VIEW_TABS: ListViewTab[] = [
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

type WikisPageClientProps = {
  wikis: WikiListItem[];
  categories: CategoryItem[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WikisPageClient({ wikis, categories }: WikisPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPortalRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState<WikiListItem | null>(null);
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(
    () => new Set<string>(),
  );

  const visible = useMemo(
    () => wikis.filter((wiki) => !optimisticallyRemovedIds.has(wiki.id)),
    [wikis, optimisticallyRemovedIds],
  );

  const draftSelectedCategories = useMemo(
    () => categories.filter((category) => draftCategoryIds.includes(category.id)),
    [categories, draftCategoryIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return visible.filter((item) => {
      if (categoryIds.length > 0) {
        const ids = new Set(item.categories.map((c) => c.id));
        if (!categoryIds.every((id) => ids.has(id))) return false;
      }
      if (!q) return true;
      const blob = [
        item.title,
        ...item.tags,
        ...item.categories.map((c) => c.label),
        item.content_text,
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [visible, categoryIds, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = categoryIds.length > 0;

  const openCreate = () => {
    void pushDrawer({
      title: "Nouveau Wiki",
      content: (helpers) => (
        <WikiFormDrawer
          mode="create"
          categories={categories}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openEdit = (item: WikiListItem) => {
    void pushDrawer({
      title: "Édition Wiki",
      content: (helpers) => (
        <WikiFormDrawer
          mode="edit"
          wiki={item}
          categories={categories}
          helpers={helpers}
        />
      ),
    }).then((saved) => {
      if (saved) router.refresh();
    });
  };

  const actionButtons = (item: WikiListItem) => (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconActionButton
        label="Éditer"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openEdit(item);
        }}
      >
        <PencilSimple className="size-4" />
      </IconActionButton>
      <IconActionButton
        label="Supprimer"
        attention
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPendingDelete(item);
        }}
      >
        <Trash className="size-4" />
      </IconActionButton>
    </div>
  );

  return (
    <ListViewTabs
      value={view}
      onValueChange={(value) => {
        setView(value as "cards" | "table");
        setPage(1);
      }}
    >
      <PageHero
        title="Wikis"
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
                aria-label="Recherche contextuelle wikis"
              />
            </div>
            <ListViewTabsSwitcher tabs={WIKI_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftCategoryIds(categoryIds);
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouveau Wiki" onClick={openCreate}>
              <PencilSimple className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <ListViewTabsContent value="cards" className="flex-none">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim() || hasActiveFilters
                ? "Aucun wiki ne correspond aux critères."
                : "Aucun wiki pour le moment. Créez-en un pour commencer."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((item) => (
                <Card key={item.id} className="h-full">
                  <CardHeader className="space-y-2 p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {item.title}
                      </CardTitle>
                      {actionButtons(item)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        item.categories.slice(0, 3).map((category) => (
                          <Badge key={category.id} variant="secondary">
                            {category.label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 p-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.length === 0
                        ? "Aucun tag"
                        : item.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                    </div>
                    <p>
                      Créé : {formatDate(item.created_at)} · MAJ :{" "}
                      {formatDate(item.updated_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ListViewTabsContent>

        <ListViewTabsContent value="table" className="flex-none">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Titre</th>
                  <th className="px-3 py-2 font-medium">Catégories</th>
                  <th className="px-3 py-2 font-medium">Tags</th>
                  <th className="px-3 py-2 font-medium">Date d&apos;ajout</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {query.trim() || hasActiveFilters
                        ? "Aucun wiki ne correspond aux critères."
                        : "Aucun wiki pour le moment. Créez-en un pour commencer."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-medium">{item.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.categories.map((c) => c.label).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.tags.join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-3 py-2">{actionButtons(item)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ListViewTabsContent>
      </div>

      <ListPaginationFooter
        count={filtered.length}
        countLabel="Nombre de wikis"
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <div ref={filterPortalRef} />
          <DialogHeader>
            <DialogTitle>Filtres wikis</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Catégorie</Label>
            <CategoryMultiCombobox
              items={categories}
              value={draftSelectedCategories}
              onValueChange={(value) =>
                setDraftCategoryIds(value.map((item) => item.id))
              }
              placeholder="Catégories…"
              container={filterPortalRef}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraftCategoryIds([])}
            >
              Effacer
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCategoryIds(draftCategoryIds);
                setPage(1);
                setFilterOpen(false);
              }}
            >
              Filtrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingDelete ? (
        <DeleteWikiDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          wikiId={pendingDelete.id}
          wikiTitle={pendingDelete.title}
          onDeleted={() => {
            const id = pendingDelete.id;
            setOptimisticallyRemovedIds((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            });
            setPendingDelete(null);
            router.refresh();
          }}
        />
      ) : null}
    </ListViewTabs>
  );
}
