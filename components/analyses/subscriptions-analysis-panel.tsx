"use client";

import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import type { SubscriptionsAnalysis } from "@/lib/analyses/types";
import { formatCentsWithCurrency } from "@/lib/tools/pricing";

type Props = {
  data: SubscriptionsAnalysis;
};

export function SubscriptionsAnalysisPanel({ data }: Props) {
  const spendItems =
    data.monthlyByCurrency.length === 0
      ? [{ label: "Dépenses du mois", value: "—" }]
      : data.monthlyByCurrency.map((row) => ({
          label: `Dépenses du mois (${row.currency})`,
          value: formatCentsWithCurrency(row.amountCents, row.currency),
        }));

  return (
    <div className="space-y-6">
      <AnalysisKpiGrid items={spendItems} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalysisBarChart
          title="Coût par outil — mois"
          data={data.costByToolMonth}
          layout="vertical"
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
        <AnalysisBarChart
          title="Coût par catégories — mois"
          data={data.costByCategoryMonth}
          layout="horizontal"
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
        <AnalysisBarChart
          title="Évolution des coûts par catégories — année"
          data={data.costByCategoryYear}
          layout="vertical"
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
      </div>
    </div>
  );
}
