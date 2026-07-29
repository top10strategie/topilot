"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  sm: "size-8",
  default: "size-10",
  lg: "size-12",
  xl: "size-20",
} as const;

export function CollaboratorAvatar({
  collaborator,
  size = "default",
  className,
}: CollaboratorAvatarProps) {
  const initials =
    `${collaborator.first_name.charAt(0)}${collaborator.last_name.charAt(0)}`.toUpperCase();

  return (
    <Avatar
      className={cn(SIZE_CLASS[size], className)}
      size={size === "xl" || size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
    >
      {collaborator.profile_picture_url ? (
        <AvatarImage
          src={collaborator.profile_picture_url}
          alt={getCollaboratorFullName(collaborator)}
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
 */
export function CollaboratorCard({
  collaborator,
  variant = "full",
  onClick,
  className,
}: CollaboratorCardProps) {
  const fullName = getCollaboratorFullName(collaborator);
  const showManagerBadge = collaborator.role === "manager";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <CollaboratorAvatar
        collaborator={collaborator}
        size={variant === "compact" ? "sm" : "default"}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium leading-none">{fullName}</p>
          {showManagerBadge ? (
            <Badge variant="secondary" className="shrink-0">
              Manager
            </Badge>
          ) : null}
        </div>
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
