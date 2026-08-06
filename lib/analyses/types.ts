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

/** Point mensuel (Jan→Déc) pour le pipeline opportunités multi-courbes. */
export type PipelineSeriesPoint = {
  month: number;
  label: string;
  entree: number;
  gagnees: number;
  perdues: number;
};

export type OpportunitiesAnalysis = {
  kpis: OpportunityKpis;
  byStatus: ChartDatum[];
  /** Années disponibles (closed_at / created_at), tri desc. */
  availableYears: number[];
  defaultYear: number;
  /** CA gagné (`price`) par catégorie métier, indexé par année de `closed_at`. */
  caByCategoryByYear: Record<number, ChartDatum[]>;
  /** CA gagné (`price`) par pôle, indexé par année de `closed_at`. */
  caByTeamByYear: Record<number, ChartDatum[]>;
  /** Pipeline commercial multi-séries, indexé par année. */
  pipelineByYear: Record<number, PipelineSeriesPoint[]>;
};

export type MissionsAnalysis = {
  kpis: MissionKpis;
  /** Statuts a_faire|en_cours|terminee, missions dont `end_at` ∈ mois calendaire Paris. */
  byStatus: ChartDatum[];
  byTeam: ChartDatum[];
};

/** Première année affichée pour les graphiques abonnements. */
export const SUBSCRIPTION_ANALYSIS_START_YEAR = 2025;

/** Point Jan→Déc pour l’évolution multi-années des coûts abonnements. */
export type CostEvolutionPoint = {
  month: number;
  label: string;
  /** Clé = année (string), valeur = centimes totaux toutes devises. */
  values: Record<string, number>;
};

export type SubscriptionsAnalysis = {
  currentYear: number;
  currentMonth: number;
  startYear: number;
  years: number[];
  /** Dépenses du mois par devise, clé `YYYY-MM`. */
  monthlyByCurrencyByMonth: Record<string, CurrencyTotal[]>;
  /** Coût par outil, clé `YYYY-MM`. */
  costByToolByMonth: Record<string, ChartDatum[]>;
  /** Coût par catégorie outil, clé `YYYY-MM`. */
  costByCategoryByMonth: Record<string, ChartDatum[]>;
  /** Une courbe par année (2025 → année courante). */
  costEvolution: {
    years: number[];
    points: CostEvolutionPoint[];
  };
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
  "opp_ca_by_category",
  "mission_by_status",
  "tools_monthly_spend",
  "opp_pipeline",
  "opp_by_team",
  "tools_category_year",
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
  kanban_opportunities: "Kanban des opportunités",
  kanban_missions: "Kanban des missions",
  kpi_opportunities: "Résumé des chiffres des opportunités",
  kpi_missions: "Résumé des chiffres des missions",
  opp_by_status: "Opportunités - comparaison par statut",
  opp_ca_by_category: "Opportunités - comparaison CA par catégorie",
  mission_by_status: "Missions - comparaison par statut",
  tools_monthly_spend: "Tools - dépenses du mois",
  opp_pipeline: "Opportunités - évolution du pipeline Commercial",
  opp_by_team: "Opportunités - comparaison CA par pôle",
  tools_category_year: "Tools - évolution des coûts par année",
};

export function isHomeWidgetId(value: string): value is HomeWidgetId {
  return (HOME_WIDGET_IDS as readonly string[]).includes(value);
}

/** Widgets autorisés pour le rôle Collaborateur (Home). */
export const COLLABORATOR_HOME_WIDGET_IDS = [
  "kanban_opportunities",
  "kanban_missions",
] as const satisfies readonly HomeWidgetId[];

export function isCollaboratorHomeWidgetId(
  value: string,
): value is (typeof COLLABORATOR_HOME_WIDGET_IDS)[number] {
  return (COLLABORATOR_HOME_WIDGET_IDS as readonly string[]).includes(value);
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
      "opp_ca_by_category",
      "opp_pipeline",
      "opp_by_team",
    ],
  },
  {
    label: "Missions",
    ids: ["mission_by_status"],
  },
  {
    label: "Tools",
    ids: ["tools_monthly_spend", "tools_category_year"],
  },
];
