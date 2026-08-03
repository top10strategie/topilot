"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  CollaboratorAvatar,
  CollaboratorCard,
} from "@/components/collaborators/collaborator-card";
import { DrawerBody } from "@/components/drawers/drawer-section";
import { EntityNotesEditor } from "@/components/notes/entity-notes-editor";
import {
  getCollaboratorFullName,
  getCollaboratorRoleLabel,
} from "@/lib/collaborators/labels";
import type {
  CollaboratorListItem,
  TeamListItem,
} from "@/lib/collaborators/types";
import { formatMissionDate } from "@/lib/missions/labels";
import type { MissionListItem } from "@/lib/missions/types";

function RecentMissionsTable({
  missions,
  seeAllHref,
}: {
  missions: MissionListItem[];
  seeAllHref: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Missions récentes</h3>
        <Link
          href={seeAllHref}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Voir tout →
        </Link>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Mission</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Catégories</th>
              <th className="px-3 py-2 font-medium">Début</th>
              <th className="px-3 py-2 font-medium">Fin</th>
            </tr>
          </thead>
          <tbody>
            {missions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-sm text-muted-foreground"
                >
                  Aucune mission récente.
                </td>
              </tr>
            ) : (
              missions.map((mission) => (
                <tr key={mission.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/missions/${mission.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {mission.mission_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {mission.client?.client_name ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {mission.categories.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        mission.categories.map((category) => (
                          <Badge key={category.id} variant="secondary">
                            {category.label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatMissionDate(mission.start_at)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatMissionDate(mission.end_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CollaboratorConsultationProps = {
  collaborator: CollaboratorListItem;
  recentMissions: MissionListItem[];
};

/**
 * Contenu du tiroir de consultation collaborateur.
 */
export function CollaboratorConsultationContent({
  collaborator,
  recentMissions,
}: CollaboratorConsultationProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <CollaboratorAvatar
            collaborator={collaborator}
            size="xl"
            className="size-24"
          />
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              {getCollaboratorFullName(collaborator)}
            </p>
            <p className="text-sm text-muted-foreground">
              {collaborator.job_title}
            </p>
          </div>
        </div>

        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Pôle</dt>
            <dd className="font-medium">{collaborator.team_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rôle</dt>
            <dd className="font-medium">
              {getCollaboratorRoleLabel(collaborator.role)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{collaborator.email}</dd>
          </div>
        </dl>

        <RecentMissionsTable
          missions={recentMissions}
          seeAllHref={`/missions?responsibleId=${collaborator.id}`}
        />
      </DrawerBody>
    </div>
  );
}

type TeamConsultationProps = {
  team: TeamListItem;
  recentMissions: MissionListItem[];
  onOpenCollaborator: (collaboratorId: string) => void;
};

/**
 * Contenu du tiroir de consultation pôle.
 */
export function TeamConsultationContent({
  team,
  recentMissions,
  onOpenCollaborator,
}: TeamConsultationProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        {team.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {team.categories.map((category) => (
              <Badge key={category.id} variant="secondary">
                {category.label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Notes</h3>
          <EntityNotesEditor
            entity="team"
            entityId={team.id}
            initialNotes={team.notes}
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Collaborateurs ({team.members.length})
          </h3>
          {team.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun collaborateur dans ce pôle
            </p>
          ) : (
            <div className="space-y-2">
              {team.members.map((member) => (
                <CollaboratorCard
                  key={member.id}
                  collaborator={member}
                  variant="compact"
                  onClick={() => onOpenCollaborator(member.id)}
                />
              ))}
            </div>
          )}
        </div>

        <RecentMissionsTable
          missions={recentMissions}
          seeAllHref={`/missions?teamId=${team.id}`}
        />
      </DrawerBody>
    </div>
  );
}
