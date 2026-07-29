import type { CollaboratorRole } from "@/lib/collaborators/types";

export function isManagerOrDirection(role: string): boolean {
  return role === "manager" || role === "direction";
}

export function canManageCollaboratorsAndTeams(role: string): boolean {
  return isManagerOrDirection(role);
}

export function isCollaboratorRole(value: string): value is CollaboratorRole {
  return (
    value === "direction" || value === "manager" || value === "collaborator"
  );
}
