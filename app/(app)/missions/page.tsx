import { Suspense } from "react";
import { MissionsPageClient } from "@/components/missions/missions-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinessCategories } from "@/lib/categories/queries";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { listClientOptions } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  hasMissionsCategoryIdsParam,
  MISSIONS_PAGE_SIZE,
  parseMissionsListSearchParams,
  type MissionsListFilters,
} from "@/lib/missions/list-filters";
import {
  listMissionOpportunityOptions,
  listMissionsPage,
} from "@/lib/missions/queries";
import { getPreferredMissionCategoryIds } from "@/lib/settings/queries";

async function MissionsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters = parseMissionsListSearchParams(params ?? {});
  const fromTop10 = Boolean(filters.teamId || filters.responsibleId);
  const categoryIdsInUrl = hasMissionsCategoryIdsParam(params ?? {});
  const needsPreferred =
    !categoryIdsInUrl && !fromTop10 && !filters.skipPreferredCategories;

  let collaborators;
  let clients;
  let categories;
  let opportunityOptions;
  let currentCollaborator;
  let pageResult: Awaited<ReturnType<typeof listMissionsPage>>;

  if (needsPreferred) {
    const [
      collabs,
      clientOpts,
      cats,
      opps,
      current,
      storedPreferredCategoryIds,
    ] = await Promise.all([
      listCollaborators({ includeAvatar: false }),
      listClientOptions(),
      listBusinessCategories(),
      listMissionOpportunityOptions(),
      getCurrentCollaborator(),
      getPreferredMissionCategoryIds(),
    ]);
    collaborators = collabs;
    clients = clientOpts;
    categories = cats;
    opportunityOptions = opps;
    currentCollaborator = current;

    const categoryIdSet = new Set(categories.map((category) => category.id));
    const preferredCategoryIds = storedPreferredCategoryIds.filter((id) =>
      categoryIdSet.has(id),
    );
    if (preferredCategoryIds.length > 0) {
      filters = { ...filters, categoryIds: preferredCategoryIds };
    }
    pageResult = await listMissionsPage(filters);
  } else {
    const [collabs, clientOpts, cats, opps, current, page] = await Promise.all([
      listCollaborators({ includeAvatar: false }),
      listClientOptions(),
      listBusinessCategories(),
      listMissionOpportunityOptions(),
      getCurrentCollaborator(),
      listMissionsPage(filters),
    ]);
    collaborators = collabs;
    clients = clientOpts;
    categories = cats;
    opportunityOptions = opps;
    currentCollaborator = current;
    pageResult = page;
  }

  let { missions, totalCount } = pageResult;

  if (filters.view !== "kanban") {
    const totalPages = Math.max(1, Math.ceil(totalCount / MISSIONS_PAGE_SIZE));
    if (filters.page > totalPages) {
      const corrected: MissionsListFilters = { ...filters, page: totalPages };
      filters = corrected;
      ({ missions, totalCount } = await listMissionsPage(filters));
    }
  }

  return (
    <MissionsPageClient
      missions={missions}
      totalCount={totalCount}
      filters={filters}
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

export default function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<MissionsFallback />}>
      <MissionsContent searchParams={searchParams} />
    </Suspense>
  );
}
