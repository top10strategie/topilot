"use client";

import { deleteToolAccessRecord } from "@/actions/tool-access";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

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
  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer l'accès"
      description={
        <>
          <p>
            Vous souhaitez supprimer l&apos;accès{" "}
            <strong>{accessLabel}</strong>. Confirmez-vous ?
          </p>
          <p>
            Le mot de passe associé sera également effacé du coffre. Cette
            action est définitive.
          </p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage="Accès supprimé."
      onConfirm={() => deleteToolAccessRecord(accessId, vaultSecretId)}
      onSuccess={onDeleted}
    />
  );
}
