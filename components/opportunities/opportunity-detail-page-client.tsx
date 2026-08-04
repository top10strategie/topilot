"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CopySimple,
  MagnifyingGlass,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { markOpportunityAsLost } from "@/actions/opportunities";
import { ClientConsultationDrawer } from "@/components/clients/client-consultation-drawer";
import { EntityLinkedDocumentsSection } from "@/components/documents/entity-linked-documents-section";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";
import { DuplicateConfirmDialog } from "@/components/layout/duplicate-confirm-dialog";
import { EntityDetailsColumns } from "@/components/layout/entity-details-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { MissionConsultationDrawer } from "@/components/missions/mission-consultation-drawer";
import { MissionFormDrawer } from "@/components/missions/mission-form-drawer";
import { OpportunityFormDrawer } from "@/components/opportunities/opportunity-form-drawer";
import { EntityNotesEditor } from "@/components/notes/entity-notes-editor";
import { EntityLinkedToolsSection } from "@/components/tools/entity-linked-tools-section";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem, DocumentTypeItem } from "@/lib/categories/types";
import type { ClientDetail, ClientListItem } from "@/lib/clients/types";
import { getContactFullName } from "@/lib/clients/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import {
  buildMissionDuplicatePrefill,
  buildOpportunityDuplicatePrefill,
} from "@/lib/crm/duplicate-prefill";
import type {
  DocumentLinkOption,
  LinkedDocumentItem,
} from "@/lib/documents/types";
import {
  formatOpportunityDate,
  formatOpportunityPrice,
  formatOpportunityProbability,
  getOpportunityKanbanStatusLabel,
  getOpportunityPriorityLabel,
  getOpportunityResponsibleName,
} from "@/lib/opportunities/labels";
import {
  formatMissionCharge,
  formatMissionDate,
  getMissionKanbanStatusLabel,
  getMissionResponsibleName,
} from "@/lib/missions/labels";
import type {
  MissionListItem,
  MissionOpportunityOption,
} from "@/lib/missions/types";
import type {
  OpportunityContactOption,
  OpportunityDetail,
} from "@/lib/opportunities/types";
import type { LinkedToolItem } from "@/lib/tools/types";

type OpportunityDetailPageClientProps = {
  opportunity: OpportunityDetail;
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  linkedClient: ClientDetail | null;
  contacts: OpportunityContactOption[];
  categories: CategoryItem[];
  missions: MissionListItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
  linkedTools: LinkedToolItem[];
  toolLinkOptions: Array<{ id: string; tool_name: string }>;
  linkedDocuments: LinkedDocumentItem[];
  documentLinkOptions: DocumentLinkOption[];
  documentTypes: DocumentTypeItem[];
  canManagePrivacy: boolean;
};

export function OpportunityDetailPageClient({
  opportunity,
  collaborators,
  clients,
  linkedClient,
  contacts,
  categories,
  missions,
  opportunityOptions,
  currentCollaboratorId,
  linkedTools,
  toolLinkOptions,
  linkedDocuments,
  documentLinkOptions,
  documentTypes,
  canManagePrivacy,
}: OpportunityDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");
  const [lossOpen, setLossOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [missionDuplicateTarget, setMissionDuplicateTarget] =
    useState<MissionListItem | null>(null);

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q || tab !== "informations") return true;
    const blob = [
      opportunity.opportunity_name,
      opportunity.client.client_name,
      opportunity.contact
        ? getContactFullName(opportunity.contact)
        : "",
      getOpportunityResponsibleName(opportunity.responsible),
      getOpportunityKanbanStatusLabel(opportunity.kanban_status),
      getOpportunityPriorityLabel(opportunity.priority),
      opportunity.action,
      opportunity.source,
      opportunity.notes,
      ...opportunity.categories.map((c) => c.label),
    ]
      .join(" ")
      .toLocaleLowerCase("fr");
    return blob.includes(q);
  }, [opportunity, query, tab]);

  const openEdit = () => {
    void pushDrawer({
      title: "Édition Opportunité",
      content: (helpers) => (
        <OpportunityFormDrawer
          mode="edit"
          opportunity={opportunity}
          collaborators={collaborators}
          clients={clients}
          contacts={contacts}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openDuplicate = () => {
    void pushDrawer({
      title: "Nouvelle opportunité",
      content: (helpers) => (
        <OpportunityFormDrawer
          mode="create"
          collaborators={collaborators}
          clients={clients}
          contacts={contacts}
          availableCategories={categories}
          duplicatePrefill={buildOpportunityDuplicatePrefill(opportunity)}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openDuplicateMission = (source: MissionListItem) => {
    void pushDrawer({
      title: "Nouvelle mission",
      content: (helpers) => (
        <MissionFormDrawer
          mode="create"
          collaborators={collaborators}
          clients={clients}
          availableCategories={categories}
          opportunityOptions={opportunityOptions}
          currentCollaboratorId={currentCollaboratorId}
          duplicatePrefill={buildMissionDuplicatePrefill(source)}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const requestMissionDuplicate = (
    event: MouseEvent,
    mission: MissionListItem,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMissionDuplicateTarget(mission);
  };

  const openClientConsultation = () => {
    if (!linkedClient) return;
    void pushDrawer({
      title: linkedClient.client_name,
      content: (helpers) => (
        <ClientConsultationDrawer client={linkedClient} helpers={helpers} />
      ),
    });
  };

  const openCreateMission = () => {
    void pushDrawer({
      title: "Nouvelle mission",
      content: (helpers) => (
        <MissionFormDrawer
          mode="create"
          collaborators={collaborators}
          clients={clients}
          availableCategories={categories}
          opportunityOptions={opportunityOptions}
          currentCollaboratorId={currentCollaboratorId}
          lockedFields={{
            opportunity_id: opportunity.id,
            client_id: opportunity.client_id,
            mission_scope: "client",
          }}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openMissionConsultation = (mission: MissionListItem) => {
    void pushDrawer({
      title: mission.mission_name,
      content: (helpers) => (
        <MissionConsultationDrawer
          mission={{ ...mission, notes: null }}
          helpers={helpers}
          onDuplicate={() => {
            helpers.dismiss();
            openDuplicateMission(mission);
          }}
        />
      ),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title={opportunity.opportunity_name}
        actions={
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto md:max-w-none">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher dans l'onglet…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                aria-label="Recherche contextuelle fiche opportunité"
              />
            </div>
            <IconActionButton
              label="Édition Opportunité"
              onClick={openEdit}
            >
              <PencilSimple className="size-4" />
            </IconActionButton>
            <IconActionButton
              label="Dupliquer l'opportunité"
              onClick={() => setDuplicateOpen(true)}
            >
              <CopySimple className="size-4" />
            </IconActionButton>
            <IconActionButton
              label="Passer en perte"
              attention
              onClick={() => setLossOpen(true)}
            >
              <Trash className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setQuery("");
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="documentations">Documentations</TabsTrigger>
          </TabsList>

          <TabsContent
            value="informations"
            className="mt-4 min-h-0 flex-1 overflow-y-auto"
          >
            {!matchesQuery ? (
              <p className="text-sm text-muted-foreground">
                Aucun résultat pour cette recherche.
              </p>
            ) : (
              <EntityDetailsColumns
                left={
                  <>
                    <section className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Titre</p>
                        <p className="font-medium">
                          {opportunity.opportunity_name}
                        </p>
                        {!opportunity.is_active ? (
                          <Badge variant="secondary" className="mt-1">
                            Archivée
                          </Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Client</p>
                        {linkedClient ? (
                          <button
                            type="button"
                            onClick={openClientConsultation}
                            className="font-bold text-primary-foreground underline-offset-4 hover:underline"
                          >
                            {opportunity.client.client_name}
                          </button>
                        ) : (
                          <p className="font-bold text-primary-foreground">
                            {opportunity.client.client_name}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Contact</p>
                        <p>
                          {opportunity.contact
                            ? getContactFullName(opportunity.contact)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Responsable opportunité
                        </p>
                        <p>
                          {getOpportunityResponsibleName(
                            opportunity.responsible,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Catégories</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {opportunity.categories.length === 0 ? (
                            <span>—</span>
                          ) : (
                            opportunity.categories.map((category) => (
                              <Badge key={category.id} variant="secondary">
                                {category.label}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 text-sm">
                      <h2 className="text-base font-semibold">Notes</h2>
                      <EntityNotesEditor
                        entity="opportunity"
                        entityId={opportunity.id}
                        initialNotes={opportunity.notes}
                      />
                    </section>
                  </>
                }
                right={
                  <section className="space-y-3 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Statut
                      </span>
                      <span className="text-right">
                        {getOpportunityKanbanStatusLabel(
                          opportunity.kanban_status,
                        )}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Montant
                      </span>
                      <span className="text-right">
                        {formatOpportunityPrice(opportunity.price)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Montant pondéré
                      </span>
                      <span className="text-right">
                        {formatOpportunityPrice(opportunity.average_price)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Probabilité de réussite
                      </span>
                      <span className="text-right">
                        {formatOpportunityProbability(
                          opportunity.probability_confirmation,
                        )}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Urgence
                      </span>
                      <span className="text-right">
                        {getOpportunityPriorityLabel(opportunity.priority)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Action
                      </span>
                      <span className="text-right">
                        {opportunity.action?.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Source
                      </span>
                      <span className="text-right">
                        {opportunity.source?.trim() || "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Date de dernière rencontre
                      </p>
                      <p>
                        {formatOpportunityDate(opportunity.last_meeting_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Échéance</p>
                      <p>{formatOpportunityDate(opportunity.due_date_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date de clôture</p>
                      <p className="font-bold text-primary-foreground">
                        {formatOpportunityDate(opportunity.end_at)}
                      </p>
                    </div>
                  </section>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="missions" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <IconActionButton
                label="Nouvelle mission"
                onClick={openCreateMission}
              >
                <PencilSimple className="size-4" />
              </IconActionButton>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nom</th>
                    <th className="px-3 py-2 font-medium">Responsable</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Début</th>
                    <th className="px-3 py-2 font-medium">Fin</th>
                    <th className="px-3 py-2 font-medium">Temps vendu</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-sm text-muted-foreground"
                      >
                        Aucune mission liée à cette opportunité. Créez-en une
                        pour commencer.
                      </td>
                    </tr>
                  ) : (
                    missions.map((mission) => (
                      <tr
                        key={mission.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                        onClick={() => openMissionConsultation(mission)}
                      >
                        <td className="px-3 py-2 font-medium">
                          {mission.mission_name}
                        </td>
                        <td className="px-3 py-2">
                          {getMissionResponsibleName(mission.responsible)}
                        </td>
                        <td className="px-3 py-2">
                          {getMissionKanbanStatusLabel(mission.kanban_status)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatMissionDate(mission.start_at)}
                        </td>
                        <td className="px-3 py-2 text-primary-foreground">
                          {formatMissionDate(mission.end_at)}
                        </td>
                        <td className="px-3 py-2">
                          {formatMissionCharge(mission.estimated_charge)}
                        </td>
                        <td className="px-3 py-2">
                          <IconActionButton
                            label="Dupliquer la mission"
                            onClick={(event) =>
                              requestMissionDuplicate(event, mission)
                            }
                          >
                            <CopySimple className="size-4" />
                          </IconActionButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="documentations" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <EntityLinkedDocumentsSection
                entity="opportunity"
                entityId={opportunity.id}
                documents={linkedDocuments}
                linkOptions={documentLinkOptions}
                documentTypes={documentTypes}
              />
              <EntityLinkedToolsSection
                entity="opportunity"
                entityId={opportunity.id}
                tools={linkedTools}
                linkOptions={toolLinkOptions}
                categories={categories}
                collaborators={collaborators}
                canManagePrivacy={canManagePrivacy}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DuplicateConfirmDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        entityLabel="opportunité"
        entityName={opportunity.opportunity_name}
        onConfirm={openDuplicate}
      />

      <DuplicateConfirmDialog
        open={missionDuplicateTarget != null}
        onOpenChange={(open) => {
          if (!open) setMissionDuplicateTarget(null);
        }}
        entityLabel="mission"
        entityName={missionDuplicateTarget?.mission_name ?? ""}
        onConfirm={() => {
          if (missionDuplicateTarget) {
            openDuplicateMission(missionDuplicateTarget);
          }
        }}
      />

      <ConfirmStatusDialog
        open={lossOpen}
        onOpenChange={setLossOpen}
        title="Passer l'opportunité en perte"
        description={
          <>
            <p>
              Vous souhaitez marquer{" "}
              <strong>{opportunity.opportunity_name}</strong> comme perdue.
              Confirmez-vous ?
            </p>
            <p>
              L&apos;opportunité passera au statut « Perdue ». Aucune donnée
              n&apos;est supprimée.
            </p>
          </>
        }
        confirmLabel="Passer en perte"
        pendingLabel="Enregistrement…"
        successMessage="Opportunité passée en perte."
        onConfirm={() => markOpportunityAsLost(opportunity.id)}
        onSuccess={() => router.push("/opportunities")}
      />
    </div>
  );
}
