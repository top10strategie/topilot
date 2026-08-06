"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AnalysisLineSeries = {
  key: string;
  label: string;
  color?: string;
};

type AnalysisLineChartProps = {
  title: string;
  /** Lignes avec `label` (axe X) + clés numériques correspondant à `series[].key`. */
  data: Array<Record<string, string | number>>;
  series: AnalysisLineSeries[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  headerAction?: ReactNode;
  className?: string;
  height?: number;
};

const defaultFormat = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function AnalysisLineChart({
  title,
  data,
  series,
  valueFormatter = defaultFormat,
  emptyMessage = "Aucune donnée.",
  headerAction,
  className,
  height = 280,
}: AnalysisLineChartProps) {
  const hasValues = data.some((row) =>
    series.some((s) => {
      const v = row[s.key];
      return typeof v === "number" && v > 0;
    }),
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {headerAction ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {headerAction}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasValues ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="label"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={valueFormatter}
                  className="text-xs"
                  width={56}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const num =
                      typeof value === "number" ? value : Number(value);
                    const seriesLabel =
                      series.find((s) => s.key === name)?.label ?? String(name);
                    return [valueFormatter(num), seriesLabel];
                  }}
                />
                <Legend
                  formatter={(value) =>
                    series.find((s) => s.key === value)?.label ?? value
                  }
                />
                {series.map((s, index) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.key}
                    stroke={
                      s.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                    }
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
