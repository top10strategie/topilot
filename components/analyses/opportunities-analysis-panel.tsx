"use client";

import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import type { OpportunitiesAnalysis } from "@/lib/analyses/types";
import { formatOpportunityPrice } from "@/lib/opportunities/labels";

type Props = {
  data: OpportunitiesAnalysis;
};

export function OpportunitiesAnalysisPanel({ data }: Props) {
  return (
    <div className="space-y-6">
      <AnalysisKpiGrid
        items={[
          { label: "Nombre d'opportunités", value: String(data.kpis.count) },
          {
            label: "Total des sommes engagées",
            value: formatOpportunityPrice(data.kpis.sumPrice),
          },
          {
            label: "Total des sommes pondérées",
            value: formatOpportunityPrice(data.kpis.sumAveragePrice),
          },
          {
            label: "Taux de conversion",
            value: `${Math.round(data.kpis.conversionRate * 100)} %`,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalysisBarChart
          title="Comparaison par statut"
          data={data.byStatus}
          layout="horizontal"
        />
        <AnalysisBarChart
          title="Comparaison par catégories"
          data={data.byCategory}
          layout="horizontal"
        />
        <AnalysisBarChart
          title="Évolution du pipeline Commercial"
          data={data.pipeline}
          layout="vertical"
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
        <AnalysisBarChart
          title="Comparaison CA par pôle"
          data={data.byTeam}
          layout="horizontal"
          valueFormatter={(v) => formatOpportunityPrice(v)}
        />
      </div>
    </div>
  );
}
