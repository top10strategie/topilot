import { Suspense } from "react";
import { MissionsPageClient } from "@/components/missions/missions-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinessCategories } from "@/lib/categories/queries";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  listMissionOpportunityOptions,
  listMissions,
} from "@/lib/missions/queries";
import { getPreferredMissionCategoryIds } from "@/lib/settings/queries";

async function MissionsContent({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string; responsibleId?: string }>;
}) {
  const params = await searchParams;
  const initialTeamId = params.teamId?.trim() || "";
  const initialResponsibleId = params.responsibleId?.trim() || "";
  const fromTop10 = Boolean(initialTeamId || initialResponsibleId);

  const [
    missions,
    collaborators,
    clients,
    categories,
    opportunityOptions,
    currentCollaborator,
    storedPreferredCategoryIds,
  ] = await Promise.all([
    listMissions(),
    listCollaborators(),
    listClients(),
    listBusinessCategories(),
    listMissionOpportunityOptions(),
    getCurrentCollaborator(),
    getPreferredMissionCategoryIds(),
  ]);

  const categoryIdSet = new Set(categories.map((category) => category.id));
  const preferredCategoryIds = fromTop10
    ? []
    : storedPreferredCategoryIds.filter((id) => categoryIdSet.has(id));

  return (
    <MissionsPageClient
      key={[
        "missions",
        initialTeamId,
        initialResponsibleId,
        ...preferredCategoryIds,
      ].join(":")}
      missions={missions}
      collaborators={collaborators}
      clients={clients}
      categories={categories}
      opportunityOptions={opportunityOptions}
      currentCollaboratorId={currentCollaborator?.id ?? ""}
      initialTeamId={initialTeamId}
      initialResponsibleId={initialResponsibleId}
      initialCategoryIds={preferredCategoryIds}
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

export default function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string; responsibleId?: string }>;
}) {
  return (
    <Suspense fallback={<MissionsFallback />}>
      <MissionsContent searchParams={searchParams} />
    </Suspense>
  );
}
