"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteWiki } from "@/actions/wikis";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteWikiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wikiId: string;
  wikiTitle: string;
  onDeleted: () => void;
};

export function DeleteWikiDialog({
  open,
  onOpenChange,
  wikiId,
  wikiTitle,
  onDeleted,
}: DeleteWikiDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteWiki(wikiId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Wiki supprimé.");
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Supprimer le wiki
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vous souhaitez supprimer <strong>{wikiTitle}</strong>.
              </p>
              <p>
                Toute suppression d&apos;un wiki est définitive. Êtes-vous sûr
                de vouloir supprimer ce wiki ?
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
