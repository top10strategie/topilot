"use client";

import { useMemo, useState } from "react";
import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { AnalysisYearSelect } from "@/components/analyses/analysis-period-selects";
import type { MissionsAnalysis } from "@/lib/analyses/types";

type Props = {
  data: MissionsAnalysis;
};

export function MissionsAnalysisPanel({ data }: Props) {
  const years = useMemo(
    () =>
      data.availableYears.length
        ? data.availableYears
        : [data.defaultYear],
    [data.availableYears, data.defaultYear],
  );
  const [pipelineYear, setPipelineYear] = useState(data.defaultYear);

  const selectedYear = years.includes(pipelineYear)
    ? pipelineYear
    : (years[0] ?? data.defaultYear);

  const pipelineData = data.pipelineByYear[selectedYear] ?? [];

  return (
    <div className="space-y-6">
      <AnalysisKpiGrid
        items={[
          { label: "Nombre de missions", value: String(data.kpis.count) },
          {
            label: "Missions en production",
            value: String(data.kpis.inProduction),
          },
          {
            label: "Missions abandonnées",
            value: String(data.kpis.abandoned),
          },
          {
            label: "Missions complétées",
            value: String(data.kpis.completed),
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
          title="Comparaison par pôle"
          data={data.byTeam}
          layout="horizontal"
        />
      </div>
      <AnalysisBarChart
        title="Évolution du pipeline Produit"
        data={pipelineData}
        layout="vertical"
        emptyMessage="Aucune mission démarrée sur cette année."
        headerAction={
          <AnalysisYearSelect
            years={years}
            value={selectedYear}
            onChange={setPipelineYear}
          />
        }
      />
    </div>
  );
}
