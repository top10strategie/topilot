"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  PencilSimple,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/actions/categories";
import {
  createDocumentType,
  deleteDocumentType,
  updateDocumentType,
} from "@/actions/document-types";
import { DeleteLabelEntityDialog } from "@/components/categories/delete-label-entity-dialog";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { LabelEntityGrid } from "@/components/categories/label-entity-grid";
import { AnonymizeCollaboratorDialog } from "@/components/collaborators/anonymize-collaborator-dialog";
import { CollaboratorCard } from "@/components/collaborators/collaborator-card";
import { CollaboratorFormDrawer } from "@/components/collaborators/collaborator-form-drawer";
import {
  CollaboratorConsultationContent,
  TeamConsultationContent,
} from "@/components/collaborators/consultation-drawers";
import { DeleteTeamDialog } from "@/components/collaborators/delete-team-dialog";
import { TeamFormDrawer } from "@/components/collaborators/team-form-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { PageHero } from "@/components/layout/page-hero";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCollaboratorFullName,
  getCollaboratorStatusLabel,
} from "@/lib/collaborators/labels";
import type {
  CollaboratorListItem,
  TeamListItem,
} from "@/lib/collaborators/types";
import type { CategoryItem, DocumentTypeItem } from "@/lib/categories/types";
import type { MissionListItem } from "@/lib/missions/types";

type AdministrationPageClientProps = {
  canManagePeople: boolean;
  teams: TeamListItem[];
  collaborators: CollaboratorListItem[];
  categories: CategoryItem[];
  documentTypes: DocumentTypeItem[];
  missions: MissionListItem[];
};

type PendingDeleteTeam = {
  id: string;
  team_name: string;
  memberCount: number;
};

type PendingAnonymize = {
  id: string;
  name: string;
};

type PendingDeleteLabel = {
  id: string;
  label: string;
  kind: "category" | "document_type";
};

type AdminTab = "categories" | "types" | "people";

function recentMissionsForCollaborator(
  missions: MissionListItem[],
  collaboratorId: string,
): MissionListItem[] {
  return missions
    .filter(
      (mission) =>
        mission.collaborator_id === collaboratorId &&
        mission.kanban_status !== "archivee",
    )
    .slice(0, 10);
}

function recentMissionsForTeam(
  missions: MissionListItem[],
  collaborators: CollaboratorListItem[],
  teamId: string,
): MissionListItem[] {
  const memberIds = new Set(
    collaborators
      .filter((person) => person.team_id === teamId)
      .map((person) => person.id),
  );
  return missions
    .filter(
      (mission) =>
        memberIds.has(mission.collaborator_id) &&
        mission.kanban_status !== "archivee",
    )
    .slice(0, 10);
}

export function AdministrationPageClient({
  canManagePeople,
  teams,
  collaborators,
  categories,
  documentTypes,
  missions,
}: AdministrationPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [activeTab, setActiveTab] = useState<AdminTab>("categories");
  const [query, setQuery] = useState("");
  const [pendingDeleteTeam, setPendingDeleteTeam] =
    useState<PendingDeleteTeam | null>(null);
  const [pendingAnonymize, setPendingAnonymize] =
    useState<PendingAnonymize | null>(null);
  const [pendingDeleteLabel, setPendingDeleteLabel] =
    useState<PendingDeleteLabel | null>(null);

  const manageableCollaborators = collaborators.filter(
    (person) => person.status !== "sorti",
  );

  const teamOptions = teams.map((team) => ({
    id: team.id,
    team_name: team.team_name,
  }));

  const openCollaboratorConsultation = (collaboratorId: string) => {
    const collaborator = collaborators.find((c) => c.id === collaboratorId);
    if (!collaborator) {
      return;
    }

    void pushDrawer({
      title: getCollaboratorFullName(collaborator),
      content: () => (
        <CollaboratorConsultationContent
          collaborator={collaborator}
          recentMissions={recentMissionsForCollaborator(
            missions,
            collaborator.id,
          )}
        />
      ),
    });
  };

  const openTeamConsultation = (team: TeamListItem) => {
    void pushDrawer({
      title: team.team_name,
      content: () => (
        <TeamConsultationContent
          team={{
            ...team,
            members: team.members.filter((m) => m.status === "actif"),
          }}
          recentMissions={recentMissionsForTeam(
            missions,
            collaborators,
            team.id,
          )}
          onOpenCollaborator={openCollaboratorConsultation}
        />
      ),
    });
  };

  const openCreateTeam = () => {
    void pushDrawer({
      title: "Nouveau Pôle",
      content: (helpers) => (
        <TeamFormDrawer
          mode="create"
          helpers={helpers}
          availableCategories={categories}
        />
      ),
    }).then((created) => {
      if (created) {
        router.refresh();
      }
    });
  };

  const openEditTeam = (team: TeamListItem) => {
    void pushDrawer({
      title: "Édition Pôle",
      content: (helpers) => (
        <TeamFormDrawer
          mode="edit"
          team={{
            id: team.id,
            team_name: team.team_name,
            notes: team.notes,
            categories: team.categories,
          }}
          helpers={helpers}
          availableCategories={categories}
        />
      ),
    }).then((updated) => {
      if (updated) {
        router.refresh();
      }
    });
  };

  const openCreateCollaborator = () => {
    void pushDrawer({
      title: "Nouveau Collaborateur",
      content: (helpers) => (
        <CollaboratorFormDrawer
          mode="create"
          teams={teamOptions}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) {
        router.refresh();
      }
    });
  };

  const openEditCollaborator = (collaborator: CollaboratorListItem) => {
    void pushDrawer({
      title: "Édition Collaborateur",
      content: (helpers) => (
        <CollaboratorFormDrawer
          mode="edit"
          collaborator={collaborator}
          teams={teamOptions}
          availableCategories={categories}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) {
        router.refresh();
      }
    });
  };

  const openCreateCategory = () => {
    void pushDrawer({
      title: "Nouvelle catégorie",
      content: (helpers) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="category"
          helpers={helpers}
          onCreate={createCategory}
          onUpdate={updateCategory}
        />
      ),
    }).then((created) => {
      if (created) {
        router.refresh();
      }
    });
  };

  const openEditCategory = (item: { id: string; label: string }) => {
    void pushDrawer({
      title: "Édition catégorie",
      content: (helpers) => (
        <LabelEntityFormDrawer
          mode="edit"
          entityKind="category"
          entityId={item.id}
          initialLabel={item.label}
          helpers={helpers}
          onCreate={createCategory}
          onUpdate={updateCategory}
        />
      ),
    }).then((updated) => {
      if (updated) {
        router.refresh();
      }
    });
  };

  const openCreateDocumentType = () => {
    void pushDrawer({
      title: "Nouveau type documentaire",
      content: (helpers) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="document_type"
          helpers={helpers}
          onCreate={createDocumentType}
          onUpdate={updateDocumentType}
        />
      ),
    }).then((created) => {
      if (created) {
        router.refresh();
      }
    });
  };

  const openEditDocumentType = (item: { id: string; label: string }) => {
    void pushDrawer({
      title: "Édition type documentaire",
      content: (helpers) => (
        <LabelEntityFormDrawer
          mode="edit"
          entityKind="document_type"
          entityId={item.id}
          initialLabel={item.label}
          helpers={helpers}
          onCreate={createDocumentType}
          onUpdate={updateDocumentType}
        />
      ),
    }).then((updated) => {
      if (updated) {
        router.refresh();
      }
    });
  };

  const handleHeroCreate = () => {
    if (activeTab === "categories") {
      openCreateCategory();
      return;
    }
    if (activeTab === "types") {
      openCreateDocumentType();
    }
    // Onglet people : ajouts via user-plus des sous-sections
  };

  const heroCreateDisabled = activeTab === "people";
  const heroCreateLabel =
    activeTab === "types"
      ? "Nouveau type documentaire"
      : activeTab === "categories"
        ? "Nouvelle catégorie"
        : "Création via les sous-sections";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title="Gestion Admin"
        actions={
          <div className="flex w-full max-w-md items-center gap-2 md:w-auto md:max-w-none">
            <div className="relative min-w-0 flex-1 md:w-72 md:flex-none lg:w-80">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Rechercher…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                aria-label="Recherche contextuelle administration"
              />
            </div>
            <IconActionButton
              label={heroCreateLabel}
              disabled={heroCreateDisabled}
              onClick={handleHeroCreate}
            >
              <PencilSimple className="size-4" />
            </IconActionButton>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as AdminTab);
            setQuery("");
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="categories">Catégories</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
            {canManagePeople ? (
              <TabsTrigger value="people">Collaborateurs &amp; Pôles</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent
            value="categories"
            className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <LabelEntityGrid
              items={categories}
              query={query}
              countLabel="Nombre de catégories"
              emptyMessage={
                query.trim()
                  ? "Aucune catégorie ne correspond à la recherche."
                  : "Aucune catégorie pour le moment."
              }
              onEdit={openEditCategory}
              onDelete={(item) =>
                setPendingDeleteLabel({
                  id: item.id,
                  label: item.label,
                  kind: "category",
                })
              }
            />
          </TabsContent>

          <TabsContent
            value="types"
            className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <LabelEntityGrid
              items={documentTypes}
              query={query}
              countLabel="Nombre de types"
              emptyMessage={
                query.trim()
                  ? "Aucun type ne correspond à la recherche."
                  : "Aucun type documentaire pour le moment."
              }
              onEdit={openEditDocumentType}
              onDelete={(item) =>
                setPendingDeleteLabel({
                  id: item.id,
                  label: item.label,
                  kind: "document_type",
                })
              }
            />
          </TabsContent>

          {canManagePeople ? (
            <TabsContent
              value="people"
              className="mt-4 min-h-0 flex-1 space-y-8 overflow-y-auto"
            >
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">Pôles</h2>
                  <IconActionButton
                    label="Nouveau Pôle"
                    onClick={openCreateTeam}
                  >
                    <UserPlus className="size-4" />
                  </IconActionButton>
                </div>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun pôle</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {teams
                      .filter((team) => {
                        const q = query.trim().toLocaleLowerCase("fr");
                        if (!q) return true;
                        return team.team_name
                          .toLocaleLowerCase("fr")
                          .includes(q);
                      })
                      .map((team) => {
                        const activeCount = team.members.filter(
                          (m) => m.status === "actif",
                        ).length;
                        const totalCount = team.members.length;
                        return (
                          <Card key={team.id}>
                            <CardHeader className="space-y-3 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 text-left"
                                  onClick={() => openTeamConsultation(team)}
                                >
                                  <CardTitle className="text-base hover:underline">
                                    {team.team_name}
                                  </CardTitle>
                                </button>
                                <div className="flex shrink-0 gap-1">
                                  <IconActionButton
                                    label={`Modifier ${team.team_name}`}
                                    onClick={() => openEditTeam(team)}
                                  >
                                    <PencilSimple className="size-4" />
                                  </IconActionButton>
                                  <IconActionButton
                                    label={`Supprimer ${team.team_name}`}
                                    attention
                                    onClick={() =>
                                      setPendingDeleteTeam({
                                        id: team.id,
                                        team_name: team.team_name,
                                        memberCount: team.members.length,
                                      })
                                    }
                                  >
                                    <Trash className="size-4" />
                                  </IconActionButton>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <button
                                type="button"
                                className="text-left text-xs text-muted-foreground hover:underline"
                                onClick={() => openTeamConsultation(team)}
                              >
                                {activeCount} collaborateur
                                {activeCount > 1 ? "s" : ""}
                                {totalCount > activeCount
                                  ? ` (${totalCount} au total)`
                                  : ""}
                              </button>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">Collaborateurs</h2>
                  <IconActionButton
                    label="Nouveau Collaborateur"
                    onClick={openCreateCollaborator}
                    disabled={teams.length === 0}
                  >
                    <UserPlus className="size-4" />
                  </IconActionButton>
                </div>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Créez d&apos;abord un pôle avant d&apos;inviter un
                    collaborateur.
                  </p>
                ) : manageableCollaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun collaborateur
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {manageableCollaborators
                      .filter((collaborator) => {
                        const q = query.trim().toLocaleLowerCase("fr");
                        if (!q) return true;
                        const blob = [
                          collaborator.first_name,
                          collaborator.last_name,
                          collaborator.email,
                          collaborator.job_title,
                          collaborator.team_name,
                        ]
                          .join(" ")
                          .toLocaleLowerCase("fr");
                        return blob.includes(q);
                      })
                      .map((collaborator) => (
                        <div key={collaborator.id} className="relative">
                          <CollaboratorCard
                            collaborator={collaborator}
                            variant="full"
                            className="pr-24"
                            onClick={() =>
                              openCollaboratorConsultation(collaborator.id)
                            }
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <IconActionButton
                              label={`Modifier ${getCollaboratorFullName(collaborator)}`}
                              onClick={() =>
                                openEditCollaborator(collaborator)
                              }
                            >
                              <PencilSimple className="size-4" />
                            </IconActionButton>
                            <IconActionButton
                              label={`Supprimer ${getCollaboratorFullName(collaborator)}`}
                              attention
                              onClick={() =>
                                setPendingAnonymize({
                                  id: collaborator.id,
                                  name: getCollaboratorFullName(collaborator),
                                })
                              }
                            >
                              <Trash className="size-4" />
                            </IconActionButton>
                          </div>
                          {collaborator.status === "inactif" ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {getCollaboratorStatusLabel(collaborator.status)}
                            </p>
                          ) : null}
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {pendingDeleteTeam ? (
        <DeleteTeamDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeleteTeam(null);
            }
          }}
          teamId={pendingDeleteTeam.id}
          teamName={pendingDeleteTeam.team_name}
          memberCount={pendingDeleteTeam.memberCount}
          onDeleted={() => {
            setPendingDeleteTeam(null);
            router.refresh();
          }}
        />
      ) : null}

      {pendingAnonymize ? (
        <AnonymizeCollaboratorDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingAnonymize(null);
            }
          }}
          collaboratorId={pendingAnonymize.id}
          collaboratorName={pendingAnonymize.name}
          onAnonymized={() => {
            setPendingAnonymize(null);
            router.refresh();
          }}
        />
      ) : null}

      {pendingDeleteLabel ? (
        <DeleteLabelEntityDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeleteLabel(null);
            }
          }}
          entityLabel={pendingDeleteLabel.label}
          entityKindLabel={
            pendingDeleteLabel.kind === "category"
              ? "Catégorie"
              : "Type documentaire"
          }
          onConfirm={async () => {
            if (pendingDeleteLabel.kind === "category") {
              return deleteCategory(pendingDeleteLabel.id);
            }
            return deleteDocumentType(pendingDeleteLabel.id);
          }}
          onDeleted={() => {
            setPendingDeleteLabel(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
