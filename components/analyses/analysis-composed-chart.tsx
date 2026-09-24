"use client";

import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AnalysisComposedBarSeries = {
  key: string;
  label: string;
  color: string;
  stackId?: string;
  yearTotal?: number;
};

export type AnalysisComposedLineSeries = {
  key: string;
  label: string;
  color: string;
  yearTotal?: number;
  strokeDasharray?: string;
};

type AnalysisComposedChartProps = {
  title: string;
  data: Array<Record<string, string | number>>;
  barSeries: AnalysisComposedBarSeries[];
  lineSeries?: AnalysisComposedLineSeries[];
  /** Ordre des clés dans la légende (et le tooltip). */
  legendOrder?: string[];
  valueFormatter?: (value: number) => string;
  axisTickFormatter?: (value: number) => string;
  emptyMessage?: string;
  headerAction?: ReactNode;
  headerSecondary?: ReactNode;
  className?: string;
  height?: number;
};

type TooltipPayloadEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

const defaultFormat = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

const AXIS_TICK = { fontSize: 10 } as const;

function sortByLegendOrder<T extends { dataKey?: string | number; name?: string | number }>(
  items: T[],
  legendOrder?: string[],
): T[] {
  if (!legendOrder?.length) return items;
  const rank = (item: T) => {
    const key = String(item.dataKey ?? item.name ?? "");
    const idx = legendOrder.indexOf(key);
    return idx === -1 ? legendOrder.length : idx;
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

function ComposedTooltipContent({
  active,
  payload,
  label,
  barSeries,
  lineSeries,
  legendOrder,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  barSeries: AnalysisComposedBarSeries[];
  lineSeries: AnalysisComposedLineSeries[];
  legendOrder?: string[];
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const allSeries = [...barSeries, ...lineSeries];
  const orderedPayload = sortByLegendOrder(payload, legendOrder);

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label != null && label !== "" ? (
        <p className="mb-1.5 font-medium">{String(label)}</p>
      ) : null}
      <ul className="space-y-1">
        {orderedPayload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const seriesDef = allSeries.find((s) => s.key === key);
          const seriesLabel = seriesDef?.label ?? String(entry.name ?? key);
          const monthValue =
            typeof entry.value === "number" ? entry.value : Number(entry.value);
          const monthFormatted = Number.isFinite(monthValue)
            ? valueFormatter(monthValue)
            : "—";
          const yearPart =
            seriesDef?.yearTotal != null
              ? ` (${valueFormatter(seriesDef.yearTotal)})`
              : "";
          return (
            <li key={key} className="font-medium" style={{ color: entry.color }}>
              {seriesLabel} — {monthFormatted}
              {yearPart}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AnalysisComposedChart({
  title,
  data,
  barSeries,
  lineSeries = [],
  legendOrder,
  valueFormatter = defaultFormat,
  axisTickFormatter,
  emptyMessage = "Aucune donnée.",
  headerAction,
  headerSecondary,
  className,
  height = 280,
}: AnalysisComposedChartProps) {
  const tickFormat = axisTickFormatter ?? valueFormatter;
  const allKeys = [...barSeries, ...lineSeries].map((s) => s.key);
  const hasValues = data.some((row) =>
    allKeys.some((key) => {
      const v = row[key];
      return typeof v === "number" && v > 0;
    }),
  );
  const hasActions = Boolean(headerAction || headerSecondary);
  const legendKeys = new Map(
    [...barSeries, ...lineSeries].map((s) => [s.key, s.label]),
  );

  return (
    <Card className={className}>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-row items-start justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {hasActions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {headerSecondary ? (
                <div className="hidden sm:block">{headerSecondary}</div>
              ) : null}
              {headerAction}
            </div>
          ) : null}
        </div>
        {headerSecondary ? (
          <div className="w-full sm:hidden">{headerSecondary}</div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasValues ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className={cn("w-full")} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
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
                  tickFormatter={(v) =>
                    tickFormat(typeof v === "number" ? v : Number(v))
                  }
                  className="text-xs"
                  width={72}
                  tick={AXIS_TICK}
                />
                <Tooltip
                  content={(props) => (
                    <ComposedTooltipContent
                      active={props.active}
                      payload={
                        props.payload as unknown as
                          | TooltipPayloadEntry[]
                          | undefined
                      }
                      label={props.label as string | number | undefined}
                      barSeries={barSeries}
                      lineSeries={lineSeries}
                      legendOrder={legendOrder}
                      valueFormatter={valueFormatter}
                    />
                  )}
                />
                <Legend
                  formatter={(value) => legendKeys.get(String(value)) ?? value}
                  content={(props) => {
                    const payload = sortByLegendOrder(
                      (props.payload ?? []) as Array<{
                        value?: string;
                        color?: string;
                        dataKey?: string | number;
                        name?: string | number;
                      }>,
                      legendOrder,
                    );
                    return (
                      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
                        {payload.map((entry) => {
                          const key = String(
                            entry.dataKey ?? entry.value ?? entry.name ?? "",
                          );
                          return (
                            <li
                              key={key}
                              className="inline-flex items-center gap-1.5"
                            >
                              <span
                                className="inline-block size-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              {legendKeys.get(key) ?? entry.value ?? key}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }}
                />
                {barSeries.map((s, index) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.key}
                    stackId={s.stackId ?? "stack"}
                    fill={s.color}
                    radius={
                      index === barSeries.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                ))}
                {lineSeries.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.strokeDasharray}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
