import {
  getMissionKanbanStatusLabel,
} from "@/lib/missions/labels";
import type { MissionKanbanStatus } from "@/lib/missions/types";
import {
  getOpportunityKanbanStatusLabel,
  OPPORTUNITY_KANBAN_STATUSES,
} from "@/lib/opportunities/labels";
import type { OpportunityKanbanStatus } from "@/lib/opportunities/types";
import { createClient } from "@/lib/supabase/server";
import { monthlyCentsFromPrice } from "@/lib/tools/pricing";
import type { ToolSubscriptionPlan } from "@/lib/tools/types";
import type {
  AnalysesPayload,
  ChartDatum,
  CostEvolutionPoint,
  CurrencyTotal,
  MissionKpis,
  OpportunityKpis,
  PipelineSeriesPoint,
} from "./types";
import { SUBSCRIPTION_ANALYSIS_START_YEAR } from "./types";

const PARIS_TZ = "Europe/Paris";

/** Statuts affichés dans Comparaison par statut (missions). */
const MISSION_STATUS_CHART: MissionKanbanStatus[] = [
  "a_faire",
  "en_cours",
  "terminee",
];

const MONTH_SHORT_FR = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
] as const;

type DateParts = { year: number; month: number; day: number };

function getParisParts(date: Date = new Date()): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Date calendaire `YYYY-MM-DD` (colonnes `date`). */
function partsFromDateOnly(
  value: string | null | undefined,
): DateParts | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

/** Instant timestamptz → parties calendaires Europe/Paris. */
function partsFromInstant(
  value: string | null | undefined,
): DateParts | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return getParisParts(d);
}

function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabelShort(month: number): string {
  return MONTH_SHORT_FR[month - 1] ?? String(month);
}

function emptyPipelineYear(): PipelineSeriesPoint[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: monthLabelShort(i + 1),
    entree: 0,
    gagnees: 0,
    perdues: 0,
  }));
}

type OppRow = {
  id: string;
  price: number | string | null;
  average_price: number | string | null;
  entry_average_price: number | string | null;
  kanban_status: OpportunityKanbanStatus;
  created_at: string;
  closed_at: string | null;
  collaborator_id: string;
  opportunity_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
};

type MissionRow = {
  id: string;
  kanban_status: MissionKanbanStatus;
  completed_at: string | null;
  created_at: string;
  start_at: string;
  end_at: string;
  collaborator_id: string;
};

type CollaboratorTeamRow = {
  id: string;
  team: { team_name: string } | null;
};

type ToolCostRow = {
  id: string;
  tool_name: string;
  tool_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
  tool_subscription: Array<{
    subscription_plan: ToolSubscriptionPlan;
    tool_subscription_price: Array<{
      currency: string;
      amount: number;
      valid_from: string;
      valid_to: string | null;
    }> | null;
  }> | null;
};

function toNum(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildOpportunityKpis(rows: OppRow[]): OpportunityKpis {
  const count = rows.length;
  const sumPrice = rows.reduce((s, r) => s + toNum(r.price), 0);
  const sumAveragePrice = rows.reduce((s, r) => s + toNum(r.average_price), 0);
  const won = rows.filter((r) => r.kanban_status === "gagne").length;
  return {
    count,
    sumPrice,
    sumAveragePrice,
    conversionRate: count === 0 ? 0 : won / count,
  };
}

function buildMissionKpis(rows: MissionRow[]): MissionKpis {
  return {
    count: rows.length,
    inProduction: rows.filter((r) => r.kanban_status === "en_cours").length,
    abandoned: rows.filter(
      (r) => r.kanban_status === "archivee" && !r.completed_at,
    ).length,
    completed: rows.filter((r) => Boolean(r.completed_at)).length,
  };
}

function countByStatusOpp(rows: OppRow[]): ChartDatum[] {
  const counts = new Map<OpportunityKanbanStatus, number>();
  for (const status of OPPORTUNITY_KANBAN_STATUSES) counts.set(status, 0);
  for (const row of rows) {
    counts.set(row.kanban_status, (counts.get(row.kanban_status) ?? 0) + 1);
  }
  return OPPORTUNITY_KANBAN_STATUSES.map((status) => ({
    key: status,
    label: getOpportunityKanbanStatusLabel(status),
    value: counts.get(status) ?? 0,
  }));
}

function countMissionStatusCurrentMonth(
  rows: MissionRow[],
  parisYear: number,
  parisMonth: number,
): ChartDatum[] {
  const counts = new Map<MissionKanbanStatus, number>();
  for (const status of MISSION_STATUS_CHART) counts.set(status, 0);

  for (const row of rows) {
    if (
      row.kanban_status !== "a_faire" &&
      row.kanban_status !== "en_cours" &&
      row.kanban_status !== "terminee"
    ) {
      continue;
    }
    const parts = partsFromDateOnly(row.end_at);
    if (!parts) continue;
    if (parts.year !== parisYear || parts.month !== parisMonth) continue;
    counts.set(row.kanban_status, (counts.get(row.kanban_status) ?? 0) + 1);
  }

  return MISSION_STATUS_CHART.map((status) => ({
    key: status,
    label: getMissionKanbanStatusLabel(status),
    value: counts.get(status) ?? 0,
  }));
}

function mapToSortedChart(
  map: Map<string, { label: string; value: number }>,
): ChartDatum[] {
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, value: v.value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));
}

/** Prix actif sur au moins un jour du mois calendaire. */
function priceCoversMonth(
  validFrom: string,
  validTo: string | null,
  year: number,
  month: number,
): boolean {
  const from = validFrom.slice(0, 10);
  const to = validTo ? validTo.slice(0, 10) : null;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  if (from > monthEnd) return false;
  if (to != null && to !== "" && to < monthStart) return false;
  return true;
}

/**
 * Charge et agrège les données pour `/analyses` et les widgets Home.
 */
export async function loadAnalysesPayload(): Promise<AnalysesPayload> {
  const supabase = await createClient();

  const [oppRes, missionRes, collabRes, toolsRes] = await Promise.all([
    supabase
      .from("opportunity")
      .select(
        `
        id,
        price,
        average_price,
        entry_average_price,
        kanban_status,
        created_at,
        closed_at,
        collaborator_id,
        opportunity_category (
          category:category_business!category_id ( id, label, is_private )
        )
      `,
      ),
    supabase
      .from("mission")
      .select(
        `
        id,
        kanban_status,
        completed_at,
        created_at,
        start_at,
        end_at,
        collaborator_id
      `,
      ),
    supabase.from("collaborator").select("id, team:team_id ( team_name )"),
    supabase
      .from("tool")
      .select(
        `
        id,
        tool_name,
        tool_category ( category:category_id ( id, label ) ),
        tool_subscription (
          subscription_plan,
          tool_subscription_price ( currency, amount, valid_from, valid_to )
        )
      `,
      ),
  ]);

  if (oppRes.error) {
    console.error("loadAnalysesPayload opportunities:", oppRes.error);
    throw new Error(oppRes.error.message);
  }
  if (missionRes.error) {
    console.error("loadAnalysesPayload missions:", missionRes.error);
    throw new Error(missionRes.error.message);
  }
  if (collabRes.error) {
    console.error("loadAnalysesPayload collaborators:", collabRes.error);
    throw new Error(collabRes.error.message);
  }
  if (toolsRes.error) {
    console.error("loadAnalysesPayload tools:", toolsRes.error);
    throw new Error(toolsRes.error.message);
  }

  const opportunities = (oppRes.data ?? []) as unknown as OppRow[];
  const missions = (missionRes.data ?? []) as unknown as MissionRow[];
  const collaborators = (collabRes.data ?? []) as unknown as CollaboratorTeamRow[];
  const tools = (toolsRes.data ?? []) as unknown as ToolCostRow[];

  const paris = getParisParts();
  const teamByCollaborator = new Map<string, string>();
  for (const c of collaborators) {
    teamByCollaborator.set(c.id, c.team?.team_name ?? "Sans pôle");
  }

  // —— Opportunités : CA par catégorie / pôle (gagne, price, closed_at) ——
  const yearSet = new Set<number>([paris.year]);
  const caByCategoryByYear = new Map<
    number,
    Map<string, { label: string; value: number }>
  >();
  const caByTeamByYear = new Map<number, Map<string, number>>();
  const pipelineByYear = new Map<number, PipelineSeriesPoint[]>();

  const ensurePipeline = (year: number) => {
    if (!pipelineByYear.has(year)) {
      pipelineByYear.set(year, emptyPipelineYear());
    }
    return pipelineByYear.get(year)!;
  };

  for (const row of opportunities) {
    const created = partsFromInstant(row.created_at);
    if (created) {
      yearSet.add(created.year);
      const series = ensurePipeline(created.year);
      series[created.month - 1]!.entree += toNum(row.entry_average_price);
    }

    const closed = partsFromDateOnly(row.closed_at);
    if (closed) {
      yearSet.add(closed.year);
      const series = ensurePipeline(closed.year);
      if (row.kanban_status === "gagne") {
        series[closed.month - 1]!.gagnees += toNum(row.price);
      } else if (row.kanban_status === "perdue") {
        series[closed.month - 1]!.perdues += toNum(row.price);
      }
    }

    if (row.kanban_status !== "gagne" || !closed) continue;

    const year = closed.year;
    const price = toNum(row.price);

    let catMap = caByCategoryByYear.get(year);
    if (!catMap) {
      catMap = new Map();
      caByCategoryByYear.set(year, catMap);
    }
    const cats = (row.opportunity_category ?? [])
      .map((l) => l.category)
      .filter((c): c is { id: string; label: string } => Boolean(c));
    if (cats.length === 0) {
      const prev = catMap.get("__none__");
      if (prev) prev.value += price;
      else catMap.set("__none__", { label: "Sans catégorie", value: price });
    } else {
      const share = price / cats.length;
      for (const cat of cats) {
        const prev = catMap.get(cat.id);
        if (prev) prev.value += share;
        else catMap.set(cat.id, { label: cat.label, value: share });
      }
    }

    let teamMap = caByTeamByYear.get(year);
    if (!teamMap) {
      teamMap = new Map();
      caByTeamByYear.set(year, teamMap);
    }
    const team = teamByCollaborator.get(row.collaborator_id) ?? "Sans pôle";
    teamMap.set(team, (teamMap.get(team) ?? 0) + price);
  }

  // Garantir une série pipeline vide pour l'année courante
  ensurePipeline(paris.year);

  const availableYears = [...yearSet].sort((a, b) => b - a);
  const defaultYear = paris.year;

  const caByCategoryRecord: Record<number, ChartDatum[]> = {};
  for (const [year, map] of caByCategoryByYear) {
    caByCategoryRecord[year] = mapToSortedChart(map).map((d) => ({
      ...d,
      value: Math.round(d.value * 100) / 100,
    }));
  }
  for (const year of availableYears) {
    if (!caByCategoryRecord[year]) caByCategoryRecord[year] = [];
  }

  const caByTeamRecord: Record<number, ChartDatum[]> = {};
  for (const [year, map] of caByTeamByYear) {
    caByTeamRecord[year] = [...map.entries()]
      .map(([label, value]) => ({ key: label, label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));
  }
  for (const year of availableYears) {
    if (!caByTeamRecord[year]) caByTeamRecord[year] = [];
  }

  const pipelineRecord: Record<number, PipelineSeriesPoint[]> = {};
  for (const [year, points] of pipelineByYear) {
    pipelineRecord[year] = points;
  }
  for (const year of availableYears) {
    if (!pipelineRecord[year]) pipelineRecord[year] = emptyPipelineYear();
  }

  // —— Missions ——
  const missionByTeamMap = new Map<string, number>();
  for (const row of missions) {
    const team = teamByCollaborator.get(row.collaborator_id) ?? "Sans pôle";
    missionByTeamMap.set(team, (missionByTeamMap.get(team) ?? 0) + 1);
  }
  const missionByTeam: ChartDatum[] = [...missionByTeamMap.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));

  // —— Abonnements ——
  const startYear = SUBSCRIPTION_ANALYSIS_START_YEAR;
  const years: number[] = [];
  for (let y = startYear; y <= paris.year; y++) years.push(y);

  const monthlyByCurrencyByMonth: Record<string, CurrencyTotal[]> = {};
  const costByToolByMonth: Record<string, ChartDatum[]> = {};
  const costByCategoryByMonth: Record<string, ChartDatum[]> = {};

  for (const year of years) {
    const maxMonth = year === paris.year ? paris.month : 12;
    for (let month = 1; month <= 12; month++) {
      const key = yearMonthKey(year, month);
      const currencyTotals = new Map<string, number>();
      const toolMonth = new Map<string, { label: string; value: number }>();
      const catMonth = new Map<string, { label: string; value: number }>();

      // Mois futurs (année courante) : séries vides
      if (month <= maxMonth) {
        for (const tool of tools) {
          let toolMonthly = 0;
          const categories = (tool.tool_category ?? [])
            .map((l) => l.category)
            .filter((c): c is { id: string; label: string } => Boolean(c));

          for (const sub of tool.tool_subscription ?? []) {
            for (const price of sub.tool_subscription_price ?? []) {
              if (
                !priceCoversMonth(
                  price.valid_from,
                  price.valid_to,
                  year,
                  month,
                )
              ) {
                continue;
              }
              const monthly = monthlyCentsFromPrice(
                price.amount,
                sub.subscription_plan,
              );
              const currency = price.currency.toUpperCase();
              currencyTotals.set(
                currency,
                (currencyTotals.get(currency) ?? 0) + monthly,
              );
              toolMonthly += monthly;

              if (categories.length === 0) {
                catMonth.set("__none__", {
                  label: "Sans catégorie",
                  value: (catMonth.get("__none__")?.value ?? 0) + monthly,
                });
              } else {
                const share = monthly / categories.length;
                for (const cat of categories) {
                  catMonth.set(cat.id, {
                    label: cat.label,
                    value: (catMonth.get(cat.id)?.value ?? 0) + share,
                  });
                }
              }
            }
          }

          if (toolMonthly > 0) {
            toolMonth.set(tool.id, {
              label: tool.tool_name,
              value: toolMonthly,
            });
          }
        }
      }

      monthlyByCurrencyByMonth[key] = [...currencyTotals.entries()]
        .map(([currency, amountCents]) => ({ currency, amountCents }))
        .sort((a, b) => a.currency.localeCompare(b.currency));

      costByToolByMonth[key] = mapToSortedChart(toolMonth).map((d) => ({
        ...d,
        value: Math.round(d.value),
      }));

      costByCategoryByMonth[key] = mapToSortedChart(catMonth).map((d) => ({
        ...d,
        value: Math.round(d.value),
      }));
    }
  }

  // Évolution des coûts par année : total mensuel toutes devises, une courbe / année
  const evolutionPoints: CostEvolutionPoint[] = Array.from(
    { length: 12 },
    (_, i) => {
      const month = i + 1;
      const values: Record<string, number> = {};
      for (const year of years) {
        if (year === paris.year && month > paris.month) {
          values[String(year)] = 0;
          continue;
        }
        const key = yearMonthKey(year, month);
        const totals = monthlyByCurrencyByMonth[key] ?? [];
        values[String(year)] = totals.reduce((s, t) => s + t.amountCents, 0);
      }
      return {
        month,
        label: monthLabelShort(month),
        values,
      };
    },
  );

  return {
    opportunities: {
      kpis: buildOpportunityKpis(opportunities),
      byStatus: countByStatusOpp(opportunities),
      availableYears,
      defaultYear,
      caByCategoryByYear: caByCategoryRecord,
      caByTeamByYear: caByTeamRecord,
      pipelineByYear: pipelineRecord,
    },
    missions: {
      kpis: buildMissionKpis(missions),
      byStatus: countMissionStatusCurrentMonth(
        missions,
        paris.year,
        paris.month,
      ),
      byTeam: missionByTeam,
    },
    subscriptions: {
      currentYear: paris.year,
      currentMonth: paris.month,
      startYear,
      years,
      monthlyByCurrencyByMonth,
      costByToolByMonth,
      costByCategoryByMonth,
      costEvolution: {
        years,
        points: evolutionPoints,
      },
    },
  };
}
