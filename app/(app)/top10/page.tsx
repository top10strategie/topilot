import { Suspense } from "react";
import { Top10PageClient } from "@/components/collaborators/top10-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { listTop10ActiveMissions } from "@/lib/missions/queries";
import { loadPeopleDirectory } from "@/lib/collaborators/queries";

async function Top10Content() {
  const [{ teams, collaborators }, missions] = await Promise.all([
    loadPeopleDirectory(),
    listTop10ActiveMissions(),
  ]);

  return (
    <Top10PageClient
      teams={teams}
      collaborators={collaborators}
      missions={missions}
    />
  );
}

function Top10Fallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Top 10 Stratégie" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Top10Page() {
  return (
    <Suspense fallback={<Top10Fallback />}>
      <Top10Content />
    </Suspense>
  );
}
