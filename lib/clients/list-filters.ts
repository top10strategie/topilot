/** Pagination / filtres URL pour `/clients`. */

export const CLIENTS_PAGE_SIZE = 24;

export type ClientsListStatus = "active" | "inactive" | "all";
export type ClientsMissionBucket = "all" | "lt5" | "5to20" | "gt20";

export type ClientsListFilters = {
  page: number;
  q: string;
  status: ClientsListStatus;
  responsibleId: string;
  teamId: string;
  city: string;
  categoryIds: string[];
  missionBucket: ClientsMissionBucket;
};

export const DEFAULT_CLIENTS_LIST_FILTERS: ClientsListFilters = {
  page: 1,
  q: "",
  status: "active",
  responsibleId: "",
  teamId: "",
  city: "",
  categoryIds: [],
  missionBucket: "all",
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseStatus(raw: string | undefined): ClientsListStatus {
  if (raw === "inactive" || raw === "all" || raw === "active") return raw;
  return DEFAULT_CLIENTS_LIST_FILTERS.status;
}

function parseMissionBucket(raw: string | undefined): ClientsMissionBucket {
  if (raw === "lt5" || raw === "5to20" || raw === "gt20" || raw === "all") {
    return raw;
  }
  return DEFAULT_CLIENTS_LIST_FILTERS.missionBucket;
}

function parseUuidList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Lit les searchParams Next (`Record` ou `URLSearchParams`).
 */
export function parseClientsListSearchParams(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
): ClientsListFilters {
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
    status: parseStatus(get("status")),
    responsibleId: (get("responsibleId") ?? "").trim(),
    teamId: (get("teamId") ?? "").trim(),
    city: (get("city") ?? "").trim(),
    categoryIds: parseUuidList(get("categoryIds")),
    missionBucket: parseMissionBucket(get("missionBucket")),
  };
}

/** Query string sans `?` (omets les valeurs par défaut pour des URLs courtes). */
export function serializeClientsListSearchParams(
  filters: ClientsListFilters,
): string {
  const sp = new URLSearchParams();
  if (filters.page > 1) sp.set("page", String(filters.page));
  if (filters.q.trim()) sp.set("q", filters.q.trim());
  if (filters.status !== DEFAULT_CLIENTS_LIST_FILTERS.status) {
    sp.set("status", filters.status);
  }
  if (filters.responsibleId) sp.set("responsibleId", filters.responsibleId);
  if (filters.teamId) sp.set("teamId", filters.teamId);
  if (filters.city) sp.set("city", filters.city);
  if (filters.categoryIds.length > 0) {
    sp.set("categoryIds", filters.categoryIds.join(","));
  }
  if (filters.missionBucket !== DEFAULT_CLIENTS_LIST_FILTERS.missionBucket) {
    sp.set("missionBucket", filters.missionBucket);
  }
  return sp.toString();
}

export function clientsListHref(filters: ClientsListFilters): string {
  const qs = serializeClientsListSearchParams(filters);
  return qs ? `/clients?${qs}` : "/clients";
}
