"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { anonymizeCollaboratorAction } from "@/actions/collaborators";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AnonymizeCollaboratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  collaboratorName: string;
  onAnonymized: () => void;
};

/**
 * Confirmation d'offboarding. Façade « suppression » → anonymisation SQL.
 */
export function AnonymizeCollaboratorDialog({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
  onAnonymized,
}: AnonymizeCollaboratorDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await anonymizeCollaboratorAction(collaboratorId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Collaborateur anonymisé.");
      onOpenChange(false);
      onAnonymized();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer le collaborateur
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer <strong>{collaboratorName}</strong>.
                Confirmez-vous ?
              </p>
              <p>
                Toute suppression d&apos;un collaborateur est définitive : ses
                données nominatives seront anonymisées et l&apos;accès à
                l&apos;application sera révoqué.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
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
