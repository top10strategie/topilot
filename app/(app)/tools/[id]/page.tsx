import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/layout/page-hero";
import { ToolDetailPageClient } from "@/components/tools/tool-detail-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { listCategories } from "@/lib/categories/queries";
import { listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";
import { getToolById } from "@/lib/tools/queries";

type ToolDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function ToolDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tool, categories, clients, collaborators, collaborator] =
    await Promise.all([
      getToolById(id),
      listCategories(),
      listClients(),
      listCollaborators(),
      getCurrentCollaborator(),
    ]);

  if (!tool) {
    notFound();
  }

  const canManagePrivacy = collaborator
    ? isManagerOrDirection(collaborator.role)
    : false;

  return (
    <ToolDetailPageClient
      tool={tool}
      categories={categories}
      clients={clients.map((c) => ({
        id: c.id,
        client_name: c.client_name,
      }))}
      collaborators={collaborators}
      canManagePrivacy={canManagePrivacy}
      canViewHistory={canManagePrivacy}
    />
  );
}

function ToolDetailFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Fiche outil" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export default function ToolDetailPage({ params }: ToolDetailPageProps) {
  return (
    <Suspense fallback={<ToolDetailFallback />}>
      <ToolDetailContent params={params} />
    </Suspense>
  );
}
