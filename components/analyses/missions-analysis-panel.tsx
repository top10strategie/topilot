"use client";

import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import type { MissionsAnalysis } from "@/lib/analyses/types";

type Props = {
  data: MissionsAnalysis;
};

export function MissionsAnalysisPanel({ data }: Props) {
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
          title="Comparaison par catégories"
          data={data.byCategory}
          layout="horizontal"
        />
        <AnalysisBarChart
          title="Évolution du pipeline Produit"
          data={data.pipeline}
          layout="vertical"
        />
        <AnalysisBarChart
          title="Comparaison par pôle"
          data={data.byTeam}
          layout="horizontal"
        />
      </div>
    </div>
  );
}
