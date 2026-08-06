"use client";

import { useState } from "react";
import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisLineChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import {
  AnalysisMonthSelect,
  AnalysisYearSelect,
} from "@/components/analyses/analysis-period-selects";
import type { SubscriptionsAnalysis } from "@/lib/analyses/types";
import { formatCentsWithCurrency } from "@/lib/tools/pricing";

type Props = {
  data: SubscriptionsAnalysis;
};

function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function SubscriptionsAnalysisPanel({ data }: Props) {
  const [year, setYear] = useState(data.currentYear);
  const [month, setMonth] = useState(data.currentMonth);

  const maxEnabledMonth =
    year === data.currentYear ? data.currentMonth : 12;

  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    const maxMonth =
      nextYear === data.currentYear ? data.currentMonth : 12;
    if (month > maxMonth) setMonth(maxMonth);
  };

  const key = yearMonthKey(year, month);
  const monthlyByCurrency = data.monthlyByCurrencyByMonth[key] ?? [];
  const costByTool = data.costByToolByMonth[key] ?? [];
  const costByCategory = data.costByCategoryByMonth[key] ?? [];

  const spendItems =
    monthlyByCurrency.length === 0
      ? [{ label: "Dépenses du mois", value: "—" }]
      : monthlyByCurrency.map((row) => ({
          label: `Dépenses du mois (${row.currency})`,
          value: formatCentsWithCurrency(row.amountCents, row.currency),
        }));

  const evolutionSeries = data.costEvolution.years.map((y, index) => ({
    key: String(y),
    label: String(y),
    color: `var(--chart-${(index % 5) + 1})`,
  }));

  const evolutionData = data.costEvolution.points.map((p) => ({
    label: p.label,
    ...p.values,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AnalysisYearSelect
          years={data.years}
          value={year}
          onChange={handleYearChange}
        />
        <AnalysisMonthSelect
          value={month}
          onChange={setMonth}
          maxEnabledMonth={maxEnabledMonth}
        />
      </div>
      <AnalysisKpiGrid items={spendItems} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalysisBarChart
          title="Coût par outil"
          data={costByTool}
          layout="vertical"
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
        <AnalysisBarChart
          title="Coût par catégorie"
          data={costByCategory}
          layout="horizontal"
          valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
        />
      </div>
      <AnalysisLineChart
        title="Évolution des coûts par année"
        data={evolutionData}
        series={evolutionSeries}
        valueFormatter={(v) => formatCentsWithCurrency(v, "EUR")}
      />
    </div>
  );
}
