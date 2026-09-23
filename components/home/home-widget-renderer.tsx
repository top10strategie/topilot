"use client";

import type { ReactNode } from "react";
import {
  AnalysisBarChart,
  AnalysisLineChart,
} from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { MissionsHomeKanban } from "@/components/missions/missions-home-kanban-lazy";
import { OpportunitiesHomeKanban } from "@/components/opportunities/opportunities-home-kanban-lazy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysesPayload, HomeWidgetId } from "@/lib/analyses/types";
import {
  ANALYSIS_CA_ENTITY_ESF_ID,
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

function topClientId(
  byClient: AnalysesPayload["opportunities"]["caByClientByYear"][number],
): string | null {
  let bestId: string | null = null;
  let best = -1;
  for (const [id, series] of Object.entries(byClient ?? {})) {
    if (id === ANALYSIS_CA_ENTITY_ESF_ID) continue;
    if (series.total > best) {
      best = series.total;
      bestId = id;
    }
  }
  return bestId;
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
              <OpportunitiesHomeKanban items={opportunities} />
            </CardContent>
          </Card>
        </WidgetShell>
      );
    case "kanban_missions":
      return (
        <WidgetShell title={title}>
          <Card>
            <CardContent className="pt-4">
              <MissionsHomeKanban items={missions} />
            </CardContent>
          </Card>
        </WidgetShell>
      );
    case "kpi_opportunities":
      return (
        <WidgetShell title={title}>
          <AnalysisKpiGrid
            className="sm:grid-cols-2 xl:grid-cols-2"
            items={[
              {
                label: `Total des sommes engagées - ${analyses.opportunities.defaultYear}`,
                value: formatOpportunityPrice(
                  analyses.opportunities.kpis.sumPrice,
                ),
              },
              {
                label: `Total des sommes pondérées - ${analyses.opportunities.defaultYear}`,
                value: formatOpportunityPrice(
                  analyses.opportunities.kpis.sumAveragePrice,
                ),
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
          layout="vertical"
        />
      );
    case "opp_ca_by_client": {
      const byClient =
        analyses.opportunities.caByClientByYear[oppYear] ?? {};
      const clientId = topClientId(byClient);
      const option = analyses.opportunities.caClientOptions.find(
        (c) => c.id === clientId,
      );
      const series = clientId ? byClient[clientId] : null;
      const chartData =
        series?.months.map((p) => ({
          label: p.label,
          engage: p.engage,
          previsionnel: p.previsionnel,
        })) ?? [];
      let sumEngage = 0;
      let sumPrev = 0;
      for (const p of series?.months ?? []) {
        sumEngage += p.engage;
        sumPrev += p.previsionnel;
      }
      const barSeries = [
        ...(sumEngage > 0
          ? [
              {
                key: "engage",
                label: `CA engagé (${formatOpportunityPrice(sumEngage)})`,
                tooltipLabel: "CA engagé",
                color: "var(--chart-2)",
                stackId: "ca",
                yearTotal: sumEngage,
              },
            ]
          : []),
        ...(sumPrev > 0
          ? [
              {
                key: "previsionnel",
                label: `CA prévisionnel (${formatOpportunityPrice(sumPrev)})`,
                tooltipLabel: "CA prévisionnel",
                color: "var(--chart-1)",
                stackId: "ca",
                yearTotal: sumPrev,
              },
            ]
          : []),
      ];
      return (
        <AnalysisBarChart
          title={
            option
              ? `${title} (${option.label})`
              : title
          }
          data={chartData}
          series={barSeries}
          layout="vertical"
          showLegend
          valueFormatter={(v) => formatOpportunityPrice(v)}
          emptyMessage="Aucun CA client pour l'année en cours."
        />
      );
    }
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
      const aimAmount = analyses.opportunities.revenueAimsByYear[oppYear];
      const hasAim = aimAmount != null;
      const monthlyObjectif = hasAim ? aimAmount / 12 : null;
      return (
        <AnalysisLineChart
          title={title}
          data={pipeline.map((p) => ({
            label: p.label,
            engage: p.engage,
            previsionnel: p.previsionnel,
            ...(monthlyObjectif != null ? { objectif: monthlyObjectif } : {}),
          }))}
          series={[
            { key: "engage", label: "CA engagé", color: "var(--chart-2)" },
            {
              key: "previsionnel",
              label: "CA prévisionnel",
              color: "var(--chart-1)",
            },
            ...(hasAim
              ? [
                  {
                    key: "objectif",
                    label: "Objectif de CA",
                    color: "var(--chart-3)",
                  },
                ]
              : []),
          ]}
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
      );
    }
    case "opp_by_team":
      return (
        <AnalysisBarChart
          title={title}
          data={(analyses.opportunities.caByTeamByYear[oppYear] ?? []).map(
            (d) => ({
              label: d.label,
              engage: d.engage,
              previsionnel: d.previsionnel,
            }),
          )}
          series={[
            {
              key: "engage",
              label: "CA engagé",
              color: "var(--chart-2)",
              stackId: "ca",
            },
            {
              key: "previsionnel",
              label: "CA prévisionnel",
              color: "var(--chart-1)",
              stackId: "ca",
            },
          ]}
          layout="horizontal"
          showLegend
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
