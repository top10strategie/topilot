import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AnalysesPageClient } from "@/components/analyses/analyses-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { isManagerOrDirection } from "@/lib/auth/roles";
import { loadAnalysesPayload } from "@/lib/analyses/queries";

async function AnalysesContent() {
  const collaborator = await getCurrentCollaborator();
  if (!collaborator || !isManagerOrDirection(collaborator.role)) {
    redirect("/");
  }

  const data = await loadAnalysesPayload();
  return <AnalysesPageClient data={data} />;
}

function AnalysesFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Études et analyses" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export default function AnalysesPage() {
  return (
    <Suspense fallback={<AnalysesFallback />}>
      <AnalysesContent />
    </Suspense>
  );
}
