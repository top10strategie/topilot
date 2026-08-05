"use client";

import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

type DeleteLabelEntityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  entityKindLabel: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  onDeleted: () => void;
};

/**
 * Modale de confirmation de suppression pour catégorie / type documentaire.
 */
export function DeleteLabelEntityDialog({
  open,
  onOpenChange,
  entityLabel,
  entityKindLabel,
  onConfirm,
  onDeleted,
}: DeleteLabelEntityDialogProps) {
  const isCategory = entityKindLabel === "Catégorie";

  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Supprimer ${entityKindLabel.toLowerCase()}`}
      description={
        <>
          <p>
            Vous souhaitez supprimer <strong>{entityLabel}</strong>.
            Confirmez-vous ?
          </p>
          <p>
            Toute suppression d&apos;un{isCategory ? "e" : ""}{" "}
            {entityKindLabel.toLowerCase()} est définitive.
          </p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage={
        isCategory ? "Catégorie supprimée." : "Type documentaire supprimé."
      }
      onConfirm={onConfirm}
      onSuccess={onDeleted}
    />
  );
}
