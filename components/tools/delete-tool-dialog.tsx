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

type DeleteToolDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onDeleted: () => void;
};

/**
 * Modale de confirmation de suppression générique (§10) adaptée au libellé
 * "outil" — cf. `10_ux_architecture.mdc` page `/tools`.
 */
export function DeleteToolDialog({
  open,
  onOpenChange,
  toolName,
  onConfirm,
  onDeleted,
}: DeleteToolDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Outil supprimé.");
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer l&apos;outil
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer <strong>{toolName}</strong>.
                Confirmez-vous ?
              </p>
              <p>
                Les accès et abonnements associés seront également supprimés.
                Toute suppression d&apos;un outil est définitive.
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
