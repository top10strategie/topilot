import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/home/home-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { emptyAnalysesPayload } from "@/lib/analyses/empty-payload";
import { loadAnalysesPayload } from "@/lib/analyses/queries";
import {
  isCollaboratorHomeWidgetId,
  isHomeWidgetId,
  type HomeWidgetId,
} from "@/lib/analyses/types";
import { listMissions } from "@/lib/missions/queries";
import { listOpportunities } from "@/lib/opportunities/queries";
import { getOwnProfile } from "@/lib/settings/queries";

function resolveHomeWidgets(
  widgets: string[],
  role: string,
): HomeWidgetId[] {
  const normalized = widgets.map((id) =>
    id === "opp_by_category" ? "opp_ca_by_category" : id,
  );
  if (role === "collaborator") {
    return normalized.filter(isCollaboratorHomeWidgetId);
  }
  return normalized.filter(isHomeWidgetId);
}

async function HomeContent() {
  const profile = await getOwnProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  const widgets = resolveHomeWidgets(profile.home_widgets, profile.role);
  const needOpportunities = widgets.includes("kanban_opportunities");
  const needMissions = widgets.includes("kanban_missions");
  const needAnalyses = widgets.some(
    (id) => id !== "kanban_opportunities" && id !== "kanban_missions",
  );

  const [analyses, opportunities, missions] = await Promise.all([
    needAnalyses ? loadAnalysesPayload() : Promise.resolve(emptyAnalysesPayload()),
    needOpportunities ? listOpportunities() : Promise.resolve([]),
    needMissions ? listMissions() : Promise.resolve([]),
  ]);

  return (
    <HomePageClient
      analyses={analyses}
      opportunities={opportunities}
      missions={missions}
      initialWidgets={profile.home_widgets}
      role={profile.role}
    />
  );
}

function HomeFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHero title="Accueil" />
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
