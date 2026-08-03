import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MissionDetailPageClient } from "@/components/missions/mission-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories, listDocumentTypes } from "@/lib/categories/queries";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { getClientById, listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import {
  listDocumentLinkOptions,
  listDocumentsByMissionId,
} from "@/lib/documents/queries";
import {
  getMissionById,
  listMissionOpportunityOptions,
} from "@/lib/missions/queries";
import {
  listToolLinkOptions,
  listToolsByMissionId,
} from "@/lib/tools/queries";
import {
  listWikiLinkOptions,
  listWikisByMissionId,
} from "@/lib/wiki/queries";

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
    linkedTools,
    toolLinkOptions,
    linkedDocuments,
    documentLinkOptions,
    documentTypes,
    linkedWikis,
    wikiLinkOptions,
  ] = await Promise.all([
    getMissionById(id),
    listCollaborators(),
    listClients(),
    listCategories(),
    listMissionOpportunityOptions(),
    getCurrentCollaborator(),
    listToolsByMissionId(id),
    listToolLinkOptions(),
    listDocumentsByMissionId(id),
    listDocumentLinkOptions(),
    listDocumentTypes(),
    listWikisByMissionId(id),
    listWikiLinkOptions(),
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
      linkedTools={linkedTools}
      toolLinkOptions={toolLinkOptions}
      linkedDocuments={linkedDocuments}
      documentLinkOptions={documentLinkOptions}
      documentTypes={documentTypes}
      linkedWikis={linkedWikis}
      wikiLinkOptions={wikiLinkOptions}
      canManagePrivacy={
        currentCollaborator
          ? isManagerOrDirection(currentCollaborator.role)
          : false
      }
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
