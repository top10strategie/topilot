"use client";

import { anonymizeCollaboratorAction } from "@/actions/collaborators";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

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
  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer le collaborateur"
      description={
        <>
          <p>
            Vous souhaitez supprimer <strong>{collaboratorName}</strong>.
            Confirmez-vous ?
          </p>
          <p>
            Toute suppression d&apos;un collaborateur est définitive : ses
            données nominatives seront anonymisées et l&apos;accès à
            l&apos;application sera révoqué.
          </p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage="Collaborateur anonymisé."
      onConfirm={() => anonymizeCollaboratorAction(collaboratorId)}
      onSuccess={onAnonymized}
    />
  );
}
