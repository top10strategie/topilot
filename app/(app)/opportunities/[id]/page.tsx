import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OpportunityDetailPageClient } from "@/components/opportunities/opportunity-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { getClientById, listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  getOpportunityById,
  listOpportunityContactOptions,
} from "@/lib/opportunities/queries";

type OpportunityDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function OpportunityDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opportunity, collaborators, clients, contacts, categories] =
    await Promise.all([
      getOpportunityById(id),
      listCollaborators(),
      listClients(),
      listOpportunityContactOptions(),
      listCategories(),
    ]);

  if (!opportunity) {
    notFound();
  }

  const linkedClient = await getClientById(opportunity.client_id);

  return (
    <OpportunityDetailPageClient
      opportunity={opportunity}
      collaborators={collaborators}
      clients={clients}
      linkedClient={linkedClient}
      contacts={contacts}
      categories={categories}
    />
  );
}

function OpportunityDetailFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Fiche opportunité" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function OpportunityDetailPage({
  params,
}: OpportunityDetailPageProps) {
  return (
    <Suspense fallback={<OpportunityDetailFallback />}>
      <OpportunityDetailContent params={params} />
    </Suspense>
  );
}
