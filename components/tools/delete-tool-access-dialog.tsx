"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteToolAccessRecord } from "@/actions/tool-access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteToolAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessLabel: string;
  accessId: string;
  vaultSecretId: string;
  onDeleted: () => void;
};

export function DeleteToolAccessDialog({
  open,
  onOpenChange,
  accessLabel,
  accessId,
  vaultSecretId,
  onDeleted,
}: DeleteToolAccessDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteToolAccessRecord(accessId, vaultSecretId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Accès supprimé.");
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer l&apos;accès
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer l&apos;accès{" "}
                <strong>{accessLabel}</strong>. Confirmez-vous ?
              </p>
              <p>
                Le mot de passe associé sera également effacé du coffre. Cette
                action est définitive.
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
