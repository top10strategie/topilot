"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GearSix,
  MagnifyingGlass,
  PencilSimple,
  PushPin,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { deleteContactClient } from "@/actions/contact-clients";
import { ClientFormDrawer } from "@/components/clients/client-form-drawer";
import { ContactFormDrawer } from "@/components/clients/contact-form-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityDetailsColumns } from "@/components/layout/entity-details-columns";
import {
  EntityDocumentationColumns,
  EntityDocumentationSection,
} from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import { MissionConsultationDrawer } from "@/components/missions/mission-consultation-drawer";
import { MissionFormDrawer } from "@/components/missions/mission-form-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem } from "@/lib/categories/types";
import {
  getClientResponsibleName,
  getClientStatusLabel,
  getContactFullName,
} from "@/lib/clients/labels";
import type { ClientDetail, ClientListItem, ContactClientItem } from "@/lib/clients/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
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

type ClientDetailPageClientProps = {
  client: ClientDetail;
  collaborators: CollaboratorListItem[];
  categories: CategoryItem[];
  clients: ClientListItem[];
  missions: MissionListItem[];
  opportunityOptions: MissionOpportunityOption[];
  currentCollaboratorId: string;
};

export function ClientDetailPageClient({
  client,
  collaborators,
  categories,
  clients,
  missions,
  opportunityOptions,
  currentCollaboratorId,
}: ClientDetailPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [tab, setTab] = useState("informations");
  const [query, setQuery] = useState("");
  const [manageContacts, setManageContacts] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContactClientItem | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

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

  const openMissionConsultation = (mission: MissionListItem) => {
    void pushDrawer({
      title: mission.mission_name,
      content: (helpers) => (
        <MissionConsultationDrawer
          mission={{ ...mission, notes: null }}
          helpers={helpers}
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
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {client.notes?.trim() || "Aucune note."}
                    </p>
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
                                    variant="destructive"
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
                  </tr>
                </thead>
                <tbody>
                  {missions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
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
                <EntityDocumentationSection title="Documents">
                  {client.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun document lié.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {client.documents.map((doc) => (
                        <li key={doc.id}>{doc.document_name}</li>
                      ))}
                    </ul>
                  )}
                </EntityDocumentationSection>
              }
              tools={
                <EntityDocumentationSection title="Outils">
                  <p className="text-sm text-muted-foreground">
                    Disponible au point Toolbox.
                  </p>
                </EntityDocumentationSection>
              }
              wiki={
                <EntityDocumentationSection title="Wiki">
                  <p className="text-sm text-muted-foreground">
                    Disponible au point Wiki &amp; Documents.
                  </p>
                </EntityDocumentationSection>
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {pendingDelete ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
        >
          <DialogContent className="border-destructive">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Supprimer le contact
              </DialogTitle>
              <DialogDescription>
                Vous souhaitez supprimer{" "}
                <strong>{getContactFullName(pendingDelete)}</strong>.
                Confirmez-vous ? La suppression est définitive.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setPendingDelete(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteContactClient(pendingDelete.id);
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Contact supprimé.");
                    setPendingDelete(null);
                    router.refresh();
                  });
                }}
              >
                {isPending ? "Suppression…" : "Supprimer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
