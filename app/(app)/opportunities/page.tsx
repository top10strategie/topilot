import { Suspense } from "react";
import { OpportunitiesPageClient } from "@/components/opportunities/opportunities-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  listOpportunities,
  listOpportunityContactOptions,
} from "@/lib/opportunities/queries";

async function OpportunitiesContent() {
  const [opportunities, collaborators, clients, contacts, categories] =
    await Promise.all([
      listOpportunities(),
      listCollaborators(),
      listClients(),
      listOpportunityContactOptions(),
      listCategories(),
    ]);

  return (
    <OpportunitiesPageClient
      opportunities={opportunities}
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

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<OpportunitiesFallback />}>
      <OpportunitiesContent />
    </Suspense>
  );
}
