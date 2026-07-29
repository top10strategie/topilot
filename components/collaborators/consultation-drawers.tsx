"use client";

import { Badge } from "@/components/ui/badge";
import {
  CollaboratorAvatar,
  CollaboratorCard,
} from "@/components/collaborators/collaborator-card";
import {
  getCollaboratorFullName,
  getCollaboratorRoleLabel,
} from "@/lib/collaborators/labels";
import type {
  CollaboratorListItem,
  TeamListItem,
} from "@/lib/collaborators/types";

type CollaboratorConsultationProps = {
  collaborator: CollaboratorListItem;
};

/**
 * Contenu du tiroir de consultation collaborateur (lecture seule).
 * Sections clients / missions masquées tant que le CRM / pipe n'est pas livré.
 */
export function CollaboratorConsultationContent({
  collaborator,
}: CollaboratorConsultationProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <CollaboratorAvatar collaborator={collaborator} size="xl" />
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
    </div>
  );
}

type TeamConsultationProps = {
  team: TeamListItem;
  onOpenCollaborator: (collaboratorId: string) => void;
};

/**
 * Contenu du tiroir de consultation pôle (lecture seule).
 * Notes en lecture seule pour l'instant ; missions / opportunités masquées.
 */
export function TeamConsultationContent({
  team,
  onOpenCollaborator,
}: TeamConsultationProps) {
  return (
    <div className="space-y-6">
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
        {team.notes ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {team.notes}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune note</p>
        )}
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
    </div>
  );
}
