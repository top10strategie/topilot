import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ClientDetailPageClient } from "@/components/clients/client-detail-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { getClientById } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function ClientDetailContent({ id }: { id: string }) {
  const [client, collaborators, categories] = await Promise.all([
    getClientById(id),
    listCollaborators(),
    listCategories(),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <ClientDetailPageClient
      client={client}
      collaborators={collaborators}
      categories={categories}
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

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<ClientDetailFallback />}>
      <ClientDetailContent id={id} />
    </Suspense>
  );
}
