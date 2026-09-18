"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  CirclesThreePlus,
  CopySimple,
  MagnifyingGlass,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { fetchClientForConsultation } from "@/actions/clients";
import { fetchMissionsForOpportunity } from "@/actions/missions";
import {
  fetchOpportunitiesListFilterOptions,
  markOpportunityAsLost,
} from "@/actions/opportunities";
import { AuditHistoryButton } from "@/components/audit/audit-history-button";
import { ClientConsultationDrawer } from "@/components/clients/client-consultation-drawer-lazy";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";
import { DuplicateConfirmDialog } from "@/components/layout/duplicate-confirm-dialog";
import { EntityDetailsColumns } from "@/components/layout/entity-details-columns";
import { EntityFormDocumentationBlock } from "@/components/layout/entity-form-documentation-block";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { MissionConsultationDrawer } from "@/components/missions/mission-consultation-drawer-lazy";
import { MissionFormDrawer } from "@/components/missions/mission-form-drawer-lazy";
import { OpportunityFormDrawer } from "@/components/opportunities/opportunity-form-drawer-lazy";
import { EntityNotesEditor } from "@/components/notes/entity-notes-editor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem } from "@/lib/categories/types";
import type { ClientOption } from "@/lib/clients/types";
import { getContactFullName } from "@/lib/clients/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import {
  buildMissionDuplicatePrefill,
  buildOpportunityDuplicatePrefill,
} from "@/lib/crm/duplicate-prefill";
import { getEndDateToneClass } from "@/lib/dates/end-date-tone";
import {
  formatOpportunityDate,
  formatOpportunityPrice,
  formatOpportunityProbability,
  getOpportunityInvoiceFrequencyLabel,
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
import { cn } from "@/lib/utils";
import type {
  MissionListItem,
  MissionOpportunityOption,
} from "@/lib/missions/types";
import type { OpportunityDetail } from "@/lib/opportunities/types";

type OpportunityDetailPageClientProps = {
  opportunity: OpportunityDetail;
  currentCollaboratorId: string;
  canManagePrivacy: boolean;
  canViewHistory: boolean;
};

export function OpportunityDetailPageClient({
  opportunity,
  currentCollaboratorId,
  canManagePrivacy,
  canViewHistory,
}: OpportunityDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");
  const [lossOpen, setLossOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [missionDuplicateTarget, setMissionDuplicateTarget] =
    useState<MissionListItem | null>(null);

  const [collaborators, setCollaborators] = useState<CollaboratorListItem[]>(
    [],
  );
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [missionsLoaded, setMissionsLoaded] = useState(false);
  const [missionsLoading, setMissionsLoading] = useState(false);

  const opportunityOptions = useMemo<MissionOpportunityOption[]>(
    () => [
      {
        id: opportunity.id,
        opportunity_name: opportunity.opportunity_name,
        client_id: opportunity.client_id,
      },
    ],
    [opportunity.id, opportunity.opportunity_name, opportunity.client_id],
  );

  const loadFilterOptions = useCallback(async (): Promise<{
    collaborators: CollaboratorListItem[];
    clients: ClientOption[];
    categories: CategoryItem[];
  } | null> => {
    if (optionsLoaded) {
      return { collaborators, clients, categories };
    }
    if (optionsLoading) return null;
    setOptionsLoading(true);
    const result = await fetchOpportunitiesListFilterOptions();
    setOptionsLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    setCollaborators(result.collaborators);
    setClients(result.clients);
    setCategories(result.categories);
    setOptionsLoaded(true);
    return {
      collaborators: result.collaborators,
      clients: result.clients,
      categories: result.categories,
    };
  }, [
    optionsLoaded,
    optionsLoading,
    collaborators,
    clients,
    categories,
  ]);

  const loadMissions = useCallback(async () => {
    if (missionsLoaded || missionsLoading) return;
    setMissionsLoading(true);
    const result = await fetchMissionsForOpportunity(opportunity.id);
    setMissionsLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setMissions(result.missions);
    setMissionsLoaded(true);
  }, [missionsLoaded, missionsLoading, opportunity.id]);

  useEffect(() => {
    setMissions([]);
    setMissionsLoaded(false);
  }, [opportunity.id]);

  useEffect(() => {
    if (tab === "missions") {
      void loadMissions();
    }
    if (tab === "documentations") {
      void loadFilterOptions();
    }
  }, [tab, loadMissions, loadFilterOptions]);

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

  const openEdit = async () => {
    const opts = await loadFilterOptions();
    if (!opts) return;
    void pushDrawer({
      title: "Édition Opportunité",
      content: (helpers) => (
        <OpportunityFormDrawer
          mode="edit"
          opportunity={opportunity}
          collaborators={opts.collaborators}
          clients={opts.clients}
          availableCategories={opts.categories}
          canManagePrivacy={canManagePrivacy}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openDuplicate = async () => {
    const opts = await loadFilterOptions();
    if (!opts) return;
    void pushDrawer({
      title: "Nouvelle opportunité",
      content: (helpers) => (
        <OpportunityFormDrawer
          mode="create"
          collaborators={opts.collaborators}
          clients={opts.clients}
          availableCategories={opts.categories}
          canManagePrivacy={canManagePrivacy}
          duplicatePrefill={buildOpportunityDuplicatePrefill(opportunity)}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openDuplicateMission = async (source: MissionListItem) => {
    const opts = await loadFilterOptions();
    if (!opts) return;
    void pushDrawer({
      title: "Nouvelle mission",
      content: (helpers) => (
        <MissionFormDrawer
          mode="create"
          collaborators={opts.collaborators}
          clients={opts.clients}
          availableCategories={opts.categories}
          opportunityOptions={opportunityOptions}
          currentCollaboratorId={currentCollaboratorId}
          canManagePrivacy={canManagePrivacy}
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

  const openClientConsultation = async () => {
    const result = await fetchClientForConsultation(opportunity.client_id);
    if (!result.success || !result.client) {
      toast.error(result.error || "Client introuvable.");
      return;
    }
    const client = result.client;
    void pushDrawer({
      title: client.client_name,
      content: (helpers) => (
        <ClientConsultationDrawer client={client} helpers={helpers} />
      ),
    });
  };

  const openCreateMission = async () => {
    const opts = await loadFilterOptions();
    if (!opts) return;
    void pushDrawer({
      title: "Nouvelle mission",
      content: (helpers) => (
        <MissionFormDrawer
          mode="create"
          collaborators={opts.collaborators}
          clients={opts.clients}
          availableCategories={opts.categories}
          opportunityOptions={opportunityOptions}
          currentCollaboratorId={currentCollaboratorId}
          canManagePrivacy={canManagePrivacy}
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
            void openDuplicateMission(mission);
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
              onClick={() => void openEdit()}
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
            {canViewHistory ? (
              <AuditHistoryButton
                scope={{
                  kind: "opportunity",
                  opportunityId: opportunity.id,
                }}
                dialogTitle={`Historique — ${opportunity.opportunity_name}`}
              />
            ) : null}
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
                        <button
                          type="button"
                          onClick={() => void openClientConsultation()}
                          className="font-bold text-primary-foreground underline-offset-4 hover:underline"
                        >
                          {opportunity.client.client_name}
                        </button>
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
                    <div className="grid grid-cols-2 gap-3">
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
                        <p
                          className={cn(
                            "font-bold",
                            getEndDateToneClass(opportunity.due_date_at, {
                              muted:
                                opportunity.kanban_status === "gagne" ||
                                opportunity.kanban_status === "perdue",
                            }),
                          )}
                        >
                          {formatOpportunityDate(opportunity.due_date_at)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground">
                          Fin de facturation
                        </p>
                        <p>{formatOpportunityDate(opportunity.end_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Fréquence de facturation
                        </p>
                        <p>
                          {opportunity.invoice_frequency
                            ? getOpportunityInvoiceFrequencyLabel(
                                opportunity.invoice_frequency,
                              )
                            : "—"}
                        </p>
                      </div>
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
                onClick={() => void openCreateMission()}
              >
                <CirclesThreePlus className="size-4" />
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
                  {missionsLoading && !missionsLoaded ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-3 py-3" colSpan={7}>
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : missions.length === 0 ? (
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
                        <td
                          className={cn(
                            "px-3 py-2",
                            getEndDateToneClass(mission.end_at, {
                              muted:
                                mission.kanban_status === "terminee" ||
                                mission.kanban_status === "archivee",
                            }),
                          )}
                        >
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
            {tab === "documentations" ? (
              optionsLoaded ? (
                <EntityFormDocumentationBlock
                  entity="opportunity"
                  entityId={opportunity.id}
                  includeWikis={false}
                  collaborators={collaborators}
                  canManagePrivacy={canManagePrivacy}
                />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <DuplicateConfirmDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        entityLabel="opportunité"
        entityName={opportunity.opportunity_name}
        onConfirm={() => void openDuplicate()}
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
            void openDuplicateMission(missionDuplicateTarget);
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
