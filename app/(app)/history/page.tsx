import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HistoryPageClient } from "@/components/audit/history-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { HISTORY_PAGE_SIZE } from "@/lib/audit/list-filters";
import { listAuditContactOptions, listAuditLogsForPage } from "@/lib/audit/queries";
import { listBusinessCategories } from "@/lib/categories/queries";
import { listClientOptions } from "@/lib/clients/queries";
import { listToolLinkOptions } from "@/lib/tools/queries";

async function HistoryContent() {
  const collaborator = await getCurrentCollaborator();
  if (!collaborator || !isManagerOrDirection(collaborator.role)) {
    redirect("/");
  }

  let page = 1;
  const [pageResult, clients, contacts, categories, tools] = await Promise.all([
    listAuditLogsForPage({ page }),
    listClientOptions(),
    listAuditContactOptions(),
    listBusinessCategories(),
    listToolLinkOptions(),
  ]);
  let { logs, totalCount } = pageResult;

  const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));
  if (page > totalPages) {
    page = totalPages;
    ({ logs, totalCount } = await listAuditLogsForPage({ page }));
  }

  return (
    <HistoryPageClient
      initialLogs={logs}
      initialTotalCount={totalCount}
      initialPage={page}
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
