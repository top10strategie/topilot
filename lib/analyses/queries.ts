import {
  getMissionKanbanStatusLabel,
  MISSION_KANBAN_STATUSES,
} from "@/lib/missions/labels";
import type { MissionKanbanStatus } from "@/lib/missions/types";
import {
  getOpportunityKanbanStatusLabel,
  OPPORTUNITY_KANBAN_STATUSES,
} from "@/lib/opportunities/labels";
import type { OpportunityKanbanStatus } from "@/lib/opportunities/types";
import { createClient } from "@/lib/supabase/server";
import {
  isPriceActive,
  monthlyCentsFromPrice,
} from "@/lib/tools/pricing";
import type { ToolSubscriptionPlan } from "@/lib/tools/types";
import type {
  AnalysesPayload,
  ChartDatum,
  CurrencyTotal,
  MissionKpis,
  OpportunityKpis,
} from "./types";

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = iso.match(/^(\d{4}-\d{2})/);
    return m?.[1] ?? null;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

type OppRow = {
  id: string;
  price: number | string | null;
  average_price: number | string | null;
  kanban_status: OpportunityKanbanStatus;
  created_at: string;
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
  start_at: string | null;
  collaborator_id: string;
  mission_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
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

function countByStatusMission(rows: MissionRow[]): ChartDatum[] {
  const counts = new Map<MissionKanbanStatus, number>();
  for (const status of MISSION_KANBAN_STATUSES) counts.set(status, 0);
  for (const row of rows) {
    counts.set(row.kanban_status, (counts.get(row.kanban_status) ?? 0) + 1);
  }
  return MISSION_KANBAN_STATUSES.map((status) => ({
    key: status,
    label: getMissionKanbanStatusLabel(status),
    value: counts.get(status) ?? 0,
  }));
}

function countByCategory(
  links: Array<Array<{ category: { id: string; label: string } | null } | null> | null>,
): ChartDatum[] {
  const map = new Map<string, { label: string; value: number }>();
  for (const list of links) {
    for (const link of list ?? []) {
      const cat = link?.category;
      if (!cat) continue;
      const prev = map.get(cat.id);
      if (prev) prev.value += 1;
      else map.set(cat.id, { label: cat.label, value: 1 });
    }
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, value: v.value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));
}

function pipelineByMonth(
  dates: Array<string | null | undefined>,
  values?: number[],
): ChartDatum[] {
  const map = new Map<string, number>();
  dates.forEach((iso, index) => {
    const key = monthKey(iso);
    if (!key) return;
    const add = values ? (values[index] ?? 0) : 1;
    map.set(key, (map.get(key) ?? 0) + add);
  });
  return sortMonthKeys([...map.keys()]).map((key) => ({
    key,
    label: formatMonthLabel(key),
    value: map.get(key) ?? 0,
  }));
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
        kanban_status,
        created_at,
        collaborator_id,
        opportunity_category ( category:category_id ( id, label ) )
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
        collaborator_id,
        mission_category ( category:category_id ( id, label ) )
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

  const teamByCollaborator = new Map<string, string>();
  for (const c of collaborators) {
    teamByCollaborator.set(c.id, c.team?.team_name ?? "Sans pôle");
  }

  const oppByTeamMap = new Map<string, number>();
  for (const row of opportunities) {
    const team = teamByCollaborator.get(row.collaborator_id) ?? "Sans pôle";
    const amount = toNum(row.average_price) || toNum(row.price);
    oppByTeamMap.set(team, (oppByTeamMap.get(team) ?? 0) + amount);
  }
  const oppByTeam: ChartDatum[] = [...oppByTeamMap.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));

  const missionByTeamMap = new Map<string, number>();
  for (const row of missions) {
    const team = teamByCollaborator.get(row.collaborator_id) ?? "Sans pôle";
    missionByTeamMap.set(team, (missionByTeamMap.get(team) ?? 0) + 1);
  }
  const missionByTeam: ChartDatum[] = [...missionByTeamMap.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));

  // Abonnements — coûts actifs du mois (proratisés mensuels), par devise / outil / catégorie
  const currencyTotals = new Map<string, number>();
  const toolMonth = new Map<string, { label: string; value: number }>();
  const catMonth = new Map<string, { label: string; value: number }>();

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01`;

  for (const tool of tools) {
    let toolMonthly = 0;
    const categories = (tool.tool_category ?? [])
      .map((l) => l.category)
      .filter((c): c is { id: string; label: string } => Boolean(c));

    for (const sub of tool.tool_subscription ?? []) {
      for (const price of sub.tool_subscription_price ?? []) {
        if (!isPriceActive(price.valid_to)) continue;
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

        for (const cat of categories) {
          catMonth.set(cat.id, {
            label: cat.label,
            value: (catMonth.get(cat.id)?.value ?? 0) + monthly,
          });
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

  const monthlyByCurrency: CurrencyTotal[] = [...currencyTotals.entries()]
    .map(([currency, amountCents]) => ({ currency, amountCents }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const toChart = (
    map: Map<string, { label: string; value: number }>,
  ): ChartDatum[] =>
    [...map.entries()]
      .map(([key, v]) => ({ key, label: v.label, value: v.value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "fr"));

  // Evolution coûts catégories année : une barre par catégorie (total année)
  // + pipeline mensuel alternatif : on expose aussi une série mois pour l'année
  // Spec: "barres verticales dans le temps" — on groupe par mois de l'année courante
  // en répartissant le coût mensuel actif sur les mois >= valid_from
  const yearMonthKeys: string[] = [];
  for (let m = 1; m <= now.getMonth() + 1; m++) {
    yearMonthKeys.push(
      `${now.getFullYear()}-${String(m).padStart(2, "0")}`,
    );
  }
  const catYearSeries = new Map<string, number>();
  for (const tool of tools) {
    const categories = (tool.tool_category ?? [])
      .map((l) => l.category)
      .filter((c): c is { id: string; label: string } => Boolean(c));
    if (categories.length === 0) continue;

    for (const sub of tool.tool_subscription ?? []) {
      for (const price of sub.tool_subscription_price ?? []) {
        if (!isPriceActive(price.valid_to)) continue;
        const monthly = monthlyCentsFromPrice(
          price.amount,
          sub.subscription_plan,
        );
        const fromKey = monthKey(price.valid_from) ?? yearStart;
        for (const mk of yearMonthKeys) {
          if (mk < fromKey) continue;
          const share = monthly / categories.length;
          for (const cat of categories) {
            const seriesKey = `${mk}::${cat.label}`;
            catYearSeries.set(
              seriesKey,
              (catYearSeries.get(seriesKey) ?? 0) + share,
            );
          }
        }
      }
    }
  }

  // Pour le chart "évolution année", on agrège le total mensuel toutes catégories
  const costByCategoryYearMonthly: ChartDatum[] = yearMonthKeys.map((key) => {
    let total = 0;
    for (const [seriesKey, value] of catYearSeries) {
      if (seriesKey.startsWith(`${key}::`)) total += value;
    }
    return { key, label: formatMonthLabel(key), value: Math.round(total) };
  });

  return {
    opportunities: {
      kpis: buildOpportunityKpis(opportunities),
      byStatus: countByStatusOpp(opportunities),
      byCategory: countByCategory(
        opportunities.map((o) => o.opportunity_category),
      ),
      byTeam: oppByTeam,
      pipeline: pipelineByMonth(
        opportunities.map((o) => o.created_at),
        opportunities.map((o) => toNum(o.average_price) || toNum(o.price)),
      ),
    },
    missions: {
      kpis: buildMissionKpis(missions),
      byStatus: countByStatusMission(missions),
      byCategory: countByCategory(missions.map((m) => m.mission_category)),
      byTeam: missionByTeam,
      pipeline: pipelineByMonth(
        missions.map((m) => m.start_at ?? m.created_at),
      ),
    },
    subscriptions: {
      monthlyByCurrency,
      costByToolMonth: toChart(toolMonth).map((d) => ({
        ...d,
        value: Math.round(d.value),
      })),
      costByCategoryMonth: toChart(catMonth).map((d) => ({
        ...d,
        value: Math.round(d.value),
      })),
      costByCategoryYear: costByCategoryYearMonthly,
    },
  };
}
