"use client";

import { useMemo, useState } from "react";
import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisLineChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { AnalysisYearSelect } from "@/components/analyses/analysis-period-selects";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type {
  AnalysisClientOption,
  OpportunitiesAnalysis,
} from "@/lib/analyses/types";
import { formatOpportunityPrice } from "@/lib/opportunities/labels";

function formatAxisEuro(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1000) {
    return `${new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value)} €`;
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;
}

type Props = {
  data: OpportunitiesAnalysis;
};

const CA_STACK_SERIES = [
  { key: "engage", label: "CA engagé", color: "var(--chart-2)", stackId: "ca" },
  {
    key: "previsionnel",
    label: "CA prévisionnel",
    color: "var(--chart-1)",
    stackId: "ca",
  },
] as const;

const PIPELINE_SERIES = [
  { key: "engage", label: "CA engagé", color: "var(--chart-2)" },
  { key: "previsionnel", label: "CA prévisionnel", color: "var(--chart-1)" },
] as const;

/** Couleurs « engagé » (plein) / « prévisionnel » (plus clair) par client. */
const CLIENT_CHART_COLORS_ENGAGE = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-1)",
] as const;

const CLIENT_CHART_COLORS_PREV = [
  "color-mix(in oklab, var(--chart-2) 55%, white)",
  "color-mix(in oklab, var(--chart-4) 55%, white)",
  "color-mix(in oklab, var(--chart-3) 55%, white)",
  "color-mix(in oklab, var(--chart-5) 55%, white)",
  "color-mix(in oklab, var(--chart-1) 55%, white)",
] as const;

const MAX_CLIENTS = 5;

function topClientIdForYear(
  data: OpportunitiesAnalysis,
  year: number,
): string | null {
  const byClient = data.caByClientByYear[year] ?? {};
  let bestId: string | null = null;
  let bestTotal = -1;
  for (const [id, series] of Object.entries(byClient)) {
    if (series.total > bestTotal) {
      bestTotal = series.total;
      bestId = id;
    }
  }
  return bestId;
}

function ClientMultiSelect({
  options,
  value,
  onChange,
}: {
  options: AnalysisClientOption[];
  value: AnalysisClientOption[];
  onChange: (next: AnalysisClientOption[]) => void;
}) {
  const chipsAnchor = useComboboxAnchor();

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun client avec CA.</p>
    );
  }

  return (
    <Combobox
      items={options}
      multiple
      value={value}
      onValueChange={(next) => {
        const list = next ?? [];
        if (list.length > MAX_CLIENTS) {
          onChange(list.slice(0, MAX_CLIENTS));
          return;
        }
        onChange(list);
      }}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <ComboboxChips
        ref={chipsAnchor}
        className="min-w-[220px] max-w-[320px]"
      >
        <ComboboxValue>
          {(selected: AnalysisClientOption[]) => (
            <>
              {selected.map((item) => (
                <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={
                  selected.length > 0
                    ? selected.length >= MAX_CLIENTS
                      ? "Maximum 5"
                      : "Ajouter…"
                    : "Clients…"
                }
                disabled={selected.length >= MAX_CLIENTS}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={chipsAnchor}>
        <ComboboxEmpty>Aucun client trouvé.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem
              key={item.id}
              value={item}
              disabled={
                value.length >= MAX_CLIENTS &&
                !value.some((v) => v.id === item.id)
              }
            >
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function OpportunitiesAnalysisPanel({ data }: Props) {
  const years =
    data.availableYears.length > 0
      ? data.availableYears
      : [data.defaultYear];

  const [pipelineYear, setPipelineYear] = useState(data.defaultYear);
  const [teamYear, setTeamYear] = useState(data.defaultYear);
  const [clientYear, setClientYear] = useState(data.defaultYear);
  const [selectedClients, setSelectedClients] = useState<
    AnalysisClientOption[]
  >(() => {
    const topId = topClientIdForYear(data, data.defaultYear);
    if (!topId) return [];
    const opt = data.caClientOptions.find((c) => c.id === topId);
    return opt ? [opt] : [];
  });

  const pipeline = data.pipelineByYear[pipelineYear] ?? [];
  const caByTeam = data.caByTeamByYear[teamYear] ?? [];

  const pipelineChartData = pipeline.map((p) => ({
    label: p.label,
    engage: p.engage,
    previsionnel: p.previsionnel,
  }));

  const teamChartData = caByTeam.map((d) => ({
    label: d.label,
    engage: d.engage,
    previsionnel: d.previsionnel,
  }));

  const clientChart = useMemo(() => {
    const byClient = data.caByClientByYear[clientYear] ?? {};
    const yearPipeline = data.pipelineByYear[clientYear];
    const clients = selectedClients.slice(0, MAX_CLIENTS);
    const months: Array<Record<string, string | number> & { label: string }> =
      Array.from({ length: 12 }, (_, i) => {
        const point: Record<string, string | number> & { label: string } = {
          label: yearPipeline?.[i]?.label ?? `M${i + 1}`,
        };
        for (let c = 0; c < clients.length; c++) {
          const client = clients[c]!;
          const series = byClient[client.id];
          const m = series?.months[i];
          point[`c${c}_engage`] = m?.engage ?? 0;
          point[`c${c}_previsionnel`] = m?.previsionnel ?? 0;
        }
        return point;
      });

    const series = clients.flatMap((client, c) => {
      let sumEngage = 0;
      let sumPrev = 0;
      for (const point of months) {
        sumEngage += Number(point[`c${c}_engage`] ?? 0);
        sumPrev += Number(point[`c${c}_previsionnel`] ?? 0);
      }
      const entries: Array<{
        key: string;
        label: string;
        color: string;
        stackId: string;
      }> = [];
      if (sumEngage > 0) {
        entries.push({
          key: `c${c}_engage`,
          label: `${client.label} · engagé`,
          color: CLIENT_CHART_COLORS_ENGAGE[c] ?? "var(--chart-2)",
          stackId: `c${c}`,
        });
      }
      if (sumPrev > 0) {
        entries.push({
          key: `c${c}_previsionnel`,
          label: `${client.label} · prévisionnel`,
          color: CLIENT_CHART_COLORS_PREV[c] ?? "var(--chart-1)",
          stackId: `c${c}`,
        });
      }
      return entries;
    });

    return { months, series };
  }, [clientYear, data.caByClientByYear, data.pipelineByYear, selectedClients]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AnalysisKpiGrid
          className="h-full sm:grid-cols-2 xl:grid-cols-2"
          items={[
            {
              label: "Total des sommes engagées",
              value: formatOpportunityPrice(data.kpis.sumPrice),
            },
            {
              label: "Total des sommes pondérées",
              value: formatOpportunityPrice(data.kpis.sumAveragePrice),
            },
          ]}
        />
        <AnalysisBarChart
          title="Comparaison par statut"
          data={data.byStatus}
          layout="vertical"
          emptyMessage="Aucune opportunité pour l'année en cours."
        />
      </div>

      <div className="space-y-2">
        {data.missingBillingCount > 0 ? (
          <p className="text-sm text-destructive">
            {data.missingBillingCount} opportunité
            {data.missingBillingCount > 1 ? "s" : ""} sans délais de
            facturation (remplir la date de fin de facturation)
          </p>
        ) : null}
        <AnalysisLineChart
          title="Évolution du pipeline Commercial"
          data={pipelineChartData}
          series={[...PIPELINE_SERIES]}
          valueFormatter={(v) => formatOpportunityPrice(v)}
          axisTickFormatter={formatAxisEuro}
          headerAction={
            <AnalysisYearSelect
              years={years}
              value={pipelineYear}
              onChange={setPipelineYear}
            />
          }
        />
      </div>

      <AnalysisBarChart
        title="Évolution du CA par Client"
        data={clientChart.months}
        series={clientChart.series}
        layout="vertical"
        height={320}
        showLegend
        valueFormatter={(v) => formatOpportunityPrice(v)}
        axisTickFormatter={formatAxisEuro}
        emptyMessage="Sélectionnez un client pour afficher le CA mensuel."
        headerAction={
          <>
            <ClientMultiSelect
              options={data.caClientOptions}
              value={selectedClients}
              onChange={setSelectedClients}
            />
            <AnalysisYearSelect
              years={years}
              value={clientYear}
              onChange={(year) => {
                setClientYear(year);
                if (selectedClients.length === 0) {
                  const topId = topClientIdForYear(data, year);
                  const opt = data.caClientOptions.find((c) => c.id === topId);
                  if (opt) setSelectedClients([opt]);
                }
              }}
            />
          </>
        }
      />

      <AnalysisBarChart
        title="Comparaison CA par pôle"
        data={teamChartData}
        series={[...CA_STACK_SERIES]}
        layout="horizontal"
        showLegend
        valueFormatter={(v) => formatOpportunityPrice(v)}
        axisTickFormatter={formatAxisEuro}
        headerAction={
          <AnalysisYearSelect
            years={years}
            value={teamYear}
            onChange={setTeamYear}
          />
        }
      />
    </div>
  );
}
