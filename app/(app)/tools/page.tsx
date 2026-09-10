import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { ToolsPageClient } from "@/components/tools/tools-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { listCategories } from "@/lib/categories/queries";
import { listClientOptions } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  TOOLS_PAGE_SIZE,
  parseToolsListSearchParams,
} from "@/lib/tools/list-filters";
import { listToolsPage } from "@/lib/tools/queries";

async function ToolsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters = parseToolsListSearchParams(params ?? {});

  const [
    pageResult,
    categories,
    clients,
    collaborators,
    collaborator,
  ] = await Promise.all([
    listToolsPage(filters),
    listCategories(),
    listClientOptions(),
    listCollaborators(),
    getCurrentCollaborator(),
  ]);

  let { tools, totalCount } = pageResult;

  const totalPages = Math.max(1, Math.ceil(totalCount / TOOLS_PAGE_SIZE));
  if (filters.page > totalPages) {
    filters = { ...filters, page: totalPages };
    ({ tools, totalCount } = await listToolsPage(filters));
  }

  const canManagePrivacy = collaborator
    ? isManagerOrDirection(collaborator.role)
    : false;

  return (
    <ToolsPageClient
      tools={tools}
      totalCount={totalCount}
      filters={filters}
      categories={categories}
      clients={clients}
      collaborators={collaborators}
      canManagePrivacy={canManagePrivacy}
    />
  );
}

function ToolsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Outils" />
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

export default function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ToolsFallback />}>
      <ToolsContent searchParams={searchParams} />
    </Suspense>
  );
}
