"use client";

import type { ReactNode } from "react";
import {
  AnalysisBarChart,
  AnalysisLineChart,
} from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { MissionsKanban } from "@/components/missions/missions-kanban";
import { OpportunitiesKanban } from "@/components/opportunities/opportunities-kanban";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysesPayload, HomeWidgetId } from "@/lib/analyses/types";
import {
  HOME_WIDGET_LABELS,
  isCollaboratorHomeWidgetId,
} from "@/lib/analyses/types";
import { formatOpportunityPrice } from "@/lib/opportunities/labels";
import type { OpportunityListItem } from "@/lib/opportunities/types";
import type { MissionListItem } from "@/lib/missions/types";
import { formatCentsWithCurrency } from "@/lib/tools/pricing";

type HomeWidgetRendererProps = {
  widgetId: HomeWidgetId;
  analyses: AnalysesPayload;
  opportunities: OpportunityListItem[];
  missions: MissionListItem[];
  role?: string;
};

function WidgetShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function HomeWidgetRenderer({
  widgetId,
  analyses,
  opportunities,
  missions,
  role,
}: HomeWidgetRendererProps) {
  if (role === "collaborator" && !isCollaboratorHomeWidgetId(widgetId)) {
    return null;
  }

  const title = HOME_WIDGET_LABELS[widgetId];
  const oppYear = analyses.opportunities.defaultYear;
  const sub = analyses.subscriptions;
  const currentKey = yearMonthKey(sub.currentYear, sub.currentMonth);

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
    case "opp_ca_by_category":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.opportunities.caByCategoryByYear[oppYear] ?? []}
          layout="horizontal"
          valueFormatter={(v) => formatOpportunityPrice(v)}
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
    case "tools_monthly_spend": {
      const rows = sub.monthlyByCurrencyByMonth[currentKey] ?? [];
      const items =
        rows.length === 0
          ? [{ label: "Dépenses du mois", value: "—" }]
          : rows.map((row) => ({
              label: `Dépenses du mois (${row.currency})`,
              value: formatCentsWithCurrency(row.amountCents, row.currency),
            }));
      return (
        <WidgetShell title={title}>
          <AnalysisKpiGrid items={items} />
        </WidgetShell>
      );
    }
    case "opp_pipeline": {
      const pipeline =
        analyses.opportunities.pipelineByYear[oppYear] ?? [];
      return (
        <AnalysisLineChart
          title={title}
          data={pipeline.map((p) => ({
            label: p.label,
            entree: p.entree,
            gagnees: p.gagnees,
            perdues: p.perdues,
          }))}
          series={[
            { key: "entree", label: "Entrée pipeline", color: "var(--chart-1)" },
            { key: "gagnees", label: "Gagnées", color: "var(--chart-2)" },
            { key: "perdues", label: "Perdues", color: "var(--chart-3)" },
          ]}
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
      );
    }
    case "opp_by_team":
      return (
        <AnalysisBarChart
          title={title}
          data={analyses.opportunities.caByTeamByYear[oppYear] ?? []}
          layout="horizontal"
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
      );
    case "tools_category_year": {
      const evolutionSeries = sub.costEvolution.years.map((y, index) => ({
        key: String(y),
        label: String(y),
        color: `var(--chart-${(index % 5) + 1})`,
      }));
      return (
        <AnalysisLineChart
          title={title}
          data={sub.costEvolution.points.map((p) => ({
            label: p.label,
            ...p.values,
          }))}
          series={evolutionSeries}
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
      );
    }
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
