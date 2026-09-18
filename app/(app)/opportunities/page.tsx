import { Suspense } from "react";
import { OpportunitiesPageClient } from "@/components/opportunities/opportunities-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OPPORTUNITY_OPEN_KANBAN_STATUSES,
  OPPORTUNITIES_PAGE_SIZE,
  parseOpportunitiesListSearchParams,
  shouldDeferClosedKanbanColumns,
  type OpportunitiesListFilters,
} from "@/lib/opportunities/list-filters";
import { listOpportunitiesPage } from "@/lib/opportunities/queries";

async function OpportunitiesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters = parseOpportunitiesListSearchParams(params ?? {});
  const deferClosedColumns = shouldDeferClosedKanbanColumns(filters);

  const queryFilters: OpportunitiesListFilters = deferClosedColumns
    ? { ...filters, statuses: [...OPPORTUNITY_OPEN_KANBAN_STATUSES] }
    : filters;

  let { opportunities, totalCount } = await listOpportunitiesPage(queryFilters);

  if (filters.view !== "kanban") {
    const totalPages = Math.max(
      1,
      Math.ceil(totalCount / OPPORTUNITIES_PAGE_SIZE),
    );
    if (filters.page > totalPages) {
      filters = { ...filters, page: totalPages };
      ({ opportunities, totalCount } = await listOpportunitiesPage(filters));
    }
  }

  return (
    <OpportunitiesPageClient
      opportunities={opportunities}
      totalCount={totalCount}
      filters={filters}
      deferClosedColumns={deferClosedColumns}
    />
  );
}

function OpportunitiesFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Opportunités" />
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

export default function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<OpportunitiesFallback />}>
      <OpportunitiesContent searchParams={searchParams} />
    </Suspense>
  );
}
