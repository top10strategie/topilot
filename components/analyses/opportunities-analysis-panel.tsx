"use client";

import { useState } from "react";
import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisLineChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { AnalysisYearSelect } from "@/components/analyses/analysis-period-selects";
import type { OpportunitiesAnalysis } from "@/lib/analyses/types";
import { formatOpportunityPrice } from "@/lib/opportunities/labels";

type Props = {
  data: OpportunitiesAnalysis;
};

const PIPELINE_SERIES = [
  { key: "entree", label: "Entrée pipeline", color: "var(--chart-1)" },
  { key: "gagnees", label: "Gagnées", color: "var(--chart-2)" },
  { key: "perdues", label: "Perdues", color: "var(--chart-3)" },
] as const;

export function OpportunitiesAnalysisPanel({ data }: Props) {
  const years =
    data.availableYears.length > 0
      ? data.availableYears
      : [data.defaultYear];
  const [caYear, setCaYear] = useState(data.defaultYear);
  const [pipelineYear, setPipelineYear] = useState(data.defaultYear);

  const caByCategory = data.caByCategoryByYear[caYear] ?? [];
  const caByTeam = data.caByTeamByYear[caYear] ?? [];
  const pipeline = data.pipelineByYear[pipelineYear] ?? [];

  const pipelineChartData = pipeline.map((p) => ({
    label: p.label,
    entree: p.entree,
    gagnees: p.gagnees,
    perdues: p.perdues,
  }));

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
          title="Comparaison CA par catégorie"
          data={caByCategory}
          layout="horizontal"
          valueFormatter={(v) => formatOpportunityPrice(v)}
          headerAction={
            <AnalysisYearSelect
              years={years}
              value={caYear}
              onChange={setCaYear}
            />
          }
        />
        <AnalysisBarChart
          title="Comparaison CA par pôle"
          data={caByTeam}
          layout="horizontal"
          valueFormatter={(v) => formatOpportunityPrice(v)}
          headerAction={
            <AnalysisYearSelect
              years={years}
              value={caYear}
              onChange={setCaYear}
            />
          }
        />
      </div>
      <AnalysisLineChart
        title="Évolution du pipeline Commercial"
        data={pipelineChartData}
        series={[...PIPELINE_SERIES]}
        valueFormatter={(v) => formatOpportunityPrice(v)}
        headerAction={
          <AnalysisYearSelect
            years={years}
            value={pipelineYear}
            onChange={setPipelineYear}
          />
        }
      />
    </div>
  );
}
