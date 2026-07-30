import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MissionDetailPageClient } from "@/components/missions/mission-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { getClientById, listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  getMissionById,
  listMissionOpportunityOptions,
} from "@/lib/missions/queries";

type MissionDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function MissionDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    mission,
    collaborators,
    clients,
    categories,
    opportunityOptions,
    currentCollaborator,
  ] = await Promise.all([
    getMissionById(id),
    listCollaborators(),
    listClients(),
    listCategories(),
    listMissionOpportunityOptions(),
    getCurrentCollaborator(),
  ]);

  if (!mission) {
    notFound();
  }

  const linkedClient = mission.client_id
    ? await getClientById(mission.client_id)
    : null;

  return (
    <MissionDetailPageClient
      mission={mission}
      collaborators={collaborators}
      clients={clients}
      categories={categories}
      opportunityOptions={opportunityOptions}
      currentCollaboratorId={currentCollaborator?.id ?? ""}
      linkedClient={linkedClient}
    />
  );
}

function MissionDetailFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Fiche mission" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function MissionDetailPage({ params }: MissionDetailPageProps) {
  return (
    <Suspense fallback={<MissionDetailFallback />}>
      <MissionDetailContent params={params} />
    </Suspense>
  );
}
