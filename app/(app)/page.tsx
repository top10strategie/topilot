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
import { listHomeMissionsBoard } from "@/lib/missions/queries";
import { listHomeOpportunitiesBoard } from "@/lib/opportunities/queries";
import { getOwnProfile } from "@/lib/settings/queries";

function resolveHomeWidgets(
  widgets: string[],
  role: string,
): HomeWidgetId[] {
  const normalized = widgets.map((id) => {
    if (id === "opp_by_category" || id === "opp_ca_by_category") {
      return "opp_ca_by_client";
    }
    return id;
  });
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
  const needOppAnalyses = widgets.some((id) =>
    (
      [
        "kpi_opportunities",
        "opp_by_status",
        "opp_ca_by_client",
        "opp_pipeline",
        "opp_by_team",
      ] as const
    ).includes(id as never),
  );
  const needMissionAnalyses = widgets.some((id) =>
    (["kpi_missions", "mission_by_status"] as const).includes(id as never),
  );
  const needSubsAnalyses = widgets.some((id) =>
    (["tools_monthly_spend", "tools_category_year"] as const).includes(
      id as never,
    ),
  );
  const needAnalyses =
    needOppAnalyses || needMissionAnalyses || needSubsAnalyses;

  const [analyses, opportunities, missions] = await Promise.all([
    needAnalyses
      ? loadAnalysesPayload({
          opportunities: needOppAnalyses,
          missions: needMissionAnalyses,
          subscriptions: needSubsAnalyses,
        })
      : Promise.resolve(emptyAnalysesPayload()),
    needOpportunities
      ? listHomeOpportunitiesBoard(profile.id)
      : Promise.resolve([]),
    needMissions ? listHomeMissionsBoard(profile.id) : Promise.resolve([]),
  ]);

  return (
    <HomePageClient
      analyses={analyses}
      opportunities={opportunities}
      missions={missions}
      initialWidgets={widgets}
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
