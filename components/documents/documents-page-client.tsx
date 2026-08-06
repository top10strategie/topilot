"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cards,
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
import { AuditHistoryButton } from "@/components/audit/audit-history-button";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import { DocumentFormDrawer } from "@/components/documents/document-form-drawer";
import { DocumentFormatThumb } from "@/components/documents/document-format-thumb";
import { DocumentPreviewDialog } from "@/components/documents/document-preview-dialog";
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
import type { ClientListItem } from "@/lib/clients/types";
import { getDocumentFileFormat } from "@/lib/documents/format";
import type { DocumentListItem } from "@/lib/documents/types";

const PAGE_SIZE = 25;

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

const OWNER_INTERNE_ID = "__interne__";

type Filters = {
  typeIds: string[];
  versions: number[];
  clientIds: string[];
};

const DEFAULT_FILTERS: Filters = {
  typeIds: [],
  versions: [],
  clientIds: [],
};

type DocumentsPageClientProps = {
  documents: DocumentListItem[];
  documentTypes: DocumentTypeItem[];
  clients: ClientListItem[];
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
  documentTypes,
  clients,
  canViewHistory,
}: DocumentsPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPortalRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentListItem | null>(
    null,
  );
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState(
    () => new Set<string>(),
  );

  const visible = useMemo(
    () => documents.filter((doc) => !optimisticallyRemovedIds.has(doc.id)),
    [documents, optimisticallyRemovedIds],
  );

  const availableVersions = useMemo(() => {
    const set = new Set(visible.map((doc) => doc.version_number));
    return [...set].sort((a, b) => a - b);
  }, [visible]);

  const ownerOptions = useMemo(
    () => [
      { id: OWNER_INTERNE_ID, label: "Sans client / interne" },
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

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    const versionFilterActive = filters.versions.length > 0;

    return visible.filter((item) => {
      if (!versionFilterActive && !item.is_latest) return false;
      if (
        versionFilterActive &&
        !filters.versions.includes(item.version_number)
      ) {
        return false;
      }

      if (
        filters.typeIds.length > 0 &&
        !filters.typeIds.includes(item.document_type.id)
      ) {
        return false;
      }

      if (filters.clientIds.length > 0) {
        const wantsInterne = filters.clientIds.includes(OWNER_INTERNE_ID);
        const selectedClientIds = filters.clientIds.filter(
          (id) => id !== OWNER_INTERNE_ID,
        );
        const clientLinks = item.linked.filter((link) => link.kind === "client");
        const isInterne = clientLinks.length === 0;
        const matchesClient = selectedClientIds.some((id) =>
          clientLinks.some((link) => link.id === id),
        );
        if (!((wantsInterne && isInterne) || matchesClient)) return false;
      }

      if (!q) return true;
      const blob = [
        item.document_name,
        item.document_type.label,
        ...item.linked.map((link) => link.name),
        `v${item.version_number}`,
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return blob.includes(q);
    });
  }, [visible, filters, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    filters.typeIds.length > 0 ||
    filters.versions.length > 0 ||
    filters.clientIds.length > 0;

  const openCreate = () => {
    void pushDrawer({
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
    void pushDrawer({
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
        setPage(1);
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
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="pl-8"
                aria-label="Recherche contextuelle documents"
              />
            </div>
            <ListViewTabsSwitcher tabs={DOCUMENT_VIEW_TABS} showLabels={false} />
            <IconActionButton
              label="Filtres"
              onClick={() => {
                setDraftFilters(filters);
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
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query.trim() || hasActiveFilters
                ? "Aucun document ne correspond aux critères."
                : "Aucun document pour le moment. Créez-en un pour commencer."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {pageItems.map((item) => (
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
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-sm text-muted-foreground"
                    >
                      {query.trim() || hasActiveFilters
                        ? "Aucun document ne correspond aux critères."
                        : "Aucun document pour le moment. Créez-en un pour commencer."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
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
        count={filtered.length}
        countLabel="Nombre de documents"
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        onPageChange={setPage}
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
              onClick={() => setDraftFilters(DEFAULT_FILTERS)}
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
