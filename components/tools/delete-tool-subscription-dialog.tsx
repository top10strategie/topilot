"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteToolSubscriptionRecord } from "@/actions/tool-subscriptions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteToolSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  subscriptionTitle: string;
  onDeleted: () => void;
};

export function DeleteToolSubscriptionDialog({
  open,
  onOpenChange,
  subscriptionId,
  subscriptionTitle,
  onDeleted,
}: DeleteToolSubscriptionDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteToolSubscriptionRecord(subscriptionId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Abonnement supprimé.");
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer l&apos;abonnement
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer l&apos;abonnement{" "}
                <strong>{subscriptionTitle}</strong>. Confirmez-vous ?
              </p>
              <p>
                Tous les tarifs associés seront également supprimés. Cette
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
