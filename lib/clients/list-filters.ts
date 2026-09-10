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
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): ClientsListFilters {
  if (!params) {
    return { ...DEFAULT_CLIENTS_LIST_FILTERS };
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
  filters: ClientsListFilters | null | undefined,
): string {
  const value = filters ?? DEFAULT_CLIENTS_LIST_FILTERS;
  const sp = new URLSearchParams();
  if (value.page > 1) sp.set("page", String(value.page));
  if (value.q.trim()) sp.set("q", value.q.trim());
  if (value.status !== DEFAULT_CLIENTS_LIST_FILTERS.status) {
    sp.set("status", value.status);
  }
  if (value.responsibleId) sp.set("responsibleId", value.responsibleId);
  if (value.teamId) sp.set("teamId", value.teamId);
  if (value.city) sp.set("city", value.city);
  if (value.categoryIds.length > 0) {
    sp.set("categoryIds", value.categoryIds.join(","));
  }
  if (value.missionBucket !== DEFAULT_CLIENTS_LIST_FILTERS.missionBucket) {
    sp.set("missionBucket", value.missionBucket);
  }
  return sp.toString();
}

export function clientsListHref(filters: ClientsListFilters): string {
  const qs = serializeClientsListSearchParams(filters);
  return qs ? `/clients?${qs}` : "/clients";
}
