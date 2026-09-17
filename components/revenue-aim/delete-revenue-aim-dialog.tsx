"use client";

import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

type DeleteRevenueAimDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onDeleted: () => void;
};

/**
 * Modale de confirmation de suppression d'un objectif de CA.
 */
export function DeleteRevenueAimDialog({
  open,
  onOpenChange,
  year,
  onConfirm,
  onDeleted,
}: DeleteRevenueAimDialogProps) {
  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer l'objectif"
      description={
        <>
          <p>
            Vous souhaitez supprimer l&apos;objectif de CA pour{" "}
            <strong>{year}</strong>. Confirmez-vous ?
          </p>
          <p>Toute suppression d&apos;un objectif est définitive.</p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage="Objectif supprimé."
      onConfirm={onConfirm}
      onSuccess={onDeleted}
    />
  );
}
