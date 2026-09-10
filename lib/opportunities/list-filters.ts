/** Pagination / filtres URL pour `/opportunities`. */

import type {
  OpportunityKanbanStatus,
  OpportunityPriority,
} from "./types";

export const OPPORTUNITIES_PAGE_SIZE = 24;

export type OpportunitiesListView = "kanban" | "cards" | "table";

export type OpportunityAmountBucket = "all" | "lt5k" | "5to20k" | "gt20k";
export type OpportunityProbabilityBucket =
  | "all"
  | "lt30"
  | "30to50"
  | "gt50";

export type OpportunitiesListFilters = {
  page: number;
  q: string;
  view: OpportunitiesListView;
  clientId: string;
  responsibleId: string;
  teamId: string;
  categoryIds: string[];
  statuses: OpportunityKanbanStatus[];
  priority: OpportunityPriority | "";
  amountBucket: OpportunityAmountBucket;
  probabilityBucket: OpportunityProbabilityBucket;
  includeArchived: boolean;
};

export const DEFAULT_OPPORTUNITIES_LIST_FILTERS: OpportunitiesListFilters = {
  page: 1,
  q: "",
  view: "kanban",
  clientId: "",
  responsibleId: "",
  teamId: "",
  categoryIds: [],
  statuses: [],
  priority: "",
  amountBucket: "all",
  probabilityBucket: "all",
  includeArchived: false,
};

const VALID_STATUSES = new Set<OpportunityKanbanStatus>([
  "suspect",
  "prospect",
  "besoin_specifie",
  "proposition_envoyee",
  "gagne",
  "perdue",
]);

const VALID_PRIORITIES = new Set<OpportunityPriority>([
  "faible",
  "normal",
  "urgente",
  "prioritaire",
]);

const VALID_AMOUNT_BUCKETS = new Set<OpportunityAmountBucket>([
  "all",
  "lt5k",
  "5to20k",
  "gt20k",
]);

const VALID_PROBABILITY_BUCKETS = new Set<OpportunityProbabilityBucket>([
  "all",
  "lt30",
  "30to50",
  "gt50",
]);

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseUuidList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseStatuses(raw: string | undefined): OpportunityKanbanStatus[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is OpportunityKanbanStatus =>
      VALID_STATUSES.has(part as OpportunityKanbanStatus),
    );
}

function parseView(raw: string | undefined): OpportunitiesListView {
  if (raw === "cards" || raw === "table" || raw === "kanban") return raw;
  return DEFAULT_OPPORTUNITIES_LIST_FILTERS.view;
}

function parsePriority(raw: string | undefined): OpportunityPriority | "" {
  if (raw && VALID_PRIORITIES.has(raw as OpportunityPriority)) {
    return raw as OpportunityPriority;
  }
  return "";
}

function parseAmountBucket(
  raw: string | undefined,
): OpportunityAmountBucket {
  if (raw && VALID_AMOUNT_BUCKETS.has(raw as OpportunityAmountBucket)) {
    return raw as OpportunityAmountBucket;
  }
  return DEFAULT_OPPORTUNITIES_LIST_FILTERS.amountBucket;
}

function parseProbabilityBucket(
  raw: string | undefined,
): OpportunityProbabilityBucket {
  if (
    raw &&
    VALID_PROBABILITY_BUCKETS.has(raw as OpportunityProbabilityBucket)
  ) {
    return raw as OpportunityProbabilityBucket;
  }
  return DEFAULT_OPPORTUNITIES_LIST_FILTERS.probabilityBucket;
}

function parseIncludeArchived(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes"
  );
}

/**
 * Lit les searchParams Next (`Record` ou `URLSearchParams`).
 */
export function parseOpportunitiesListSearchParams(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): OpportunitiesListFilters {
  if (!params) {
    return { ...DEFAULT_OPPORTUNITIES_LIST_FILTERS };
  }

  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    return firstParam(params[key]);
  };

  const pageRaw = Number.parseInt(get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    page,
    q: (get("q") ?? "").trim(),
    view: parseView(get("view")),
    clientId: (get("clientId") ?? "").trim(),
    responsibleId: (get("responsibleId") ?? "").trim(),
    teamId: (get("teamId") ?? "").trim(),
    categoryIds: parseUuidList(get("categoryIds")),
    statuses: parseStatuses(get("statuses")),
    priority: parsePriority(get("priority")),
    amountBucket: parseAmountBucket(get("amountBucket")),
    probabilityBucket: parseProbabilityBucket(get("probabilityBucket")),
    includeArchived: parseIncludeArchived(get("includeArchived")),
  };
}

/** Query string sans `?` (omets les valeurs par défaut pour des URLs courtes). */
export function serializeOpportunitiesListSearchParams(
  filters: OpportunitiesListFilters | null | undefined,
): string {
  const value = filters ?? DEFAULT_OPPORTUNITIES_LIST_FILTERS;
  const sp = new URLSearchParams();
  if (value.page > 1) sp.set("page", String(value.page));
  if (value.q.trim()) sp.set("q", value.q.trim());
  if (value.view !== DEFAULT_OPPORTUNITIES_LIST_FILTERS.view) {
    sp.set("view", value.view);
  }
  if (value.clientId) sp.set("clientId", value.clientId);
  if (value.responsibleId) sp.set("responsibleId", value.responsibleId);
  if (value.teamId) sp.set("teamId", value.teamId);
  if (value.categoryIds.length > 0) {
    sp.set("categoryIds", value.categoryIds.join(","));
  }
  if (value.statuses.length > 0) {
    sp.set("statuses", value.statuses.join(","));
  }
  if (value.priority) sp.set("priority", value.priority);
  if (value.amountBucket !== DEFAULT_OPPORTUNITIES_LIST_FILTERS.amountBucket) {
    sp.set("amountBucket", value.amountBucket);
  }
  if (
    value.probabilityBucket !==
    DEFAULT_OPPORTUNITIES_LIST_FILTERS.probabilityBucket
  ) {
    sp.set("probabilityBucket", value.probabilityBucket);
  }
  if (value.includeArchived) sp.set("includeArchived", "1");
  return sp.toString();
}

export function opportunitiesListHref(
  filters: OpportunitiesListFilters,
): string {
  const qs = serializeOpportunitiesListSearchParams(filters);
  return qs ? `/opportunities?${qs}` : "/opportunities";
}
