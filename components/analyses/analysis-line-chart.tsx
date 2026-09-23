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
  /** Cumul annuel — affiché inline dans le tooltip si défini. */
  yearTotal?: number;
};

type AnalysisLineChartProps = {
  title: string;
  /** Lignes avec `label` (axe X) + clés numériques correspondant à `series[].key`. */
  data: Array<Record<string, string | number>>;
  series: AnalysisLineSeries[];
  valueFormatter?: (value: number) => string;
  /** Format des ticks d’axe (défaut = valueFormatter). */
  axisTickFormatter?: (value: number) => string;
  emptyMessage?: string;
  headerAction?: ReactNode;
  /** Affiché à droite sur sm+, sous le titre/année sur mobile. */
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

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function LineTooltipContent({
  active,
  payload,
  label,
  series,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  series: AnalysisLineSeries[];
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label != null && label !== "" ? (
        <p className="mb-1.5 font-medium">{String(label)}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const seriesDef = series.find((s) => s.key === key);
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

export function AnalysisLineChart({
  title,
  data,
  series,
  valueFormatter = defaultFormat,
  axisTickFormatter,
  emptyMessage = "Aucune donnée.",
  headerAction,
  headerSecondary,
  className,
  height = 280,
}: AnalysisLineChartProps) {
  const tickFormat = axisTickFormatter ?? valueFormatter;
  const hasValues = data.some((row) =>
    series.some((s) => {
      const v = row[s.key];
      return typeof v === "number" && v > 0;
    }),
  );
  const hasActions = Boolean(headerAction || headerSecondary);

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
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
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
                    <LineTooltipContent
                      active={props.active}
                      payload={
                        props.payload as unknown as
                          | TooltipPayloadEntry[]
                          | undefined
                      }
                      label={props.label as string | number | undefined}
                      series={series}
                      valueFormatter={valueFormatter}
                    />
                  )}
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
