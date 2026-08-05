import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HistoryPageClient } from "@/components/audit/history-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { listAuditContactOptions, listAuditLogsForPage } from "@/lib/audit/queries";
import { listCategories } from "@/lib/categories/queries";
import { listClients } from "@/lib/clients/queries";
import { listToolLinkOptions } from "@/lib/tools/queries";

async function HistoryContent() {
  const collaborator = await getCurrentCollaborator();
  if (!collaborator || !isManagerOrDirection(collaborator.role)) {
    redirect("/");
  }

  const [logs, clients, contacts, categories, tools] = await Promise.all([
    listAuditLogsForPage(),
    listClients(),
    listAuditContactOptions(),
    listCategories(),
    listToolLinkOptions(),
  ]);

  return (
    <HistoryPageClient
      initialLogs={logs}
      clients={clients}
      contacts={contacts}
      categories={categories}
      tools={tools}
    />
  );
}

function HistoryFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Historique du CRM" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryFallback />}>
      <HistoryContent />
    </Suspense>
  );
}
