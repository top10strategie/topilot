import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/home/home-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAnalysesPayload } from "@/lib/analyses/queries";
import { listMissions } from "@/lib/missions/queries";
import { listOpportunities } from "@/lib/opportunities/queries";
import { getOwnProfile } from "@/lib/settings/queries";

async function HomeContent() {
  const [profile, analyses, opportunities, missions] = await Promise.all([
    getOwnProfile(),
    loadAnalysesPayload(),
    listOpportunities(),
    listMissions(),
  ]);

  if (!profile) {
    redirect("/auth/login");
  }

  return (
    <HomePageClient
      analyses={analyses}
      opportunities={opportunities}
      missions={missions}
      initialWidgets={profile.home_widgets}
    />
  );
}

function HomeFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Home" />
      <div className="space-y-4 px-4 py-4 md:px-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
