"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  linkDocumentToEntity,
  unlinkDocumentFromEntity,
} from "@/actions/document-links";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { DocumentFormDrawer } from "@/components/documents/document-form-drawer";
import { EntityDocumentationSection } from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentTypeItem } from "@/lib/categories/types";
import type {
  DocumentLinkEntity,
  DocumentLinkOption,
  LinkedDocumentItem,
} from "@/lib/documents/types";

type EntityLinkedDocumentsSectionProps = {
  entity: DocumentLinkEntity;
  entityId: string;
  documents: LinkedDocumentItem[];
  linkOptions: DocumentLinkOption[];
  documentTypes: DocumentTypeItem[];
  /** Si fourni (ex. tiroir), rafraîchit l'état local au lieu de `router.refresh()`. */
  onLinksChange?: () => void;
};

function documentHref(doc: LinkedDocumentItem): string {
  if (doc.storage_type === "url" && doc.url) return doc.url;
  return `/api/documents/${doc.id}/file`;
}

/**
 * Section Documentation « Documents » : liste, ouverture, lien / création, retrait.
 */
export function EntityLinkedDocumentsSection({
  entity,
  entityId,
  documents,
  linkOptions,
  documentTypes,
  onLinksChange,
}: EntityLinkedDocumentsSectionProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [pendingUnlink, setPendingUnlink] = useState<LinkedDocumentItem | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const notifyChange = () => {
    if (onLinksChange) {
      onLinksChange();
    } else {
      router.refresh();
    }
  };

  const availableOptions = useMemo(() => {
    const linked = new Set(documents.map((doc) => doc.id));
    return linkOptions.filter((opt) => !linked.has(opt.id));
  }, [linkOptions, documents]);

  const openDocument = (doc: LinkedDocumentItem) => {
    window.open(documentHref(doc), "_blank", "noopener,noreferrer");
  };

  const openCreateAndLink = () => {
    setLinkOpen(false);
    void pushDrawer<{ id: string; document_name: string }>({
      title: "Nouveau document",
      content: (helpers) => (
        <DocumentFormDrawer
          mode="create"
          documentTypes={documentTypes}
          linkEntity={entity}
          linkEntityId={entityId}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (!created) return;
      toast.success("Document créé et lié.");
      notifyChange();
    });
  };

  const handleLinkExisting = () => {
    if (!selectedDocumentId) {
      toast.error("Sélectionnez un document.");
      return;
    }
    startTransition(async () => {
      const result = await linkDocumentToEntity({
        entity,
        entityId,
        documentId: selectedDocumentId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Document lié.");
      setLinkOpen(false);
      setSelectedDocumentId("");
      notifyChange();
    });
  };

  const handleUnlink = () => {
    if (!pendingUnlink) return;
    startTransition(async () => {
      const result = await unlinkDocumentFromEntity({
        entity,
        entityId,
        documentId: pendingUnlink.id,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Document retiré.");
      setPendingUnlink(null);
      notifyChange();
    });
  };

  return (
    <>
      <EntityDocumentationSection
        title="Documents"
        action={
          <IconActionButton
            label="Ajouter un document"
            variant="outline"
            onClick={() => setLinkOpen(true)}
          >
            <Plus className="size-4" />
          </IconActionButton>
        }
      >
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document lié.</p>
        ) : (
          <ul className="space-y-1">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openDocument(doc)}
                >
                  <span className="font-medium">{doc.document_name}</span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.document_type.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      V{doc.version_number}
                    </Badge>
                  </span>
                </button>
                <IconActionButton
                  label="Retirer le document"
                  attention
                  onClick={() => setPendingUnlink(doc)}
                >
                  <Trash className="size-3.5" />
                </IconActionButton>
              </li>
            ))}
          </ul>
        )}
      </EntityDocumentationSection>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lier un document</DialogTitle>
            <DialogDescription>
              Associez un document existant, ou créez-en un nouveau (il sera lié
              automatiquement).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Document existant</Label>
              <Select
                value={selectedDocumentId || "__unset__"}
                onValueChange={(value) =>
                  setSelectedDocumentId(value === "__unset__" ? "" : value)
                }
                disabled={isPending || availableOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      availableOptions.length === 0
                        ? "Tous les documents sont déjà liés"
                        : "Sélectionner un document"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__" disabled>
                    Sélectionner un document
                  </SelectItem>
                  {availableOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.document_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={openCreateAndLink}
            >
              Créer un nouveau document
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setLinkOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={isPending || !selectedDocumentId}
                onClick={handleLinkExisting}
              >
                {isPending ? "Liaison…" : "Lier"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingUnlink ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingUnlink(null);
          }}
        >
          <DialogContent className="border-destructive">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Retirer le document
              </DialogTitle>
              <DialogDescription>
                Retirer <strong>{pendingUnlink.document_name}</strong> de cette
                fiche ? Le document reste dans la bibliothèque.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setPendingUnlink(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleUnlink}
              >
                {isPending ? "Retrait…" : "Retirer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
