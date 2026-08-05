"use client";

import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

type DeleteToolDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onDeleted: () => void;
};

/**
 * Modale de confirmation de suppression d'outil — façade sur ConfirmStatusDialog.
 */
export function DeleteToolDialog({
  open,
  onOpenChange,
  toolName,
  onConfirm,
  onDeleted,
}: DeleteToolDialogProps) {
  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer l'outil"
      description={
        <>
          <p>
            Vous souhaitez supprimer <strong>{toolName}</strong>. Confirmez-vous
            ?
          </p>
          <p>
            Les accès et abonnements associés seront également supprimés. Toute
            suppression d&apos;un outil est définitive.
          </p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage="Outil supprimé."
      onConfirm={onConfirm}
      onSuccess={onDeleted}
    />
  );
}
