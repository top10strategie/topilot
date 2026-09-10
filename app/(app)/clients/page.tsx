import { Suspense } from "react";
import { ClientsPageClient } from "@/components/clients/clients-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listBusinessCategories } from "@/lib/categories/queries";
import { parseClientsListSearchParams, CLIENTS_PAGE_SIZE } from "@/lib/clients/list-filters";
import { listClientCities, listClientsPage } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";

async function ClientsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters = parseClientsListSearchParams(params ?? {});

  let [{ clients, totalCount }, collaborators, categories, cities] =
    await Promise.all([
      listClientsPage(filters),
      listCollaborators({ includeAvatar: false }),
      listBusinessCategories(),
      listClientCities(),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE));
  if (filters.page > totalPages) {
    filters = { ...filters, page: totalPages };
    ({ clients, totalCount } = await listClientsPage(filters));
  }

  return (
    <ClientsPageClient
      clients={clients}
      totalCount={totalCount}
      filters={filters}
      cities={cities}
      collaborators={collaborators}
      categories={categories}
    />
  );
}

function ClientsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Clients" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ClientsFallback />}>
      <ClientsContent searchParams={searchParams} />
    </Suspense>
  );
}
