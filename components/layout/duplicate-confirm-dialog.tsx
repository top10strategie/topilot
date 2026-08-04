"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DuplicateConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: "mission" | "opportunité";
  entityName: string;
  onConfirm: () => void;
};

/**
 * Modale de confirmation avant ouverture du tiroir de création prérempli.
 */
export function DuplicateConfirmDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  onConfirm,
}: DuplicateConfirmDialogProps) {
  const message =
    entityLabel === "mission"
      ? `Voulez-vous dupliquer la mission ${entityName} ?`
      : `Voulez-vous dupliquer l'opportunité ${entityName} ?`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplication</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Dupliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
