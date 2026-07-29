"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { PageHero } from "@/components/layout/page-hero";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamCard } from "@/components/collaborators/team-card";
import { CollaboratorCard } from "@/components/collaborators/collaborator-card";
import {
  CollaboratorConsultationContent,
  TeamConsultationContent,
} from "@/components/collaborators/consultation-drawers";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import {
  getCollaboratorFullName,
  getCollaboratorRoleLabel,
} from "@/lib/collaborators/labels";
import type {
  CollaboratorListItem,
  TeamListItem,
} from "@/lib/collaborators/types";

type Top10PageClientProps = {
  teams: TeamListItem[];
  collaborators: CollaboratorListItem[];
};

function matchesQuery(haystack: string, query: string): boolean {
  return haystack.toLocaleLowerCase("fr").includes(query);
}

export function Top10PageClient({
  teams,
  collaborators,
}: Top10PageClientProps) {
  const { pushDrawer } = useDrawerStack();
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLocaleLowerCase("fr");

  const teamsWithActiveMembers = useMemo(
    () =>
      teams.map((team) => ({
        ...team,
        members: team.members.filter((member) => member.status === "actif"),
      })),
    [teams],
  );

  const visibleCollaborators = useMemo(() => {
    const active = collaborators.filter((person) => person.status === "actif");
    if (!normalizedQuery) {
      return active;
    }
    return active.filter((person) => {
      const blob = [
        person.first_name,
        person.last_name,
        person.job_title,
        person.team_name,
        getCollaboratorRoleLabel(person.role),
        person.email,
      ]
        .join(" ")
        .toLocaleLowerCase("fr");
      return matchesQuery(blob, normalizedQuery);
    });
  }, [collaborators, normalizedQuery]);

  const visibleTeams = useMemo(() => {
    if (!normalizedQuery) {
      return teamsWithActiveMembers;
    }

    return teamsWithActiveMembers
      .map((team) => {
        const teamMatches = matchesQuery(
          `${team.team_name} ${team.notes ?? ""} ${team.categories.map((c) => c.label).join(" ")}`.toLocaleLowerCase(
            "fr",
          ),
          normalizedQuery,
        );

        const filteredMembers = team.members.filter((member) => {
          const blob = [
            member.first_name,
            member.last_name,
            member.job_title,
            getCollaboratorRoleLabel(member.role),
          ]
            .join(" ")
            .toLocaleLowerCase("fr");
          return matchesQuery(blob, normalizedQuery);
        });

        if (!teamMatches && filteredMembers.length === 0) {
          return null;
        }

        return {
          ...team,
          members: teamMatches ? team.members : filteredMembers,
        };
      })
      .filter((team): team is TeamListItem => team !== null);
  }, [teamsWithActiveMembers, normalizedQuery]);

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

  const openTeamDrawer = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return;
    }

    void pushDrawer({
      title: team.team_name,
      content: () => (
        <TeamConsultationContent
          team={{
            ...team,
            members: team.members.filter((m) => m.status === "actif"),
          }}
          onOpenCollaborator={(collaboratorId) => {
            openCollaboratorDrawer(collaboratorId);
          }}
        />
      ),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero
        title="Top 10 Stratégie"
        actions={
          <div className="relative w-full max-w-sm">
            <MagnifyingGlass
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Rechercher un pôle ou un collaborateur…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
              aria-label="Recherche contextuelle pôles et collaborateurs"
            />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6">
        <Tabs defaultValue="poles" className="flex min-h-0 flex-1 flex-col">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="poles">Pôles</TabsTrigger>
            <TabsTrigger value="collaborateurs">Collaborateurs</TabsTrigger>
          </TabsList>

          <TabsContent
            value="poles"
            className="mt-4 min-h-0 flex-1 overflow-y-auto"
          >
            {visibleTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {normalizedQuery
                  ? "Aucun pôle ne correspond à la recherche."
                  : "Aucun pôle pour le moment."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onOpenTeam={() => openTeamDrawer(team.id)}
                    onOpenCollaborator={openCollaboratorDrawer}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="collaborateurs"
            className="mt-4 min-h-0 flex-1 overflow-y-auto"
          >
            {visibleCollaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {normalizedQuery
                  ? "Aucun collaborateur ne correspond à la recherche."
                  : "Aucun collaborateur actif pour le moment."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleCollaborators.map((collaborator) => (
                  <CollaboratorCard
                    key={collaborator.id}
                    collaborator={collaborator}
                    variant="full"
                    onClick={() => openCollaboratorDrawer(collaborator.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
