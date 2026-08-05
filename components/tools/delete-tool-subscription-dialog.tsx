"use client";

import { deleteToolSubscriptionRecord } from "@/actions/tool-subscriptions";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";

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
  return (
    <ConfirmStatusDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Supprimer l'abonnement"
      description={
        <>
          <p>
            Vous souhaitez supprimer l&apos;abonnement{" "}
            <strong>{subscriptionTitle}</strong>. Confirmez-vous ?
          </p>
          <p>
            Tous les tarifs associés seront également supprimés. Cette action
            est définitive.
          </p>
        </>
      }
      confirmLabel="Supprimer"
      pendingLabel="Suppression…"
      successMessage="Abonnement supprimé."
      onConfirm={() => deleteToolSubscriptionRecord(subscriptionId)}
      onSuccess={onDeleted}
    />
  );
}
