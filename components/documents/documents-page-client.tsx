"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Cards,
  ClockCounterClockwise,
  DownloadSimple,
  Eye,
  FunnelSimple,
  MagnifyingGlass,
  PencilSimple,
  StackPlus,
  Table,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { fetchDocumentLineage } from "@/actions/documents";
import { AuditHistoryButton } from "@/components/audit/audit-history-button";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import { DocumentFormDrawer } from "@/components/documents/document-form-drawer";
import { DocumentFormatThumb } from "@/components/documents/document-format-thumb";
import { DocumentPreviewDialog } from "@/components/documents/document-preview-dialog";
import { DocumentVersionHistoryDrawer } from "@/components/documents/document-version-history-drawer";
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
  CardFooter,
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
import type { DocumentTypeItem } from "@/lib/categories/types";
import type { ClientOption } from "@/lib/clients/types";
import { getDocumentFileFormat } from "@/lib/documents/format";
import {
  DEFAULT_DOCUMENTS_LIST_FILTERS,
  DOCUMENTS_OWNER_INTERNE_ID,
  DOCUMENTS_PAGE_SIZE,
  documentsListHref,
  type DocumentsListFilters,
} from "@/lib/documents/list-filters";
import type { DocumentListItem } from "@/lib/documents/types";

const DOCUMENT_VIEW_TABS: ListViewTab[] = [
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

type DialogFilters = Pick<
  DocumentsListFilters,
  "typeIds" | "versions" | "clientIds"
>;

function toDialogFilters(filters: DocumentsListFilters): DialogFilters {
  return {
    typeIds: filters.typeIds,
    versions: filters.versions,
    clientIds: filters.clientIds,
  };
}

function hasActiveFilters(filters: DocumentsListFilters): boolean {
  return (
    Boolean(filters.q.trim()) ||
    filters.typeIds.length > 0 ||
    filters.versions.length > 0 ||
    filters.clientIds.length > 0
  );
}

type DocumentsPageClientProps = {
  documents: DocumentListItem[];
  totalCount: number;
  filters?: DocumentsListFilters;
  availableVersions: number[];
  documentTypes: DocumentTypeItem[];
  clients: ClientOption[];
  canViewHistory: boolean;
};

function formatDate(iso: string): string {
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

function linkedLabel(item: DocumentListItem): string {
  if (item.linked.length === 0) return "—";
  return item.linked.map((link) => link.name).join(", ");
}

export function DocumentsPageClient({
  documents,
  totalCount,
  filters: filtersProp,
  availableVersions,
  documentTypes,
  clients,
  canViewHistory,
}: DocumentsPageClientProps) {
  const filters = filtersProp ?? DEFAULT_DOCUMENTS_LIST_FILTERS;
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
  const [pendingDelete, setPendingDelete] = useState<DocumentListItem | null>(
    null,
  );
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(
    () => new Set<string>(),
  );

  const navigate = (next: DocumentsListFilters) => {
    startTransition(() => {
      router.push(documentsListHref(next));
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

  const visible = useMemo(
    () => documents.filter((doc) => !optimisticallyRemovedIds.has(doc.id)),
    [documents, optimisticallyRemovedIds],
  );

  const ownerOptions = useMemo(
    () => [
      { id: DOCUMENTS_OWNER_INTERNE_ID, label: "Sans client / interne" },
      ...[...clients]
        .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr"))
        .map((client) => ({ id: client.id, label: client.client_name })),
    ],
    [clients],
  );

  const draftSelectedTypes = useMemo(
    () =>
      documentTypes.filter((type) => draftFilters.typeIds.includes(type.id)),
    [documentTypes, draftFilters.typeIds],
  );

  const draftSelectedOwners = useMemo(
    () =>
      ownerOptions.filter((owner) =>
        draftFilters.clientIds.includes(owner.id),
      ),
    [ownerOptions, draftFilters.clientIds],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / DOCUMENTS_PAGE_SIZE));
  const emptyMessage = hasActiveFilters(filters)
    ? "Aucun document ne correspond aux critères."
    : "Aucun document pour le moment. Créez-en un pour commencer.";

  const openCreate = () => {
    void pushDrawer<{
      id: string;
      document_name: string;
      is_visual: boolean;
      preview_url: string | null;
    }>({
      title: "Nouveau document",
      content: (helpers) => (
        <DocumentFormDrawer
          mode="create"
          documentTypes={documentTypes}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openEdit = (item: DocumentListItem) => {
    void pushDrawer<{
      id: string;
      document_name: string;
      is_visual: boolean;
      preview_url: string | null;
    }>({
      title: "Édition document",
      content: (helpers) => (
        <DocumentFormDrawer
          mode="edit"
          document={item}
          documentTypes={documentTypes}
          helpers={helpers}
        />
      ),
    }).then((saved) => {
      if (saved) router.refresh();
    });
  };

  const openVersionHistory = (item: DocumentListItem) => {
    void (async () => {
      const result = await fetchDocumentLineage(item.lineage_root_id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      void pushDrawer({
        title: "Historique des versions",
        content: (helpers) => (
          <DocumentVersionHistoryDrawer
            versions={result.versions}
            helpers={helpers}
          />
        ),
      }).then((restored) => {
        if (restored) router.refresh();
      });
    })();
  };

  const downloadDocument = async (item: DocumentListItem) => {
    try {
      const response = await fetch(
        `/api/documents/${item.id}/file?download=1`,
      );
      if (!response.ok) {
        toast.error("Téléchargement impossible.");
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = item.document_name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Téléchargement impossible.");
    }
  };

  const actionButtons = (item: DocumentListItem) => (
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
        label="Historique des versions"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openVersionHistory(item);
        }}
      >
        <ClockCounterClockwise className="size-4" />
      </IconActionButton>
      <IconActionButton
        label="Aperçu"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPreviewDoc(item);
        }}
      >
        <Eye className="size-4" />
      </IconActionButton>
      <IconActionButton
        label="Télécharger"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void downloadDocument(item);
        }}
      >
        <DownloadSimple className="size-4" />
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
      }}
    >
      <PageHero
        title="Documents"
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
                aria-label="Recherche contextuelle documents"
                disabled={isPending}
              />
            </div>
            <ListViewTabsSwitcher tabs={DOCUMENT_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(toDialogFilters(filters));
                setFilterOpen(true);
              }}
            >
              <FunnelSimple className="size-4" />
            </IconActionButton>
            <IconActionButton label="Nouveau document" onClick={openCreate}>
              <StackPlus className="size-4" />
            </IconActionButton>
            {canViewHistory ? (
              <AuditHistoryButton
                scope={{ kind: "documents" }}
                dialogTitle="Historique — Documents"
              />
            ) : null}
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <ListViewTabsContent value="cards" className="flex-none">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {visible.map((item) => (
                <Card
                  key={item.id}
                  className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3 p-3 pb-2">
                    <DocumentFormatThumb item={item} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          {item.document_name}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          V{item.version_number}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          {item.document_type.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Lié :
                        </span>{" "}
                        {linkedLabel(item)}
                      </p>
                    </div>
                  </div>
                  <CardFooter className="mt-auto flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </span>
                    {actionButtons(item)}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ListViewTabsContent>

        <ListViewTabsContent value="table" className="flex-none">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Nom document</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Format</th>
                  <th className="px-3 py-2 font-medium">Lié à</th>
                  <th className="px-3 py-2 font-medium">Date d&apos;ajout</th>
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="w-0 whitespace-nowrap px-2 py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  visible.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.document_name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.document_type.label}
                      </td>
                      <td className="px-3 py-2 uppercase text-muted-foreground">
                        {getDocumentFileFormat(item)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {linkedLabel(item)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        V{item.version_number}
                      </td>
                      <td className="w-0 whitespace-nowrap px-2 py-2">
                        {actionButtons(item)}
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
        count={totalCount}
        countLabel="Nombre de documents"
        page={filters.page}
        pageSize={DOCUMENTS_PAGE_SIZE}
        totalPages={totalPages}
        onPageChange={(page) => navigate({ ...filters, page })}
      />

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-xl">
          <div ref={filterPortalRef} />
          <DialogHeader>
            <DialogTitle>Filtres documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <CategoryMultiCombobox
                  items={documentTypes.map((type) => ({
                    id: type.id,
                    label: type.label,
                  }))}
                  value={draftSelectedTypes.map((type) => ({
                    id: type.id,
                    label: type.label,
                  }))}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      typeIds: value.map((item) => item.id),
                    }))
                  }
                  placeholder="Types…"
                  emptyListMessage="Aucun type."
                  container={filterPortalRef}
                />
              </div>
              <div className="grid gap-2">
                <Label>Client</Label>
                <CategoryMultiCombobox
                  items={ownerOptions}
                  value={draftSelectedOwners}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      clientIds: value.map((item) => item.id),
                    }))
                  }
                  placeholder="Clients…"
                  emptyListMessage="Aucun client."
                  container={filterPortalRef}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Version</Label>
              <div className="flex flex-wrap gap-2">
                {availableVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  availableVersions.map((version) => {
                    const selected = draftFilters.versions.includes(version);
                    return (
                      <Button
                        key={version}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            versions: selected
                              ? prev.versions.filter((v) => v !== version)
                              : [...prev.versions, version],
                          }))
                        }
                      >
                        V{version}
                      </Button>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sans filtre Version, seule la dernière version de chaque
                document est affichée.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilters({
                  typeIds: [],
                  versions: [],
                  clientIds: [],
                });
                navigate({
                  ...filters,
                  typeIds: [],
                  versions: [],
                  clientIds: [],
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

      <DocumentPreviewDialog
        open={Boolean(previewDoc)}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
        document={previewDoc}
      />

      {pendingDelete ? (
        <DeleteDocumentDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          documentId={pendingDelete.id}
          documentName={pendingDelete.document_name}
          canDeleteVersionOnly={pendingDelete.is_latest}
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
