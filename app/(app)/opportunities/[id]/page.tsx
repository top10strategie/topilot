import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OpportunityDetailPageClient } from "@/components/opportunities/opportunity-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { getOpportunityById } from "@/lib/opportunities/queries";

type OpportunityDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function OpportunityDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opportunity, currentCollaborator] = await Promise.all([
    getOpportunityById(id),
    getCurrentCollaborator(),
  ]);

  if (!opportunity) {
    redirect("/opportunities");
  }

  return (
    <OpportunityDetailPageClient
      opportunity={opportunity}
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
