export type ChartDatum = {
  key: string;
  label: string;
  value: number;
};

export type OpportunityKpis = {
  count: number;
  sumPrice: number;
  sumAveragePrice: number;
  conversionRate: number;
};

export type MissionKpis = {
  count: number;
  inProduction: number;
  abandoned: number;
  completed: number;
};

export type CurrencyTotal = {
  currency: string;
  amountCents: number;
};

export type OpportunitiesAnalysis = {
  kpis: OpportunityKpis;
  byStatus: ChartDatum[];
  byCategory: ChartDatum[];
  byTeam: ChartDatum[];
  pipeline: ChartDatum[];
};

export type MissionsAnalysis = {
  kpis: MissionKpis;
  byStatus: ChartDatum[];
  byCategory: ChartDatum[];
  byTeam: ChartDatum[];
  pipeline: ChartDatum[];
};

export type SubscriptionsAnalysis = {
  monthlyByCurrency: CurrencyTotal[];
  costByToolMonth: ChartDatum[];
  costByCategoryMonth: ChartDatum[];
  costByCategoryYear: ChartDatum[];
};

export type AnalysesPayload = {
  opportunities: OpportunitiesAnalysis;
  missions: MissionsAnalysis;
  subscriptions: SubscriptionsAnalysis;
};

/** Identifiants catalogue Home (ordre métier figé). */
export const HOME_WIDGET_IDS = [
  "kanban_opportunities",
  "kanban_missions",
  "kpi_opportunities",
  "kpi_missions",
  "opp_by_status",
  "opp_by_category",
  "mission_by_status",
  "mission_by_category",
  "tools_monthly_spend",
  "opp_pipeline",
  "opp_by_team",
  "mission_pipeline",
  "tools_category_year",
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
  kanban_opportunities: "Kanban des opportunités",
  kanban_missions: "Kanban des missions",
  kpi_opportunities: "Résumé des chiffres des opportunités",
  kpi_missions: "Résumé des chiffres des missions",
  opp_by_status: "Opportunités - comparaison par statut",
  opp_by_category: "Opportunités - comparaison par catégories",
  mission_by_status: "Missions - comparaison par statut",
  mission_by_category: "Missions - comparaison par catégories",
  tools_monthly_spend: "Tools - dépenses du mois",
  opp_pipeline: "Opportunités - évolution du pipeline Commercial",
  opp_by_team: "Opportunités - comparaison CA par pôle",
  mission_pipeline: "Missions - évolution du pipeline Produit",
  tools_category_year: "Tools - évolution des coûts par Catégories - année",
};

export function isHomeWidgetId(value: string): value is HomeWidgetId {
  return (HOME_WIDGET_IDS as readonly string[]).includes(value);
}

/** Groupes d’affichage pour la modale de sélection Home. */
export const HOME_WIDGET_GROUPS: Array<{
  label: string;
  ids: readonly HomeWidgetId[];
}> = [
  {
    label: "Kanban",
    ids: ["kanban_opportunities", "kanban_missions"],
  },
  {
    label: "Résumé",
    ids: ["kpi_opportunities", "kpi_missions"],
  },
  {
    label: "Opportunités",
    ids: [
      "opp_by_status",
      "opp_by_category",
      "opp_pipeline",
      "opp_by_team",
    ],
  },
  {
    label: "Missions",
    ids: [
      "mission_by_status",
      "mission_by_category",
      "mission_pipeline",
    ],
  },
  {
    label: "Tools",
    ids: ["tools_monthly_spend", "tools_category_year"],
  },
];
