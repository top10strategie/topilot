export type CurrentCollaborator = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export function getCollaboratorDisplayName(
  collaborator: CurrentCollaborator,
): string {
  return `${collaborator.first_name} ${collaborator.last_name}`.trim();
}

export function getCollaboratorInitials(
  collaborator: CurrentCollaborator,
): string {
  const first = collaborator.first_name.charAt(0);
  const last = collaborator.last_name.charAt(0);
  return `${first}${last}`.toUpperCase();
}
