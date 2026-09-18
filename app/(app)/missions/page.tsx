import { Suspense } from "react";
import { MissionsPageClient } from "@/components/missions/missions-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import {
  hasMissionsCategoryIdsParam,
  MISSION_OPEN_KANBAN_STATUSES,
  MISSIONS_PAGE_SIZE,
  parseMissionsListSearchParams,
  shouldDeferClosedKanbanColumns,
  type MissionsListFilters,
} from "@/lib/missions/list-filters";
import { listMissionsPage } from "@/lib/missions/queries";
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
  const deferClosedColumns = shouldDeferClosedKanbanColumns(filters);

  const [currentCollaborator, preferredCategoryIds] = await Promise.all([
    getCurrentCollaborator(),
    needsPreferred
      ? getPreferredMissionCategoryIds()
      : Promise.resolve([] as string[]),
  ]);

  if (needsPreferred && preferredCategoryIds.length > 0) {
    filters = { ...filters, categoryIds: preferredCategoryIds };
  }

  const queryFilters: MissionsListFilters = deferClosedColumns
    ? { ...filters, statuses: [...MISSION_OPEN_KANBAN_STATUSES] }
    : filters;

  let { missions, totalCount } = await listMissionsPage(queryFilters);

  if (filters.view !== "kanban") {
    const totalPages = Math.max(1, Math.ceil(totalCount / MISSIONS_PAGE_SIZE));
    if (filters.page > totalPages) {
      const corrected: MissionsListFilters = { ...filters, page: totalPages };
      filters = corrected;
      ({ missions, totalCount } = await listMissionsPage(corrected));
    }
  }

  return (
    <MissionsPageClient
      missions={missions}
      totalCount={totalCount}
      filters={filters}
      currentCollaboratorId={currentCollaborator?.id ?? ""}
      deferClosedColumns={deferClosedColumns}
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
