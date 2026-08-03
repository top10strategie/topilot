"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocumentListItem } from "@/lib/documents/types";

type DocumentPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentListItem | null;
};

function previewSrc(doc: DocumentListItem): string {
  if (doc.preview_url) return doc.preview_url;
  if (doc.storage_type === "url" && doc.url) return doc.url;
  return `/api/documents/${doc.id}/file`;
}

function isImagePreview(doc: DocumentListItem): boolean {
  if (doc.is_visual || Boolean(doc.preview_url)) return true;
  const name = doc.document_name.toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name);
}

/**
 * Modale d’aperçu document (image / iframe / lien externe).
 */
export function DocumentPreviewDialog({
  open,
  onOpenChange,
  document: doc,
}: DocumentPreviewDialogProps) {
  if (!doc) return null;

  const src = previewSrc(doc);
  const showImage = isImagePreview(doc);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{doc.document_name}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20">
          {showImage ? (
            <img
              src={src}
              alt={doc.document_name}
              className="mx-auto max-h-[60vh] w-auto max-w-full object-contain p-2"
            />
          ) : (
            <iframe
              title={doc.document_name}
              src={src}
              className="h-[60vh] w-full border-0"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              window.open(src, "_blank", "noopener,noreferrer")
            }
          >
            Ouvrir dans un nouvel onglet
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
