"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CollaboratorCard } from "@/components/collaborators/collaborator-card";
import { cn } from "@/lib/utils";
import type { TeamListItem } from "@/lib/collaborators/types";

type TeamCardProps = {
  team: TeamListItem;
  onOpenTeam: () => void;
  onOpenCollaborator: (collaboratorId: string) => void;
  className?: string;
};

/**
 * Carte pôle : titre + membres. Clic carte → tiroir pôle ;
 * clic membre → tiroir collaborateur (stopPropagation).
 */
export function TeamCard({
  team,
  onOpenTeam,
  onOpenCollaborator,
  className,
}: TeamCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpenTeam}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenTeam();
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <CardHeader className="p-3 pb-1.5">
        <CardTitle className="text-base">{team.team_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {team.members.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun collaborateur</p>
        ) : (
          team.members.map((member) => (
            <CollaboratorCard
              key={member.id}
              collaborator={member}
              variant="compact"
              onClick={() => onOpenCollaborator(member.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
