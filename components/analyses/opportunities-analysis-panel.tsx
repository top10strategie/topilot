"use client";

import { useMemo, useState } from "react";
import { Eye, StackPlus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { AnalysisBarChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisLineChart } from "@/components/analyses/analysis-bar-chart-lazy";
import { AnalysisKpiGrid } from "@/components/analyses/analysis-kpi-grid";
import { AnalysisYearSelect } from "@/components/analyses/analysis-period-selects";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { RevenueAimConsultationDrawer } from "@/components/revenue-aim/revenue-aim-consultation-drawer";
import {
  RevenueAimFormDrawer,
  type RevenueAimFormResult,
} from "@/components/revenue-aim/revenue-aim-form-drawer";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AnalysisClientOption,
  OpportunitiesAnalysis,
} from "@/lib/analyses/types";
import { ANALYSIS_CA_ENTITY_ESF_ID } from "@/lib/analyses/types";
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

const OBJECTIF_SERIES = {
  key: "objectif",
  label: "Objectif de CA",
  color: "var(--chart-3)",
} as const;

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
    if (id === ANALYSIS_CA_ENTITY_ESF_ID) continue;
    if (series.total > bestTotal) {
      bestTotal = series.total;
      bestId = id;
    }
  }
  return bestId;
}

function seriesYearSum(
  months: Array<Record<string, string | number>>,
  key: string,
): number {
  let sum = 0;
  for (const point of months) {
    sum += Number(point[key] ?? 0);
  }
  return sum;
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
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const yearSuffix = ` - ${data.defaultYear}`;
  const years =
    data.availableYears.length > 0
      ? data.availableYears
      : [data.defaultYear];

  const [pipelineYear, setPipelineYear] = useState(data.defaultYear);
  const [pipelineCompareYear, setPipelineCompareYear] = useState(
    data.defaultYear,
  );
  const [teamYear, setTeamYear] = useState(data.defaultYear);
  const [teamCompareYear, setTeamCompareYear] = useState(data.defaultYear);
  const [clientYear, setClientYear] = useState(data.defaultYear);
  const [clientCompareYear, setClientCompareYear] = useState(data.defaultYear);
  const [selectedClients, setSelectedClients] = useState<
    AnalysisClientOption[]
  >(() => {
    const topId = topClientIdForYear(data, data.defaultYear);
    if (!topId) return [];
    const opt = data.caClientOptions.find((c) => c.id === topId);
    return opt ? [opt] : [];
  });
  const [selectedCompareClients, setSelectedCompareClients] = useState<
    AnalysisClientOption[]
  >(() => {
    const topId = topClientIdForYear(data, data.defaultYear);
    if (!topId) return [];
    const opt = data.caClientOptions.find((c) => c.id === topId);
    return opt ? [opt] : [];
  });

  const pipeline = data.pipelineByYear[pipelineYear] ?? [];
  const caByTeam = data.caByTeamByYear[teamYear] ?? [];
  const pipelineAimAmount = data.revenueAimsByYear[pipelineYear];
  const hasPipelineAim = pipelineAimAmount != null;
  const monthlyObjectif = hasPipelineAim ? pipelineAimAmount / 12 : null;

  const pipelineChartData = pipeline.map((p) => ({
    label: p.label,
    engage: p.engage,
    previsionnel: p.previsionnel,
    ...(monthlyObjectif != null ? { objectif: monthlyObjectif } : {}),
  }));

  const pipelineSeries = hasPipelineAim
    ? [...PIPELINE_SERIES, OBJECTIF_SERIES]
    : [...PIPELINE_SERIES];

  const openCreateRevenueAim = () => {
    void pushDrawer<RevenueAimFormResult>({
      title: "Nouvel objectif de CA",
      content: (helpers) => (
        <RevenueAimFormDrawer
          mode="create"
          initialYear={pipelineYear}
          helpers={helpers}
        />
      ),
    }).then((created) => {
      if (created) router.refresh();
    });
  };

  const openConsultRevenueAims = () => {
    void pushDrawer({
      title: "Consultation des objectifs",
      content: () => (
        <RevenueAimConsultationDrawer initialAims={data.revenueAims} />
      ),
    });
  };

  const teamChartData = caByTeam.map((d) => ({
    label: d.label,
    engage: d.engage,
    previsionnel: d.previsionnel,
  }));

  const pipelineCompare = useMemo(() => {
    const y = pipelineCompareYear;
    const prev = y - 1;
    const currSeries = data.pipelineByYear[y] ?? [];
    const prevSeries = data.pipelineByYear[prev] ?? [];
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: currSeries[i]?.label ?? prevSeries[i]?.label ?? `M${i + 1}`,
      [`engage_${y}`]: currSeries[i]?.engage ?? 0,
      [`previsionnel_${y}`]: currSeries[i]?.previsionnel ?? 0,
      [`engage_${prev}`]: prevSeries[i]?.engage ?? 0,
      [`previsionnel_${prev}`]: prevSeries[i]?.previsionnel ?? 0,
    }));

    const candidates = [
      {
        key: `engage_${y}`,
        label: `CA engagé · ${y}`,
        color: "var(--chart-2)",
      },
      {
        key: `previsionnel_${y}`,
        label: `CA prévisionnel · ${y}`,
        color: "var(--chart-1)",
      },
      {
        key: `engage_${prev}`,
        label: `CA engagé · ${prev}`,
        color: "color-mix(in oklab, var(--chart-2) 55%, white)",
      },
      {
        key: `previsionnel_${prev}`,
        label: `CA prévisionnel · ${prev}`,
        color: "color-mix(in oklab, var(--chart-1) 55%, white)",
      },
    ];

    const series = candidates.filter((s) => seriesYearSum(months, s.key) > 0);
    return { months, series };
  }, [data.pipelineByYear, pipelineCompareYear]);

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
        yearTotal: number;
        tooltipLabel: string;
      }> = [];
      if (sumEngage > 0) {
        entries.push({
          key: `c${c}_engage`,
          label: `${client.label} · engagé (${formatOpportunityPrice(sumEngage)})`,
          tooltipLabel: `${client.label} · engagé`,
          color: CLIENT_CHART_COLORS_ENGAGE[c] ?? "var(--chart-2)",
          stackId: `c${c}`,
          yearTotal: sumEngage,
        });
      }
      if (sumPrev > 0) {
        entries.push({
          key: `c${c}_previsionnel`,
          label: `${client.label} · prévisionnel (${formatOpportunityPrice(sumPrev)})`,
          tooltipLabel: `${client.label} · prévisionnel`,
          color: CLIENT_CHART_COLORS_PREV[c] ?? "var(--chart-1)",
          stackId: `c${c}`,
          yearTotal: sumPrev,
        });
      }
      return entries;
    });

    return { months, series };
  }, [clientYear, data.caByClientByYear, data.pipelineByYear, selectedClients]);

  const clientCompare = useMemo(() => {
    const y = clientCompareYear;
    const prev = y - 1;
    const clients = selectedCompareClients.slice(0, MAX_CLIENTS);
    const currByClient = data.caByClientByYear[y] ?? {};
    const prevByClient = data.caByClientByYear[prev] ?? {};
    const yearPipeline = data.pipelineByYear[y] ?? data.pipelineByYear[prev];

    const months: Array<Record<string, string | number> & { label: string }> =
      Array.from({ length: 12 }, (_, i) => {
        const point: Record<string, string | number> & { label: string } = {
          label: yearPipeline?.[i]?.label ?? `M${i + 1}`,
        };
        for (let c = 0; c < clients.length; c++) {
          const client = clients[c]!;
          const curr = currByClient[client.id]?.months[i];
          const older = prevByClient[client.id]?.months[i];
          point[`c${c}_${y}_engage`] = curr?.engage ?? 0;
          point[`c${c}_${y}_previsionnel`] = curr?.previsionnel ?? 0;
          point[`c${c}_${prev}_engage`] = older?.engage ?? 0;
          point[`c${c}_${prev}_previsionnel`] = older?.previsionnel ?? 0;
        }
        return point;
      });

    const series = clients.flatMap((client, c) => {
      const entries: Array<{
        key: string;
        label: string;
        color: string;
        yearTotal: number;
      }> = [];
      const specs = [
        {
          key: `c${c}_${y}_engage`,
          label: `${client.label} · engagé · ${y}`,
          color: CLIENT_CHART_COLORS_ENGAGE[c] ?? "var(--chart-2)",
        },
        {
          key: `c${c}_${y}_previsionnel`,
          label: `${client.label} · prévisionnel · ${y}`,
          color: CLIENT_CHART_COLORS_PREV[c] ?? "var(--chart-1)",
        },
        {
          key: `c${c}_${prev}_engage`,
          label: `${client.label} · engagé · ${prev}`,
          color: `color-mix(in oklab, ${CLIENT_CHART_COLORS_ENGAGE[c] ?? "var(--chart-2)"} 45%, white)`,
        },
        {
          key: `c${c}_${prev}_previsionnel`,
          label: `${client.label} · prévisionnel · ${prev}`,
          color: `color-mix(in oklab, ${CLIENT_CHART_COLORS_PREV[c] ?? "var(--chart-1)"} 45%, white)`,
        },
      ];
      for (const spec of specs) {
        const total = seriesYearSum(months, spec.key);
        if (total > 0) entries.push({ ...spec, yearTotal: total });
      }
      return entries;
    });

    return { months, series };
  }, [
    clientCompareYear,
    data.caByClientByYear,
    data.pipelineByYear,
    selectedCompareClients,
  ]);

  const teamCompare = useMemo(() => {
    const y = teamCompareYear;
    const prev = y - 1;
    const curr = data.caByTeamByYear[y] ?? [];
    const older = data.caByTeamByYear[prev] ?? [];
    const byLabel = new Map<
      string,
      {
        label: string;
        engageY: number;
        prevY: number;
        engagePrev: number;
        prevPrev: number;
      }
    >();

    for (const row of curr) {
      byLabel.set(row.label, {
        label: row.label,
        engageY: row.engage,
        prevY: row.previsionnel,
        engagePrev: 0,
        prevPrev: 0,
      });
    }
    for (const row of older) {
      const existing = byLabel.get(row.label);
      if (existing) {
        existing.engagePrev = row.engage;
        existing.prevPrev = row.previsionnel;
      } else {
        byLabel.set(row.label, {
          label: row.label,
          engageY: 0,
          prevY: 0,
          engagePrev: row.engage,
          prevPrev: row.previsionnel,
        });
      }
    }

    const rows = [...byLabel.values()].sort(
      (a, b) =>
        b.engageY +
          b.prevY +
          b.engagePrev +
          b.prevPrev -
          (a.engageY + a.prevY + a.engagePrev + a.prevPrev) ||
        a.label.localeCompare(b.label, "fr"),
    );

    const chartData = rows.map((r) => ({
      label: r.label,
      [`engage_${y}`]: r.engageY,
      [`previsionnel_${y}`]: r.prevY,
      [`engage_${prev}`]: r.engagePrev,
      [`previsionnel_${prev}`]: r.prevPrev,
    }));

    const candidates = [
      {
        key: `engage_${y}`,
        label: `CA engagé · ${y}`,
        color: "var(--chart-2)",
        stackId: `y${y}`,
      },
      {
        key: `previsionnel_${y}`,
        label: `CA prévisionnel · ${y}`,
        color: "var(--chart-1)",
        stackId: `y${y}`,
      },
      {
        key: `engage_${prev}`,
        label: `CA engagé · ${prev}`,
        color: "color-mix(in oklab, var(--chart-2) 55%, white)",
        stackId: `y${prev}`,
      },
      {
        key: `previsionnel_${prev}`,
        label: `CA prévisionnel · ${prev}`,
        color: "color-mix(in oklab, var(--chart-1) 55%, white)",
        stackId: `y${prev}`,
      },
    ];

    const series = candidates.filter((s) =>
      chartData.some((row) => Number(row[s.key] ?? 0) > 0),
    );

    return { chartData, series };
  }, [data.caByTeamByYear, teamCompareYear]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-stretch">
        <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
          <div className="lg:min-h-0 lg:flex-1">
            <AnalysisKpiGrid
              className="sm:grid-cols-2 xl:grid-cols-2 lg:h-full"
              items={[
                {
                  label: `Total des sommes engagées${yearSuffix}`,
                  value: formatOpportunityPrice(data.kpis.sumPrice),
                },
                {
                  label: `Total des sommes pondérées${yearSuffix}`,
                  value: formatOpportunityPrice(data.kpis.sumAveragePrice),
                },
              ]}
            />
          </div>
          <Card className="flex flex-col lg:min-h-0 lg:flex-1">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="text-base">Objectif de CA</CardTitle>
              <div className="flex shrink-0 items-center gap-1.5">
                <IconActionButton
                  label="Ajouter un objectif"
                  onClick={openCreateRevenueAim}
                >
                  <StackPlus className="size-4" />
                </IconActionButton>
                <IconActionButton
                  label="Consulter les objectifs"
                  onClick={openConsultRevenueAims}
                >
                  <Eye className="size-4" />
                </IconActionButton>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col justify-center gap-2 lg:flex-1">
              <p className="text-sm text-muted-foreground">
                Année {pipelineYear}
              </p>
              {hasPipelineAim ? (
                <p className="text-2xl font-semibold tracking-tight">
                  {formatOpportunityPrice(pipelineAimAmount)}
                </p>
              ) : (
                <p className="text-sm" style={{ color: "#ff8f2e" }}>
                  Aucun objectif défini pour {pipelineYear}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <AnalysisBarChart
          className="h-full"
          title={`Comparaison par statut${yearSuffix}`}
          data={data.byStatus}
          layout="vertical"
          emptyMessage="Aucune opportunité pour l'année en cours."
        />
      </div>

      <div className="space-y-4">
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
          series={pipelineSeries}
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
        <AnalysisLineChart
          title="Comparaison de la pipeline avec l'année précédente"
          data={pipelineCompare.months}
          series={pipelineCompare.series}
          valueFormatter={(v) => formatOpportunityPrice(v)}
          axisTickFormatter={formatAxisEuro}
          headerAction={
            <AnalysisYearSelect
              years={years}
              value={pipelineCompareYear}
              onChange={setPipelineCompareYear}
            />
          }
        />
      </div>

      <div className="space-y-4">
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
          }
          headerSecondary={
            <ClientMultiSelect
              options={data.caClientOptions}
              value={selectedClients}
              onChange={setSelectedClients}
            />
          }
        />
        <AnalysisLineChart
          title="Comparaison du CA Client avec l'année précédente"
          data={clientCompare.months}
          series={clientCompare.series}
          height={320}
          valueFormatter={(v) => formatOpportunityPrice(v)}
          axisTickFormatter={formatAxisEuro}
          emptyMessage="Sélectionnez un client pour comparer le CA."
          headerAction={
            <AnalysisYearSelect
              years={years}
              value={clientCompareYear}
              onChange={setClientCompareYear}
            />
          }
          headerSecondary={
            <ClientMultiSelect
              options={data.caClientOptions}
              value={selectedCompareClients}
              onChange={setSelectedCompareClients}
            />
          }
        />
      </div>

      <div className="space-y-4">
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
        <AnalysisBarChart
          title="Comparaison du CA par pôle avec l'année précédente"
          data={teamCompare.chartData}
          series={teamCompare.series}
          layout="horizontal"
          showLegend
          valueFormatter={(v) => formatOpportunityPrice(v)}
          axisTickFormatter={formatAxisEuro}
          emptyMessage="Aucune donnée de CA par pôle pour ces années."
          headerAction={
            <AnalysisYearSelect
              years={years}
              value={teamCompareYear}
              onChange={setTeamCompareYear}
            />
          }
        />
      </div>
    </div>
  );
}
