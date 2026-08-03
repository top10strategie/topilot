"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteDocumentLineage,
  deleteDocumentVersion,
} from "@/actions/documents";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  /** Seule la version la plus récente peut être retirée individuellement. */
  canDeleteVersionOnly: boolean;
  onDeleted: () => void;
};

/**
 * Suppression document : version seule (si latest) ou lignée entière.
 */
export function DeleteDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  canDeleteVersionOnly,
  onDeleted,
}: DeleteDocumentDialogProps) {
  const [isPending, startTransition] = useTransition();

  const run = (mode: "version" | "lineage") => {
    startTransition(async () => {
      const result =
        mode === "version"
          ? await deleteDocumentVersion(documentId)
          : await deleteDocumentLineage(documentId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        mode === "version"
          ? "Version supprimée."
          : "Document et toutes ses versions supprimés.",
      );
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer le document
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer <strong>{documentName}</strong>.
                Toute suppression d&apos;un document est définitive.
              </p>
              <p>
                Choisissez de retirer uniquement cette version
                {canDeleteVersionOnly
                  ? " (la plus récente)"
                  : " — indisponible car ce n’est pas la version la plus récente"}
                , ou toute la lignée de versions.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="w-full"
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => run("version")}
            disabled={isPending || !canDeleteVersionOnly}
            className="w-full"
          >
            {isPending ? "Suppression…" : "Supprimer cette version"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => run("lineage")}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? "Suppression…" : "Supprimer toute la lignée"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
