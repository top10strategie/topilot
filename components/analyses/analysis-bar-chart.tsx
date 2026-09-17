"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDatum } from "@/lib/analyses/types";
import { cn } from "@/lib/utils";

export type AnalysisBarSeries = {
  key: string;
  label: string;
  color: string;
  /** Même `stackId` = barres empilées ; ids différents = groupes côte à côte. */
  stackId?: string;
};

type AnalysisBarChartProps = {
  title: string;
  /**
   * Mode simple : `{ key, label, value }`.
   * Mode séries : chaque point a `label` + clés numériques listées dans `series`.
   */
  data: Array<ChartDatum | (Record<string, string | number> & { label: string })>;
  series?: AnalysisBarSeries[];
  layout?: "horizontal" | "vertical";
  valueFormatter?: (value: number) => string;
  /** Format des ticks d’axe (défaut = valueFormatter). */
  axisTickFormatter?: (value: number) => string;
  emptyMessage?: string;
  headerAction?: ReactNode;
  className?: string;
  /** Hauteur du conteneur chart (px). */
  height?: number;
  showLegend?: boolean;
};

const defaultFormat = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

const AXIS_TICK = { fontSize: 10 } as const;

export function AnalysisBarChart({
  title,
  data,
  series,
  layout = "horizontal",
  valueFormatter = defaultFormat,
  axisTickFormatter,
  emptyMessage = "Aucune donnée.",
  headerAction,
  className,
  height = 280,
  showLegend = false,
}: AnalysisBarChartProps) {
  const isMulti = Boolean(series && series.length > 0);
  const tickFormat = axisTickFormatter ?? valueFormatter;
  const chartData = isMulti
    ? data.filter((d) =>
        (series ?? []).some((s) => Number((d as Record<string, unknown>)[s.key]) > 0),
      )
    : (data as ChartDatum[]).filter((d) => d.value > 0);

  const isHorizontalBars = layout === "horizontal";

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {headerAction ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {headerAction}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className={cn("w-full")} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {isHorizontalBars ? (
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      tickFormat(typeof v === "number" ? v : Number(v))
                    }
                    className="text-xs"
                    tick={AXIS_TICK}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const num =
                        typeof value === "number" ? value : Number(value);
                      const seriesLabel =
                        series?.find((s) => s.key === name)?.label ??
                        String(name);
                      return [valueFormatter(num), seriesLabel];
                    }}
                  />
                  {showLegend && series ? <Legend /> : null}
                  {isMulti && series
                    ? series.map((s) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.label}
                          stackId={s.stackId}
                          fill={s.color}
                          radius={[0, 4, 4, 0]}
                        />
                      ))
                    : (
                        <Bar
                          dataKey="value"
                          fill="var(--primary)"
                          radius={[0, 4, 4, 0]}
                        />
                      )}
                </BarChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      tickFormat(typeof v === "number" ? v : Number(v))
                    }
                    className="text-xs"
                    width={72}
                    tick={AXIS_TICK}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const num =
                        typeof value === "number" ? value : Number(value);
                      const seriesLabel =
                        series?.find((s) => s.key === name)?.label ??
                        String(name);
                      return [valueFormatter(num), seriesLabel];
                    }}
                  />
                  {showLegend && series ? <Legend /> : null}
                  {isMulti && series
                    ? series.map((s) => (
                        <Bar
                          key={s.key}
                          dataKey={s.key}
                          name={s.label}
                          stackId={s.stackId}
                          fill={s.color}
                          radius={[4, 4, 0, 0]}
                        />
                      ))
                    : (
                        <Bar
                          dataKey="value"
                          fill="var(--primary)"
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
