"use client";

import { PageHero } from "@/components/layout/page-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollaboratorCard } from "@/components/collaborators/collaborator-card";
import {
  CollaboratorConsultationContent,
  TeamConsultationContent,
} from "@/components/collaborators/consultation-drawers";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { getCollaboratorFullName } from "@/lib/collaborators/labels";
import type {
  CollaboratorListItem,
  TeamListItem,
} from "@/lib/collaborators/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdministrationPageClientProps = {
  canManagePeople: boolean;
  teams: TeamListItem[];
  collaborators: CollaboratorListItem[];
};

export function AdministrationPageClient({
  canManagePeople,
  teams,
  collaborators,
}: AdministrationPageClientProps) {
  const { pushDrawer } = useDrawerStack();

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

  const openTeamDrawer = (team: TeamListItem) => {
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
                  <p className="text-xs text-muted-foreground">
                    Création / édition — prochaine étape
                  </p>
                </div>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun pôle</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {teams.map((team) => (
                      <Card
                        key={team.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer transition-colors hover:bg-accent/30"
                        onClick={() => openTeamDrawer(team)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openTeamDrawer(team);
                          }
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {team.team_name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            {team.members.filter((m) => m.status === "actif")
                              .length}{" "}
                            collaborateur
                            {team.members.filter((m) => m.status === "actif")
                              .length > 1
                              ? "s"
                              : ""}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
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
    </div>
  );
}
