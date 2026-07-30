import { Suspense } from "react";
import { ClientsPageClient } from "@/components/clients/clients-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories } from "@/lib/categories/queries";
import { listClients } from "@/lib/clients/queries";
import { listCollaborators } from "@/lib/collaborators/queries";

async function ClientsContent() {
  const [clients, collaborators, categories] = await Promise.all([
    listClients(),
    listCollaborators(),
    listCategories(),
  ]);

  return (
    <ClientsPageClient
      clients={clients}
      collaborators={collaborators}
      categories={categories}
    />
  );
}

function ClientsFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Clients" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsFallback />}>
      <ClientsContent />
    </Suspense>
  );
}
