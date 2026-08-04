"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stopMissionSeries } from "@/actions/mission-series";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";
import { DuplicateConfirmDialog } from "@/components/layout/duplicate-confirm-dialog";
import {
  createEmptyRecurrenceDraft,
  MissionRecurrenceFields,
} from "@/components/missions/mission-recurrence-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMissionCharge,
  formatMissionDate,
  getMissionKanbanStatusLabel,
  getMissionResponsibleName,
  getMissionScopeLabel,
} from "@/lib/missions/labels";
import type { MissionDetail } from "@/lib/missions/types";

type MissionConsultationDrawerProps = {
  mission: MissionDetail;
  helpers: DrawerHelpers<null>;
  /** Après confirmation : le parent ouvre le tiroir création prérempli. */
  onDuplicate?: () => void;
};

/**
 * Tiroir de consultation mission (lecture seule) — miroir client-consultation-drawer.
 */
export function MissionConsultationDrawer({
  mission,
  helpers,
  onDuplicate,
}: MissionConsultationDrawerProps) {
  const router = useRouter();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [, startTransition] = useTransition();

  const seriesStopped =
    Boolean(mission.series?.ends_on) &&
    (mission.series?.ends_on ?? "") <= new Date().toISOString().slice(0, 10);

  const recurrenceDraft = createEmptyRecurrenceDraft(mission.series);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <div className="grid gap-4 text-sm">
            <div className="grid gap-1">
              <p className="text-muted-foreground">Titre</p>
              <p className="font-medium">{mission.mission_name}</p>
              {mission.mission_scope === "interne" ? (
                <Badge variant="secondary" className="w-fit">
                  Interne
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Responsable mission</p>
              <p className="font-medium">
                {getMissionResponsibleName(mission.responsible)}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Périmètre</p>
              <p className="font-medium">
                {getMissionScopeLabel(mission.mission_scope)}
              </p>
            </div>
            {mission.mission_scope === "client" ? (
              <div className="grid gap-1">
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">
                  {mission.client?.client_name ?? "—"}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold">Complément</h3>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="grid gap-1">
              <p className="text-muted-foreground">Statut</p>
              <p className="font-medium">
                {getMissionKanbanStatusLabel(mission.kanban_status)}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Temps vendu</p>
              <p className="font-medium">
                {formatMissionCharge(mission.estimated_charge)}
              </p>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Date de début</p>
              <p className="font-medium">{formatMissionDate(mission.start_at)}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Date de fin</p>
              <p className="font-medium">{formatMissionDate(mission.end_at)}</p>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <p className="text-muted-foreground">Catégories</p>
            <div className="flex flex-wrap gap-1">
              {mission.categories.length === 0 ? (
                <span>—</span>
              ) : (
                mission.categories.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    {category.label}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {mission.opportunity ? (
            <div className="grid gap-1 text-sm">
              <p className="text-muted-foreground">Opportunité</p>
              <p className="font-medium">
                {mission.opportunity.opportunity_name}
              </p>
            </div>
          ) : null}

          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {mission.notes?.trim() || "Aucune note."}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Documents, outils et wiki : disponibles sur la fiche mission / aux
            points Toolbox et Wiki &amp; Documents.
          </p>
        </section>

        {mission.series ? (
          <section className="space-y-4 border-t pt-4">
            <MissionRecurrenceFields
              draft={recurrenceDraft}
              onChange={() => undefined}
              hasExistingSeries
              seriesStopped={seriesStopped}
              readOnly
              onRequestStop={
                seriesStopped ? undefined : () => setStopOpen(true)
              }
            />
          </section>
        ) : null}
      </DrawerBody>

      <DrawerFooterActions
        className={onDuplicate ? "justify-between sm:justify-between" : undefined}
      >
        {onDuplicate ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDuplicateOpen(true)}
          >
            Dupliquer la mission
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => {
            helpers.dismiss();
            router.push(`/missions/${mission.id}`);
          }}
        >
          Aller à la mission
        </Button>
      </DrawerFooterActions>

      {onDuplicate ? (
        <DuplicateConfirmDialog
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
          entityLabel="mission"
          entityName={mission.mission_name}
          onConfirm={onDuplicate}
        />
      ) : null}

      {mission.series_id ? (
        <ConfirmStatusDialog
          open={stopOpen}
          onOpenChange={setStopOpen}
          title="Arrêter la récurrence"
          description={
            <p>
              Vous souhaitez arrêter la série de récurrence. La fin de série
              sera fixée à aujourd&apos;hui. Confirmez-vous ?
            </p>
          }
          confirmLabel="Arrêter"
          pendingLabel="Arrêt…"
          successMessage="Récurrence arrêtée."
          onConfirm={() => stopMissionSeries(mission.series_id!, mission.id)}
          onSuccess={() => {
            startTransition(() => {
              router.refresh();
            });
            helpers.dismiss();
          }}
        />
      ) : null}
    </div>
  );
}
