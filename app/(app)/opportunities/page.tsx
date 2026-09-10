import { Suspense } from "react";
import { OpportunitiesPageClient } from "@/components/opportunities/opportunities-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinessCategories } from "@/lib/categories/queries";
import { listClientOptions } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  OPPORTUNITIES_PAGE_SIZE,
  parseOpportunitiesListSearchParams,
} from "@/lib/opportunities/list-filters";
import {
  listOpportunitiesPage,
  listOpportunityContactOptions,
} from "@/lib/opportunities/queries";

async function OpportunitiesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters = parseOpportunitiesListSearchParams(params ?? {});

  const [collaborators, clients, contacts, categories] = await Promise.all([
    listCollaborators(),
    listClientOptions(),
    listOpportunityContactOptions(),
    listBusinessCategories(),
  ]);

  let { opportunities, totalCount } = await listOpportunitiesPage(filters);

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
      collaborators={collaborators}
      clients={clients}
      contacts={contacts}
      categories={categories}
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
