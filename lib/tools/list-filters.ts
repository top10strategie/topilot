/** Pagination / filtres URL pour `/tools`. */

export const TOOLS_PAGE_SIZE = 24;

/** Sentinelle URL / filtre : outil sans client lié (`client_tool` vide). */
export const TOOLS_OWNER_INTERNE_ID = "__interne__";

export type ToolsCostBucket = "all" | "lt10" | "10to20" | "gt20";

export type ToolsListFilters = {
  page: number;
  q: string;
  categoryIds: string[];
  clientIds: string[];
  costBucket: ToolsCostBucket;
  withSubscription: boolean;
  withoutSubscription: boolean;
};

export const DEFAULT_TOOLS_LIST_FILTERS: ToolsListFilters = {
  page: 1,
  q: "",
  categoryIds: [],
  clientIds: [],
  costBucket: "all",
  withSubscription: false,
  withoutSubscription: false,
};

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

function parseClientIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCostBucket(raw: string | undefined): ToolsCostBucket {
  if (raw === "lt10" || raw === "10to20" || raw === "gt20" || raw === "all") {
    return raw;
  }
  return DEFAULT_TOOLS_LIST_FILTERS.costBucket;
}

function parseFlag(raw: string | undefined): boolean {
  return raw === "1" || raw === "true";
}

/**
 * Lit les searchParams Next (`Record` ou `URLSearchParams`).
 */
export function parseToolsListSearchParams(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): ToolsListFilters {
  if (!params) {
    return { ...DEFAULT_TOOLS_LIST_FILTERS };
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
    categoryIds: parseUuidList(get("categoryIds")),
    clientIds: parseClientIds(get("clientIds")),
    costBucket: parseCostBucket(get("costBucket")),
    withSubscription: parseFlag(get("withSubscription")),
    withoutSubscription: parseFlag(get("withoutSubscription")),
  };
}

/** Query string sans `?` (omets les valeurs par défaut pour des URLs courtes). */
export function serializeToolsListSearchParams(
  filters: ToolsListFilters | null | undefined,
): string {
  const value = filters ?? DEFAULT_TOOLS_LIST_FILTERS;
  const sp = new URLSearchParams();
  if (value.page > 1) sp.set("page", String(value.page));
  if (value.q.trim()) sp.set("q", value.q.trim());
  if (value.categoryIds.length > 0) {
    sp.set("categoryIds", value.categoryIds.join(","));
  }
  if (value.clientIds.length > 0) {
    sp.set("clientIds", value.clientIds.join(","));
  }
  if (value.costBucket !== DEFAULT_TOOLS_LIST_FILTERS.costBucket) {
    sp.set("costBucket", value.costBucket);
  }
  if (value.withSubscription) sp.set("withSubscription", "1");
  if (value.withoutSubscription) sp.set("withoutSubscription", "1");
  return sp.toString();
}

export function toolsListHref(filters: ToolsListFilters): string {
  const qs = serializeToolsListSearchParams(filters);
  return qs ? `/tools?${qs}` : "/tools";
}
