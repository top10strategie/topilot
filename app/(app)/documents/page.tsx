import { Suspense } from "react";
import { DocumentsPageClient } from "@/components/documents/documents-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocumentTypes } from "@/lib/categories/queries";
import { listClients } from "@/lib/clients/queries";
import { listDocuments } from "@/lib/documents/queries";

async function DocumentsContent() {
  const [documents, documentTypes, clients] = await Promise.all([
    listDocuments(),
    listDocumentTypes(),
    listClients(),
  ]);

  return (
    <DocumentsPageClient
      documents={documents}
      documentTypes={documentTypes}
      clients={clients}
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

export default function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsFallback />}>
      <DocumentsContent />
    </Suspense>
  );
}
