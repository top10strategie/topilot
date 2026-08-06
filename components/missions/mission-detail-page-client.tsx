"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopySimple, MagnifyingGlass, PencilSimple, Trash } from "@phosphor-icons/react";
import { archiveMission } from "@/actions/missions";
import { AuditHistoryButton } from "@/components/audit/audit-history-button";
import { ClientConsultationDrawer } from "@/components/clients/client-consultation-drawer";
import { EntityLinkedDocumentsSection } from "@/components/documents/entity-linked-documents-section";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";
import { DuplicateConfirmDialog } from "@/components/layout/duplicate-confirm-dialog";
import { EntityDetailsColumns } from "@/components/layout/entity-details-columns";
import {
  EntityDocumentationColumns,
} from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { MissionFormDrawer } from "@/components/missions/mission-form-drawer";
import { EntityNotesEditor } from "@/components/notes/entity-notes-editor";
import { EntityLinkedToolsSection } from "@/components/tools/entity-linked-tools-section";
import { EntityLinkedWikisSection } from "@/components/wiki/entity-linked-wikis-section";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem, DocumentTypeItem } from "@/lib/categories/types";
import type { ClientDetail, ClientListItem } from "@/lib/clients/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import { buildMissionDuplicatePrefill } from "@/lib/crm/duplicate-prefill";
import type {
  DocumentLinkOption,
  LinkedDocumentItem,
} from "@/lib/documents/types";
import {
  formatMissionCharge,
  formatMissionDate,
  getMissionKanbanStatusLabel,
  getMissionResponsibleName,
} from "@/lib/missions/labels";
import type {
  MissionDetail,
  MissionOpportunityOption,
} from "@/lib/missions/types";
import type { LinkedToolItem } from "@/lib/tools/types";
import type {
  LinkedWikiItem,
  WikiLinkOption,
} from "@/lib/wiki/types";

type MissionDetailPageClientProps = {
  mission: MissionDetail;
  collaborators: CollaboratorListItem[];
  clients: ClientListItem[];
  categories: CategoryItem[];
  utilityCategories: CategoryItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
  linkedClient: ClientDetail | null;
  linkedTools: LinkedToolItem[];
  toolLinkOptions: Array<{ id: string; tool_name: string }>;
  linkedDocuments: LinkedDocumentItem[];
  documentLinkOptions: DocumentLinkOption[];
  documentTypes: DocumentTypeItem[];
  linkedWikis: LinkedWikiItem[];
  wikiLinkOptions: WikiLinkOption[];
  canManagePrivacy: boolean;
  canViewHistory: boolean;
};

export function MissionDetailPageClient({
  mission,
  collaborators,
  clients,
  categories,
  utilityCategories,
  opportunityOptions,
  currentCollaboratorId,
  linkedClient,
  linkedTools,
  toolLinkOptions,
  linkedDocuments,
  documentLinkOptions,
  documentTypes,
  linkedWikis,
  wikiLinkOptions,
  canManagePrivacy,
  canViewHistory,
}: MissionDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q || tab !== "informations") return true;
    const blob = [
      mission.mission_name,
      mission.client?.client_name,
      mission.opportunity?.opportunity_name,
      getMissionResponsibleName(mission.responsible),
      getMissionKanbanStatusLabel(mission.kanban_status),
      mission.notes,
      ...mission.categories.map((c) => c.label),
    ]
      .join(" ")
      .toLocaleLowerCase("fr");
    return blob.includes(q);
  }, [mission, query, tab]);

  const openEdit = () => {
    void pushDrawer({
      title: "Édition Mission",
      content: (helpers) => (
        <MissionFormDrawer
          mode="edit"
          mission={mission}
          collaborators={collaborators}
          clients={clients}
          availableCategories={categories}
          opportunityOptions={opportunityOptions}
          currentCollaboratorId={currentCollaboratorId}
          canManagePrivacy={canManagePrivacy}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openDuplicate = () => {
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
          canManagePrivacy={canManagePrivacy}
          duplicatePrefill={buildMissionDuplicatePrefill(mission)}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title={mission.mission_name}
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
                aria-label="Recherche contextuelle fiche mission"
              />
            </div>
            <IconActionButton label="Édition Mission" onClick={openEdit}>
              <PencilSimple className="size-4" />
            </IconActionButton>
            <IconActionButton
              label="Dupliquer la mission"
              onClick={() => setDuplicateOpen(true)}
            >
              <CopySimple className="size-4" />
            </IconActionButton>
            <IconActionButton
              label="Archiver la mission"
              attention
              onClick={() => setArchiveOpen(true)}
            >
              <Trash className="size-4" />
            </IconActionButton>
            {canViewHistory ? (
              <AuditHistoryButton
                scope={{
                  kind: "mission",
                  missionId: mission.id,
                  seriesId: mission.series_id,
                }}
                dialogTitle={`Historique — ${mission.mission_name}`}
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
                        <p className="font-medium">{mission.mission_name}</p>
                        {mission.mission_scope === "interne" ? (
                          <Badge variant="secondary" className="mt-1">
                            Interne
                          </Badge>
                        ) : null}
                      </div>
                      {mission.mission_scope !== "interne" ? (
                        <div>
                          <p className="text-muted-foreground">Client</p>
                          {linkedClient ? (
                            <button
                              type="button"
                              onClick={openClientConsultation}
                              className="font-bold text-primary-foreground underline-offset-4 hover:underline"
                            >
                              {mission.client?.client_name ?? "—"}
                            </button>
                          ) : (
                            <p className="font-bold text-primary-foreground">
                              {mission.client?.client_name ?? "—"}
                            </p>
                          )}
                        </div>
                      ) : null}
                      <div>
                        <p className="text-muted-foreground">
                          Responsable mission
                        </p>
                        <p>
                          {getMissionResponsibleName(mission.responsible)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-muted-foreground">Date de début</p>
                          <p>{formatMissionDate(mission.start_at)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date de fin</p>
                          <p className="font-bold text-primary-foreground">
                            {formatMissionDate(mission.end_at)}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2 text-sm">
                      <h2 className="text-base font-semibold">Notes</h2>
                      <EntityNotesEditor
                        entity="mission"
                        entityId={mission.id}
                        initialNotes={mission.notes}
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
                        {getMissionKanbanStatusLabel(mission.kanban_status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Catégories</p>
                      <div className="mt-1 flex flex-wrap gap-1">
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
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 text-muted-foreground">
                        Temps vendu
                      </span>
                      <span className="text-right">
                        {formatMissionCharge(mission.estimated_charge)}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Opportunité</p>
                      {mission.opportunity_id && mission.opportunity ? (
                        <Link
                          href={`/opportunities/${mission.opportunity_id}`}
                          className="font-bold text-primary-foreground underline-offset-4 hover:underline"
                        >
                          {mission.opportunity.opportunity_name}
                        </Link>
                      ) : (
                        <p>—</p>
                      )}
                    </div>
                  </section>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="documentations" className="mt-4">
            <EntityDocumentationColumns
              documents={
                <EntityLinkedDocumentsSection
                  entity="mission"
                  entityId={mission.id}
                  documents={linkedDocuments}
                  linkOptions={documentLinkOptions}
                  documentTypes={documentTypes}
                />
              }
              tools={
                <EntityLinkedToolsSection
                  entity="mission"
                  entityId={mission.id}
                  tools={linkedTools}
                  linkOptions={toolLinkOptions}
                  categories={utilityCategories}
                  collaborators={collaborators}
                  canManagePrivacy={canManagePrivacy}
                />
              }
              wiki={
                <EntityLinkedWikisSection
                  entity="mission"
                  entityId={mission.id}
                  wikis={linkedWikis}
                  linkOptions={wikiLinkOptions}
                  categories={utilityCategories}
                />
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <DuplicateConfirmDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        entityLabel="mission"
        entityName={mission.mission_name}
        onConfirm={openDuplicate}
      />

      <ConfirmStatusDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiver la mission"
        description={
          <>
            <p>
              Vous souhaitez archiver{" "}
              <strong>{mission.mission_name}</strong>. Confirmez-vous ?
            </p>
            <p>
              La mission passera au statut archivée. Aucune donnée n&apos;est
              supprimée.
            </p>
          </>
        }
        confirmLabel="Archiver"
        pendingLabel="Archivage…"
        successMessage="Mission archivée."
        onConfirm={() => archiveMission(mission.id)}
        onSuccess={() => router.push("/missions")}
      />
    </div>
  );
}
