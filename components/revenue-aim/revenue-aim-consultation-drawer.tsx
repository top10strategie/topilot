"use client";

import { useState } from "react";
import { PencilSimple, StackPlus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { deleteRevenueAim } from "@/actions/revenue-aim";
import { DrawerBody } from "@/components/drawers/drawer-section";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { DeleteRevenueAimDialog } from "@/components/revenue-aim/delete-revenue-aim-dialog";
import {
  RevenueAimFormDrawer,
  type RevenueAimFormResult,
} from "@/components/revenue-aim/revenue-aim-form-drawer";
import { formatOpportunityPrice } from "@/lib/opportunities/labels";
import type { RevenueAimItem } from "@/lib/revenue-aim/types";

type RevenueAimConsultationDrawerProps = {
  initialAims: RevenueAimItem[];
};

/**
 * Liste des objectifs de CA avec édition / suppression et création empilée.
 */
export function RevenueAimConsultationDrawer({
  initialAims,
}: RevenueAimConsultationDrawerProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [aims, setAims] = useState(initialAims);
  const [pendingDelete, setPendingDelete] = useState<RevenueAimItem | null>(
    null,
  );

  const openCreate = () => {
    void pushDrawer<RevenueAimFormResult>({
      title: "Nouvel objectif de CA",
      content: (helpers) => (
        <RevenueAimFormDrawer mode="create" helpers={helpers} />
      ),
    }).then((created) => {
      if (!created) return;
      setAims((prev) =>
        [...prev.filter((a) => a.year !== created.year), created].sort(
          (a, b) => b.year - a.year,
        ),
      );
      router.refresh();
    });
  };

  const openEdit = (aim: RevenueAimItem) => {
    void pushDrawer<RevenueAimFormResult>({
      title: "Modifier l'objectif de CA",
      content: (helpers) => (
        <RevenueAimFormDrawer
          mode="edit"
          entityId={aim.id}
          initialYear={aim.year}
          initialAmount={aim.amount}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (!updated) return;
      setAims((prev) =>
        [...prev.filter((a) => a.id !== updated.id), updated].sort(
          (a, b) => b.year - a.year,
        ),
      );
      router.refresh();
    });
  };

  return (
    <>
      <DrawerBody>
        <div className="mb-4 flex items-center justify-end">
          <IconActionButton label="Ajouter un objectif" onClick={openCreate}>
            <StackPlus className="size-4" />
          </IconActionButton>
        </div>

        {aims.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun objectif de CA enregistré.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {aims.map((aim) => (
              <li
                key={aim.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <span className="w-16 shrink-0 font-medium tabular-nums">
                  {aim.year}
                </span>
                <span className="min-w-0 flex-1 text-right tabular-nums text-muted-foreground">
                  {formatOpportunityPrice(aim.amount)}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <IconActionButton
                    label={`Modifier l'objectif ${aim.year}`}
                    onClick={() => openEdit(aim)}
                  >
                    <PencilSimple className="size-4" />
                  </IconActionButton>
                  <IconActionButton
                    label={`Supprimer l'objectif ${aim.year}`}
                    attention
                    onClick={() => setPendingDelete(aim)}
                  >
                    <Trash className="size-4" />
                  </IconActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DrawerBody>

      <DeleteRevenueAimDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        year={pendingDelete?.year ?? 0}
        onConfirm={async () => {
          if (!pendingDelete) {
            return { success: false, error: "Objectif introuvable." };
          }
          return deleteRevenueAim(pendingDelete.id);
        }}
        onDeleted={() => {
          const deletedId = pendingDelete?.id;
          setPendingDelete(null);
          if (deletedId) {
            setAims((prev) => prev.filter((a) => a.id !== deletedId));
          }
          router.refresh();
        }}
      />
    </>
  );
}
