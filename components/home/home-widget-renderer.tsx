"use client";

import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { MissionsKanban } from "@/components/missions/missions-kanban";
import { OpportunitiesKanban } from "@/components/opportunities/opportunities-kanban";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysesPayload, HomeWidgetId } from "@/lib/analyses/types";
import { HOME_WIDGET_LABELS } from "@/lib/analyses/types";
import { formatOpportunityPrice } from "@/lib/opportunities/labels";
import type { OpportunityListItem } from "@/lib/opportunities/types";
import type { MissionListItem } from "@/lib/missions/types";
import { formatCentsWithCurrency } from "@/lib/tools/pricing";

type HomeWidgetRendererProps = {
  widgetId: HomeWidgetId;
  analyses: AnalysesPayload;
  opportunities: OpportunityListItem[];
  missions: MissionListItem[];
};

function WidgetShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function HomeWidgetRenderer({
  widgetId,
  analyses,
  opportunities,
  missions,
}: HomeWidgetRendererProps) {
  const title = HOME_WIDGET_LABELS[widgetId];

  switch (widgetId) {
    case "kanban_opportunities":
      return (
        <WidgetShell title={title}>
          <Card>
            <CardContent className="pt-4">
              <OpportunitiesKanban items={opportunities} />
            </CardContent>
          </Card>
        </WidgetShell>
      );
    case "kanban_missions":
      return (
        <WidgetShell title={title}>
          <Card>
            <CardContent className="pt-4">
              <MissionsKanban items={missions} />
            </CardContent>
          </Card>
        </WidgetShell>
      );
    case "kpi_opportunities":
      return (
        <WidgetShell title={title}>
          <AnalysisKpiGrid
            items={[
              {
                label: "Nombre d'opportunités",
                value: String(analyses.opportunities.kpis.count),
              },
              {
                label: "Total des sommes engagées",
                value: formatOpportunityPrice(
                  analyses.opportunities.kpis.sumPrice,
                ),
              },
              {
                label: "Total des sommes pondérées",
                value: formatOpportunityPrice(
                  analyses.opportunities.kpis.sumAveragePrice,
                ),
              },
              {
                label: "Taux de conversion",
                value: `${Math.round(analyses.opportunities.kpis.conversionRate * 100)} %`,
              },
            ]}
          />
        </WidgetShell>
      );
    case "kpi_missions":
      return (
        <WidgetShell title={title}>
          <AnalysisKpiGrid
            items={[
              {
                label: "Nombre de missions",
                value: String(analyses.missions.kpis.count),
              },
              {
                label: "Missions en production",
                value: String(analyses.missions.kpis.inProduction),
              },
              {
                label: "Missions abandonnées",
                value: String(analyses.missions.kpis.abandoned),
              },
              {
                label: "Missions complétées",
                value: String(analyses.missions.kpis.completed),
              },
            ]}
          />
        </WidgetShell>
      );
    case "opp_by_status":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.opportunities.byStatus}
          layout="horizontal"
        />
      );
    case "opp_by_category":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.opportunities.byCategory}
          layout="horizontal"
        />
      );
    case "mission_by_status":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.missions.byStatus}
          layout="horizontal"
        />
      );
    case "mission_by_category":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.missions.byCategory}
          layout="horizontal"
        />
      );
    case "tools_monthly_spend": {
      const items =
        analyses.subscriptions.monthlyByCurrency.length === 0
          ? [{ label: "Dépenses du mois", value: "—" }]
          : analyses.subscriptions.monthlyByCurrency.map((row) => ({
              label: `Dépenses du mois (${row.currency})`,
              value: formatCentsWithCurrency(row.amountCents, row.currency),
            }));
      return (
        <WidgetShell title={title}>
          <AnalysisKpiGrid items={items} />
        </WidgetShell>
      );
    }
    case "opp_pipeline":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.opportunities.pipeline}
          layout="vertical"
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
      );
    case "opp_by_team":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.opportunities.byTeam}
          layout="horizontal"
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
      );
    case "mission_pipeline":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.missions.pipeline}
          layout="vertical"
        />
      );
    case "tools_category_year":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.subscriptions.costByCategoryYear}
          layout="vertical"
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
      );
    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Widget inconnu.</p>
          </CardContent>
        </Card>
      );
  }
}
