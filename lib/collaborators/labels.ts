import type { CollaboratorRole, CollaboratorStatus } from "./types";

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  direction: "Direction",
  manager: "Manager",
  collaborator: "Collaborateur",
};

const STATUS_LABELS: Record<CollaboratorStatus, string> = {
  actif: "Actif",
  inactif: "Inactif",
  sorti: "Sorti",
};

export function getCollaboratorRoleLabel(role: CollaboratorRole | string): string {
  if (role in ROLE_LABELS) {
    return ROLE_LABELS[role as CollaboratorRole];
  }
  return role;
}

export function getCollaboratorStatusLabel(
  status: CollaboratorStatus | string,
): string {
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as CollaboratorStatus];
  }
  return status;
}

export function getCollaboratorFullName(person: {
  first_name: string;
  last_name: string;
}): string {
  return `${person.first_name} ${person.last_name}`.trim();
}
