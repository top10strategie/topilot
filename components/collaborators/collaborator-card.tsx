"use client";

import { Star } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  getCollaboratorFullName,
  getCollaboratorRoleLabel,
} from "@/lib/collaborators/labels";
import type { CollaboratorListItem } from "@/lib/collaborators/types";

type CollaboratorAvatarProps = {
  collaborator: Pick<
    CollaboratorListItem,
    "first_name" | "last_name" | "profile_picture_url"
  >;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASS = {
  sm: "!size-8",
  default: "!size-14",
  lg: "!size-12",
  xl: "!size-24",
} as const;

export function CollaboratorAvatar({
  collaborator,
  size = "default",
  className,
}: CollaboratorAvatarProps) {
  const initials =
    `${collaborator.first_name.charAt(0)}${collaborator.last_name.charAt(0)}`.toUpperCase();

  return (
    <Avatar className={cn(SIZE_CLASS[size], className)}>
      {collaborator.profile_picture_url ? (
        <AvatarImage
          src={collaborator.profile_picture_url}
          alt={getCollaboratorFullName(collaborator)}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

type CollaboratorCardProps = {
  collaborator: CollaboratorListItem;
  /** Variante compacte (dans une carte pôle) vs complète (onglet Collaborateurs). */
  variant?: "compact" | "full";
  onClick?: () => void;
  className?: string;
};

/**
 * Carte collaborateur avec avatar — clic ouvre le tiroir de consultation.
 * Badge Manager / Direction = icône `star` en haut à droite (spec §11.1).
 */
export function CollaboratorCard({
  collaborator,
  variant = "full",
  onClick,
  className,
}: CollaboratorCardProps) {
  const fullName = getCollaboratorFullName(collaborator);
  const showLeadershipStar =
    collaborator.role === "manager" || collaborator.role === "direction";
  const starLabel = getCollaboratorRoleLabel(collaborator.role);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-lg border bg-card text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "compact" ? "p-2" : "p-3",
        showLeadershipStar && "pr-8",
        className,
      )}
    >
      {showLeadershipStar ? (
        <span
          className="absolute top-1.5 right-1.5 inline-flex"
          title={starLabel}
          aria-label={starLabel}
        >
          <Star className="size-3.5 text-primary" weight="fill" aria-hidden />
        </span>
      ) : null}
      <CollaboratorAvatar
        collaborator={collaborator}
        size="default"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium leading-none">{fullName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {collaborator.job_title}
        </p>
        {variant === "full" ? (
          <>
            <p className="truncate text-xs text-muted-foreground">
              Pôle : {collaborator.team_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Rôle : {getCollaboratorRoleLabel(collaborator.role)}
            </p>
          </>
        ) : null}
      </div>
    </button>
  );
}
