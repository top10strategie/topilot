import { Suspense } from "react";
import { MissionsPageClient } from "@/components/missions/missions-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  listMissionOpportunityOptions,
  listMissions,
} from "@/lib/missions/queries";

async function MissionsContent() {
  const [
    missions,
    collaborators,
    clients,
    categories,
    opportunityOptions,
    currentCollaborator,
  ] = await Promise.all([
    listMissions(),
    listCollaborators(),
    listClients(),
    listCategories(),
    listMissionOpportunityOptions(),
    getCurrentCollaborator(),
  ]);

  return (
    <MissionsPageClient
      missions={missions}
      collaborators={collaborators}
      clients={clients}
      categories={categories}
      opportunityOptions={opportunityOptions}
      currentCollaboratorId={currentCollaborator?.id ?? ""}
    />
  );
}

function MissionsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Missions" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MissionsPage() {
  return (
    <Suspense fallback={<MissionsFallback />}>
      <MissionsContent />
    </Suspense>
  );
}
