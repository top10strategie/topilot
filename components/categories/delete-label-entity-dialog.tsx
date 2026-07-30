"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteLabelEntityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  entityKindLabel: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onDeleted: () => void;
};

/**
 * Modale de confirmation de suppression pour catégorie / type documentaire.
 */
export function DeleteLabelEntityDialog({
  open,
  onOpenChange,
  entityLabel,
  entityKindLabel,
  onConfirm,
  onDeleted,
}: DeleteLabelEntityDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success(
        entityKindLabel === "Catégorie"
          ? "Catégorie supprimée."
          : "Type documentaire supprimé.",
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
            Supprimer {entityKindLabel.toLowerCase()}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer <strong>{entityLabel}</strong>.
                Confirmez-vous ?
              </p>
              <p>
                Toute suppression d&apos;un{entityKindLabel === "Catégorie" ? "e" : ""}{" "}
                {entityKindLabel.toLowerCase()} est définitive.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
