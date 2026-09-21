import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/home/home-page-client";
import { HomeWidgetSlot } from "@/components/home/home-widget-slot";
import { PageHero } from "@/components/layout/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isCollaboratorHomeWidgetId,
  isHomeWidgetId,
  type HomeWidgetId,
} from "@/lib/analyses/types";
import { getOwnProfile } from "@/lib/settings/queries";

const OPPORTUNITY_ANALYSIS_WIDGETS = [
  "kpi_opportunities",
  "opp_by_status",
  "opp_ca_by_client",
  "opp_pipeline",
  "opp_by_team",
] as const;

const MISSION_ANALYSIS_WIDGETS = ["kpi_missions", "mission_by_status"] as const;

const SUBSCRIPTION_ANALYSIS_WIDGETS = [
  "tools_monthly_spend",
  "tools_category_year",
] as const;

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

function analysesScopeKey(widgets: HomeWidgetId[]): string {
  const needOpportunities = widgets.some((id) =>
    (OPPORTUNITY_ANALYSIS_WIDGETS as readonly string[]).includes(id),
  );
  const needMissions = widgets.some((id) =>
    (MISSION_ANALYSIS_WIDGETS as readonly string[]).includes(id),
  );
  const needSubscriptions = widgets.some((id) =>
    (SUBSCRIPTION_ANALYSIS_WIDGETS as readonly string[]).includes(id),
  );
  return `${needOpportunities ? "1" : "0"}${needMissions ? "1" : "0"}${needSubscriptions ? "1" : "0"}`;
}

function HomeWidgetFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}

async function HomeContent() {
  const profile = await getOwnProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  const widgets = resolveHomeWidgets(profile.home_widgets, profile.role);
  const scopeKey = analysesScopeKey(widgets);

  return (
    <HomePageClient initialWidgets={widgets} role={profile.role}>
      {widgets.map((id) => (
        <Suspense key={id} fallback={<HomeWidgetFallback />}>
          <HomeWidgetSlot
            widgetId={id}
            collaboratorId={profile.id}
            role={profile.role}
            analysesScopeKey={scopeKey}
          />
        </Suspense>
      ))}
    </HomePageClient>
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
