import type { AnalysesPayload } from "./types";
import { SUBSCRIPTION_ANALYSIS_START_YEAR } from "./types";

const PARIS_TZ = "Europe/Paris";

function currentParisYearMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value ?? NaN);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? NaN);
  return { year, month };
}

/** Payload analyses vide (Home sans widgets analytiques). */
export function emptyAnalysesPayload(): AnalysesPayload {
  const { year, month } = currentParisYearMonth();
  return {
    opportunities: {
      kpis: {
        count: 0,
        sumPrice: 0,
        sumAveragePrice: 0,
        conversionRate: 0,
      },
      byStatus: [],
      availableYears: [year],
      defaultYear: year,
      caByCategoryByYear: {},
      caByTeamByYear: {},
      pipelineByYear: {},
    },
    missions: {
      kpis: {
        count: 0,
        inProduction: 0,
        abandoned: 0,
        completed: 0,
      },
      byStatus: [],
      byTeam: [],
    },
    subscriptions: {
      currentYear: year,
      currentMonth: month,
      startYear: SUBSCRIPTION_ANALYSIS_START_YEAR,
      years: [year],
      monthlyByCurrencyByMonth: {},
      costByToolByMonth: {},
      costByCategoryByMonth: {},
      costEvolution: { years: [year], points: [] },
    },
  };
}
