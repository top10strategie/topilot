"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDatum } from "@/lib/analyses/types";

type AnalysisBarChartProps = {
  title: string;
  data: ChartDatum[];
  layout?: "horizontal" | "vertical";
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  headerAction?: ReactNode;
  className?: string;
};

const defaultFormat = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

export function AnalysisBarChart({
  title,
  data,
  layout = "horizontal",
  valueFormatter = defaultFormat,
  emptyMessage = "Aucune donnée.",
  headerAction,
  className,
}: AnalysisBarChartProps) {
  const chartData = data.filter((d) => d.value > 0);
  const isHorizontalBars = layout === "horizontal";

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
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="h-[280px] w-full">
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
                    tickFormatter={valueFormatter}
                    className="text-xs"
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) =>
                      valueFormatter(typeof value === "number" ? value : Number(value))
                    }
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={valueFormatter}
                    className="text-xs"
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) =>
                      valueFormatter(typeof value === "number" ? value : Number(value))
                    }
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
