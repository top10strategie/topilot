import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OpportunityDetailPageClient } from "@/components/opportunities/opportunity-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { listCategories, listDocumentTypes } from "@/lib/categories/queries";
import { getClientById, listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  listDocumentLinkOptions,
  listDocumentsByOpportunityId,
} from "@/lib/documents/queries";
import { listMissionsByOpportunityId } from "@/lib/missions/queries";
import {
  getOpportunityById,
  listOpportunityContactOptions,
} from "@/lib/opportunities/queries";
import {
  listToolLinkOptions,
  listToolsByOpportunityId,
} from "@/lib/tools/queries";

type OpportunityDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function OpportunityDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    opportunity,
    collaborators,
    clients,
    contacts,
    categories,
    missions,
    currentCollaborator,
    linkedTools,
    toolLinkOptions,
    linkedDocuments,
    documentLinkOptions,
    documentTypes,
  ] = await Promise.all([
    getOpportunityById(id),
    listCollaborators(),
    listClients(),
    listOpportunityContactOptions(),
    listCategories(),
    listMissionsByOpportunityId(id),
    getCurrentCollaborator(),
    listToolsByOpportunityId(id),
    listToolLinkOptions(),
    listDocumentsByOpportunityId(id),
    listDocumentLinkOptions(),
    listDocumentTypes(),
  ]);

  if (!opportunity) {
    notFound();
  }

  const linkedClient = await getClientById(opportunity.client_id);

  const opportunityOptions = [
    {
      id: opportunity.id,
      opportunity_name: opportunity.opportunity_name,
      client_id: opportunity.client_id,
    },
  ];

  return (
    <OpportunityDetailPageClient
      opportunity={opportunity}
      collaborators={collaborators}
      clients={clients}
      linkedClient={linkedClient}
      contacts={contacts}
      categories={categories}
      missions={missions}
      opportunityOptions={opportunityOptions}
      currentCollaboratorId={currentCollaborator?.id ?? ""}
      linkedTools={linkedTools}
      toolLinkOptions={toolLinkOptions}
      linkedDocuments={linkedDocuments}
      documentLinkOptions={documentLinkOptions}
      documentTypes={documentTypes}
      canManagePrivacy={
        currentCollaborator
          ? isManagerOrDirection(currentCollaborator.role)
          : false
      }
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
