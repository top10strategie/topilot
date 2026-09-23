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
  /** Cumul annuel de la série (ligne 2 du tooltip). */
  yearTotal?: number;
  /** Libellé court pour le tooltip (sans total année). */
  tooltipLabel?: string;
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
  /** Affiché à droite sur sm+, sous le titre/année sur mobile. */
  headerSecondary?: ReactNode;
  className?: string;
  /** Hauteur du conteneur chart (px). */
  height?: number;
  showLegend?: boolean;
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

function SeriesTooltipContent({
  active,
  payload,
  label,
  series,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  series?: AnalysisBarSeries[];
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label != null && label !== "" ? (
        <p className="mb-1.5 font-medium">{String(label)}</p>
      ) : null}
      <ul className="space-y-2">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const seriesDef = series?.find((s) => s.key === key);
          const baseLabel =
            seriesDef?.tooltipLabel ??
            seriesDef?.label ??
            String(entry.name ?? key);
          const monthValue =
            typeof entry.value === "number" ? entry.value : Number(entry.value);
          const monthFormatted = Number.isFinite(monthValue)
            ? valueFormatter(monthValue)
            : "—";
          return (
            <li key={key} className="space-y-0.5">
              <p className="font-medium" style={{ color: entry.color }}>
                {baseLabel} — {monthFormatted}
              </p>
              {seriesDef?.yearTotal != null ? (
                <p className="text-muted-foreground">
                  Total année : {valueFormatter(seriesDef.yearTotal)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChartCardHeader({
  title,
  headerAction,
  headerSecondary,
}: {
  title: string;
  headerAction?: ReactNode;
  headerSecondary?: ReactNode;
}) {
  const hasActions = Boolean(headerAction || headerSecondary);
  return (
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
  );
}

export function AnalysisBarChart({
  title,
  data,
  series,
  layout = "horizontal",
  valueFormatter = defaultFormat,
  axisTickFormatter,
  emptyMessage = "Aucune donnée.",
  headerAction,
  headerSecondary,
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

  const tooltip = (
    <Tooltip
      content={(props) => (
        <SeriesTooltipContent
          active={props.active}
          payload={props.payload as unknown as TooltipPayloadEntry[] | undefined}
          label={props.label as string | number | undefined}
          series={series}
          valueFormatter={valueFormatter}
        />
      )}
    />
  );

  return (
    <Card className={className}>
      <ChartCardHeader
        title={title}
        headerAction={headerAction}
        headerSecondary={headerSecondary}
      />
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
                  {tooltip}
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
                  {tooltip}
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
