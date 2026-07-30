"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteTeam } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteTeamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  memberCount: number;
  onDeleted: () => void;
};

/**
 * Confirmation de suppression d'un pôle.
 * Si des collaborateurs sont encore rattachés, la suppression est refusée
 * (message + pas d'appel delete) — déplacement obligatoire avant.
 */
export function DeleteTeamDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  memberCount,
  onDeleted,
}: DeleteTeamDialogProps) {
  const [isPending, startTransition] = useTransition();
  const hasMembers = memberCount > 0;

  const handleConfirm = () => {
    if (hasMembers) {
      toast.error(
        memberCount === 1
          ? "Déplacez d'abord le collaborateur vers un autre pôle."
          : `Déplacez d'abord les ${memberCount} collaborateurs vers un autre pôle.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await deleteTeam(teamId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Pôle supprimé.");
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer le pôle
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {hasMembers ? (
                <>
                  <p>
                    Vous souhaitez supprimer <strong>{teamName}</strong>.
                  </p>
                  <p>
                    {memberCount === 1
                      ? "1 collaborateur est encore rattaché à ce pôle."
                      : `${memberCount} collaborateurs sont encore rattachés à ce pôle.`}{" "}
                    Déplacez-les vers un autre pôle avant de pouvoir le
                    supprimer.
                  </p>
                </>
              ) : (
                <p>
                  Vous souhaitez supprimer <strong>{teamName}</strong>.
                  Confirmez-vous ? Toute suppression d&apos;un pôle est
                  définitive.
                </p>
              )}
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
            disabled={isPending || hasMembers}
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
