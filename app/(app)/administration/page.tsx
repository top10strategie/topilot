import { Suspense } from "react";
import { AdministrationPageClient } from "@/components/collaborators/administration-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { canManageCollaboratorsAndTeams } from "@/lib/auth/roles";
import { loadPeopleDirectory } from "@/lib/collaborators/queries";

async function AdministrationContent() {
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

function AdministrationFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Gestion Admin" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdministrationPage() {
  return (
    <Suspense fallback={<AdministrationFallback />}>
      <AdministrationContent />
    </Suspense>
  );
}
