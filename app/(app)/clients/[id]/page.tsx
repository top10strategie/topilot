import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ClientDetailPageClient } from "@/components/clients/client-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { listBusinessCategories } from "@/lib/categories/queries";
import { getClientById, listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  listMissionOpportunityOptions,
  listMissionsByClientId,
} from "@/lib/missions/queries";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function ClientDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    client,
    collaborators,
    categories,
    clients,
    missions,
    opportunityOptions,
    currentCollaborator,
  ] = await Promise.all([
    getClientById(id),
    listCollaborators(),
    listBusinessCategories(),
    listClients(),
    listMissionsByClientId(id),
    listMissionOpportunityOptions(),
    getCurrentCollaborator(),
  ]);

  if (!client) {
    redirect("/clients");
  }

  return (
    <ClientDetailPageClient
      client={client}
      collaborators={collaborators}
      categories={categories}
      clients={clients}
      missions={missions}
      opportunityOptions={opportunityOptions}
      currentCollaboratorId={currentCollaborator?.id ?? ""}
      canManagePrivacy={
        currentCollaborator
          ? isManagerOrDirection(currentCollaborator.role)
          : false
      }
      canViewHistory={
        currentCollaborator
          ? isManagerOrDirection(currentCollaborator.role)
          : false
      }
    />
  );
}

function ClientDetailFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Fiche client" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  return (
    <Suspense fallback={<ClientDetailFallback />}>
      <ClientDetailContent params={params} />
    </Suspense>
  );
}
