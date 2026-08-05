"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CopySimple,
  GearSix,
  MagnifyingGlass,
  PencilSimple,
  PushPin,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";
import { deleteContactClient } from "@/actions/contact-clients";
import { deactivateClient } from "@/actions/clients";
import { AuditHistoryButton } from "@/components/audit/audit-history-button";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { ContactFormDrawer } from "@/components/clients/contact-form-drawer";
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
import { MissionConsultationDrawer } from "@/components/missions/mission-consultation-drawer";
import { MissionFormDrawer } from "@/components/missions/mission-form-drawer";
import { EntityNotesEditor } from "@/components/notes/entity-notes-editor";
import { EntityLinkedToolsSection } from "@/components/tools/entity-linked-tools-section";
import { EntityLinkedWikisSection } from "@/components/wiki/entity-linked-wikis-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem, DocumentTypeItem } from "@/lib/categories/types";
import { buildMissionDuplicatePrefill } from "@/lib/crm/duplicate-prefill";
import {
  getClientResponsibleName,
  getClientStatusLabel,
  getContactFullName,
} from "@/lib/clients/labels";
import type { ClientDetail, ClientListItem, ContactClientItem } from "@/lib/clients/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
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
  MissionListItem,
  MissionOpportunityOption,
} from "@/lib/missions/types";
import type { LinkedToolItem } from "@/lib/tools/types";
import type {
  LinkedWikiItem,
  WikiLinkOption,
} from "@/lib/wiki/types";

type ClientDetailPageClientProps = {
  client: ClientDetail;
  collaborators: CollaboratorListItem[];
  categories: CategoryItem[];
  clients: ClientListItem[];
  missions: MissionListItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
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

export function ClientDetailPageClient({
  client,
  collaborators,
  categories,
  clients,
  missions,
  opportunityOptions,
  currentCollaboratorId,
  linkedTools,
  toolLinkOptions,
  linkedDocuments,
  documentLinkOptions,
  documentTypes,
  linkedWikis,
  wikiLinkOptions,
  canManagePrivacy,
  canViewHistory,
}: ClientDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");
  const [manageContacts, setManageContacts] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContactClientItem | null>(
    null,
  );
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [missionDuplicateTarget, setMissionDuplicateTarget] =
    useState<MissionListItem | null>(null);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (tab !== "informations" || !q) return client.contacts;
    return client.contacts.filter((contact) =>
      [
        contact.first_name,
        contact.last_name,
        contact.job_title,
        contact.email_address,
        contact.phone_number,
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(q),
    );
  }, [client.contacts, query, tab]);

  const openEditClient = () => {
    void pushDrawer({
      title: "Édition Client",
      content: (helpers) => (
        <ClientFormDrawer
          mode="edit"
          client={client}
          collaborators={collaborators}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
    });
  };

  const openCreateContact = () => {
    void pushDrawer({
      title: "Nouveau contact",
      content: (helpers) => (
        <ContactFormDrawer
          mode="create"
          clientId={client.id}
          contactCount={client.contacts.length}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openEditContact = (contact: ContactClientItem) => {
    void pushDrawer({
      title: "Édition Contact Client",
      content: (helpers) => (
        <ContactFormDrawer
          mode="edit"
          clientId={client.id}
          contact={contact}
          contactCount={client.contacts.length}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) router.refresh();
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
            client_id: client.id,
            mission_scope: "client",
          }}
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
        title={client.client_name}
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
                aria-label="Recherche contextuelle fiche client"
              />
            </div>
            <IconActionButton label="Édition Client" onClick={openEditClient}>
              <PencilSimple className="size-4" />
            </IconActionButton>
            <IconActionButton
              label="Désactiver le client"
              attention
              onClick={() => setArchiveOpen(true)}
            >
              <Trash className="size-4" />
            </IconActionButton>
            {canViewHistory ? (
              <AuditHistoryButton
                scope={{ kind: "client", clientId: client.id }}
                dialogTitle={`Historique — ${client.client_name}`}
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
            <EntityDetailsColumns
              left={
                <>
                  <section className="flex gap-4">
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-lg font-semibold">
                      {client.logo_url ? (
                        <img
                          src={client.logo_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        client.client_name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Nom</p>
                        <p className="font-medium">{client.client_name}</p>
                        <Badge
                          variant={client.is_active ? "default" : "secondary"}
                          className="mt-1"
                        >
                          {getClientStatusLabel(client.is_active)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Responsable client
                        </p>
                        <p>{getClientResponsibleName(client.responsible)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">URL</p>
                        {client.website ? (
                          <a
                            href={client.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-primary underline-offset-4 hover:underline"
                          >
                            {client.website}
                          </a>
                        ) : (
                          <p>—</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2 text-sm">
                    <h2 className="text-base font-semibold">Notes</h2>
                    <EntityNotesEditor
                      entity="client"
                      entityId={client.id}
                      initialNotes={client.notes}
                    />
                  </section>
                </>
              }
              right={
                <>
                  <section className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Adresse</p>
                      <p>{client.address_street?.trim() || "—"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground">Code postal</p>
                        <p>{client.address_zip?.trim() || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ville</p>
                        <p>{client.address_city?.trim() || "—"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lien drive</p>
                      {client.drive_link ? (
                        <a
                          href={client.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-primary underline-offset-4 hover:underline"
                        >
                          {client.drive_link}
                        </a>
                      ) : (
                        <p>—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Catégories</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {client.categories.length === 0 ? (
                          <span>—</span>
                        ) : (
                          client.categories.map((category) => (
                            <Badge key={category.id} variant="secondary">
                              {category.label}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-semibold">
                        Contact chez le client
                      </h2>
                      <div className="flex gap-1">
                        <IconActionButton
                          label="Nouveau contact"
                          onClick={openCreateContact}
                        >
                          <UserPlus className="size-4" />
                        </IconActionButton>
                        <IconActionButton
                          label="Gestion contact"
                          onClick={() => setManageContacts((v) => !v)}
                        >
                          <GearSix className="size-4" />
                        </IconActionButton>
                      </div>
                    </div>

                    {filteredContacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun contact
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {filteredContacts.map((contact) => {
                          const initials =
                            `${contact.first_name[0] ?? ""}${contact.last_name[0] ?? ""}`.toUpperCase();
                          const avatar = (
                            <div className="relative">
                              <Avatar className="size-14">
                                {contact.profile_picture_url ? (
                                  <AvatarImage
                                    src={contact.profile_picture_url}
                                    alt=""
                                  />
                                ) : null}
                                <AvatarFallback>
                                  {initials || "?"}
                                </AvatarFallback>
                              </Avatar>
                              {contact.is_main ? (
                                <PushPin
                                  className="absolute -top-1 -right-1 size-4 fill-primary text-primary"
                                  weight="fill"
                                  aria-label="Contact principal"
                                />
                              ) : null}
                            </div>
                          );

                          if (manageContacts) {
                            return (
                              <div
                                key={contact.id}
                                className="flex flex-col items-center gap-2"
                              >
                                {avatar}
                                <div className="flex gap-1">
                                  <IconActionButton
                                    label={`Modifier ${getContactFullName(contact)}`}
                                    onClick={() => openEditContact(contact)}
                                  >
                                    <PencilSimple className="size-4" />
                                  </IconActionButton>
                                  <IconActionButton
                                    label={`Supprimer ${getContactFullName(contact)}`}
                                    attention
                                    onClick={() => setPendingDelete(contact)}
                                  >
                                    <Trash className="size-4" />
                                  </IconActionButton>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <HoverCard key={contact.id}>
                              <HoverCardTrigger asChild>
                                <button type="button" className="rounded-full">
                                  {avatar}
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-64 space-y-1 text-sm">
                                <p className="font-medium">
                                  {getContactFullName(contact)}
                                  {contact.is_main ? " · Principal" : ""}
                                </p>
                                <p className="text-muted-foreground">
                                  {contact.job_title || "—"}
                                </p>
                                <p>{contact.email_address || "—"}</p>
                                <p>{contact.phone_number || "—"}</p>
                              </HoverCardContent>
                            </HoverCard>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              }
            />
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
                    <th className="px-3 py-2 font-medium">Opportunité</th>
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
                        colSpan={8}
                        className="px-3 py-6 text-sm text-muted-foreground"
                      >
                        Aucune mission pour ce client. Créez-en une pour
                        commencer.
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
                          {mission.opportunity?.opportunity_name ?? "—"}
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
            <EntityDocumentationColumns
              documents={
                <EntityLinkedDocumentsSection
                  entity="client"
                  entityId={client.id}
                  documents={linkedDocuments}
                  linkOptions={documentLinkOptions}
                  documentTypes={documentTypes}
                />
              }
              tools={
                <EntityLinkedToolsSection
                  entity="client"
                  entityId={client.id}
                  tools={linkedTools}
                  linkOptions={toolLinkOptions}
                  categories={categories}
                  collaborators={collaborators}
                  canManagePrivacy={canManagePrivacy}
                />
              }
              wiki={
                <EntityLinkedWikisSection
                  entity="client"
                  entityId={client.id}
                  wikis={linkedWikis}
                  linkOptions={wikiLinkOptions}
                  categories={categories}
                />
              }
            />
          </TabsContent>
        </Tabs>
      </div>

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

      {pendingDelete ? (
        <ConfirmStatusDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          title="Supprimer le contact"
          description={
            <p>
              Vous souhaitez supprimer{" "}
              <strong>{getContactFullName(pendingDelete)}</strong>.
              Confirmez-vous ? La suppression est définitive.
            </p>
          }
          confirmLabel="Supprimer"
          pendingLabel="Suppression…"
          successMessage="Contact supprimé."
          onConfirm={() => deleteContactClient(pendingDelete.id)}
          onSuccess={() => {
            setPendingDelete(null);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmStatusDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Désactiver le client"
        description={
          <>
            <p>
              Vous souhaitez désactiver{" "}
              <strong>{client.client_name}</strong>. Confirmez-vous ?
            </p>
            <p>
              Le client passera au statut inactif. Aucune donnée n&apos;est
              supprimée.
            </p>
          </>
        }
        confirmLabel="Désactiver"
        pendingLabel="Désactivation…"
        successMessage="Client désactivé."
        onConfirm={() => deactivateClient(client.id)}
        onSuccess={() => router.push("/clients")}
      />
    </div>
  );
}
