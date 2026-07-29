"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { PageHero } from "@/components/layout/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CollaboratorCard } from "@/components/collaborators/collaborator-card";
import {
  CollaboratorConsultationContent,
  TeamConsultationContent,
} from "@/components/collaborators/consultation-drawers";
import { DeleteTeamDialog } from "@/components/collaborators/delete-team-dialog";
import { TeamFormDrawer } from "@/components/collaborators/team-form-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type {
  CollaboratorListItem,
  TeamListItem,
} from "@/lib/collaborators/types";

type AdministrationPageClientProps = {
  canManagePeople: boolean;
  teams: TeamListItem[];
  collaborators: CollaboratorListItem[];
};

type PendingDelete = {
  id: string;
  team_name: string;
  memberCount: number;
};

export function AdministrationPageClient({
  canManagePeople,
  teams,
  collaborators,
}: AdministrationPageClientProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

  const activeCollaborators = collaborators.filter(
    (person) => person.status === "actif",
  );

  const openCollaboratorDrawer = (collaboratorId: string) => {
    const collaborator = collaborators.find((c) => c.id === collaboratorId);
    if (!collaborator) {
      return;
    }

    void pushDrawer({
      title: getCollaboratorFullName(collaborator),
      content: () => (
        <CollaboratorConsultationContent collaborator={collaborator} />
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
          onOpenCollaborator={openCollaboratorDrawer}
        />
      ),
    });
  };

  const openCreateTeam = () => {
    void pushDrawer({
      title: "Nouveau Pôle",
      content: (helpers) => <TeamFormDrawer mode="create" helpers={helpers} />,
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
          }}
          helpers={helpers}
        />
      ),
    }).then((updated) => {
      if (updated) {
        router.refresh();
      }
    });
  };

  const requestDeleteTeam = (team: TeamListItem) => {
    setPendingDelete({
      id: team.id,
      team_name: team.team_name,
      memberCount: team.members.length,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Gestion Admin" />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6">
        <Tabs
          defaultValue={canManagePeople ? "people" : "categories"}
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
            className="mt-4 min-h-0 flex-1 overflow-y-auto"
          >
            <p className="text-sm text-muted-foreground">
              Gestion des catégories — à venir.
            </p>
          </TabsContent>

          <TabsContent
            value="types"
            className="mt-4 min-h-0 flex-1 overflow-y-auto"
          >
            <p className="text-sm text-muted-foreground">
              Gestion des types documentaires — à venir.
            </p>
          </TabsContent>

          {canManagePeople ? (
            <TabsContent
              value="people"
              className="mt-4 min-h-0 flex-1 space-y-8 overflow-y-auto"
            >
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">Pôles</h2>
                  <Button
                    type="button"
                    size="sm"
                    onClick={openCreateTeam}
                    className="gap-1.5"
                  >
                    <Plus className="size-4" weight="bold" />
                    Nouveau Pôle
                  </Button>
                </div>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun pôle</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {teams.map((team) => {
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-8"
                                  aria-label={`Modifier ${team.team_name}`}
                                  onClick={() => openEditTeam(team)}
                                >
                                  <PencilSimple className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="size-8"
                                  aria-label={`Supprimer ${team.team_name}`}
                                  onClick={() => requestDeleteTeam(team)}
                                >
                                  <Trash className="size-4" />
                                </Button>
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
                  <p className="text-xs text-muted-foreground">
                    Invitation / édition — prochaine étape
                  </p>
                </div>
                {activeCollaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun collaborateur actif
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {activeCollaborators.map((collaborator) => (
                      <CollaboratorCard
                        key={collaborator.id}
                        collaborator={collaborator}
                        variant="full"
                        onClick={() => openCollaboratorDrawer(collaborator.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {pendingDelete ? (
        <DeleteTeamDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingDelete(null);
            }
          }}
          teamId={pendingDelete.id}
          teamName={pendingDelete.team_name}
          memberCount={pendingDelete.memberCount}
          onDeleted={() => {
            setPendingDelete(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
