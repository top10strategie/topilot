import { Suspense } from "react";
import { DocumentsPageClient } from "@/components/documents/documents-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { listDocumentTypes } from "@/lib/categories/queries";
import { listClientOptions } from "@/lib/clients/queries";
import {
  DOCUMENTS_PAGE_SIZE,
  parseDocumentsListSearchParams,
} from "@/lib/documents/list-filters";
import {
  listDistinctDocumentVersions,
  listDocumentsPage,
} from "@/lib/documents/queries";

async function DocumentsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters = parseDocumentsListSearchParams(params ?? {});

  const [
    pageResult,
    documentTypes,
    clients,
    availableVersions,
    collaborator,
  ] = await Promise.all([
    listDocumentsPage(filters),
    listDocumentTypes(),
    listClientOptions(),
    listDistinctDocumentVersions(),
    getCurrentCollaborator(),
  ]);

  let { documents, totalCount } = pageResult;

  const totalPages = Math.max(1, Math.ceil(totalCount / DOCUMENTS_PAGE_SIZE));
  if (filters.page > totalPages) {
    filters = { ...filters, page: totalPages };
    ({ documents, totalCount } = await listDocumentsPage(filters));
  }

  return (
    <DocumentsPageClient
      documents={documents}
      totalCount={totalCount}
      filters={filters}
      availableVersions={availableVersions}
      documentTypes={documentTypes}
      clients={clients}
      canViewHistory={
        collaborator ? isManagerOrDirection(collaborator.role) : false
      }
    />
  );
}

function DocumentsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Documents" />
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

export default function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<DocumentsFallback />}>
      <DocumentsContent searchParams={searchParams} />
    </Suspense>
  );
}
