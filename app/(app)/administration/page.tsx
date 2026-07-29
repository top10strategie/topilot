import { AdministrationPageClient } from "@/components/collaborators/administration-page-client";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { canManageCollaboratorsAndTeams } from "@/lib/auth/roles";
import { loadPeopleDirectory } from "@/lib/collaborators/queries";

export default async function AdministrationPage() {
  const current = await getCurrentCollaborator();
  const canManagePeople = current
    ? canManageCollaboratorsAndTeams(current.role)
    : false;

  const { teams, collaborators } = canManagePeople
    ? await loadPeopleDirectory()
    : { teams: [], collaborators: [] };

  return (
    <AdministrationPageClient
      canManagePeople={canManagePeople}
      teams={teams}
      collaborators={collaborators}
    />
  );
}
