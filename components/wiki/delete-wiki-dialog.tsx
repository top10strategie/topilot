"use client";

import { deleteWiki } from "@/actions/wikis";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

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
  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer le wiki"
      description={
        <>
          <p>
            Vous souhaitez supprimer <strong>{wikiTitle}</strong>.
          </p>
          <p>
            Toute suppression d&apos;un wiki est définitive. Êtes-vous sûr de
            vouloir supprimer ce wiki ?
          </p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage="Wiki supprimé."
      onConfirm={() => deleteWiki(wikiId)}
      onSuccess={onDeleted}
    />
  );
}
