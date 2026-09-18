/** Pagination / filtres URL pour `/missions`. */

import type { MissionKanbanStatus, MissionScope } from "./types";

export const MISSIONS_PAGE_SIZE = 24;

/** Colonnes kanban chargées en vague 1 (premier paint). */
export const MISSION_OPEN_KANBAN_STATUSES: MissionKanbanStatus[] = [
  "a_faire",
  "en_cours",
];

/** Colonnes kanban chargées en vague 2 (après affichage). */
export const MISSION_CLOSED_KANBAN_STATUSES: MissionKanbanStatus[] = [
  "terminee",
  "archivee",
];

export type MissionsListView = "kanban" | "cards" | "table";

export type MissionsListFilters = {
  page: number;
  q: string;
  view: MissionsListView;
  clientId: string;
  responsibleId: string;
  teamId: string;
  categoryIds: string[];
  scope: MissionScope | "";
  statuses: MissionKanbanStatus[];
  startFrom: string;
  startTo: string;
  endFrom: string;
  endTo: string;
  /** Opt-out des préférences catégories (URL `skipPreferredCategories=1`). */
  skipPreferredCategories: boolean;
};

export const DEFAULT_MISSIONS_LIST_FILTERS: MissionsListFilters = {
  page: 1,
  q: "",
  view: "kanban",
  clientId: "",
  responsibleId: "",
  teamId: "",
  categoryIds: [],
  scope: "",
  statuses: [],
  startFrom: "",
  startTo: "",
  endFrom: "",
  endTo: "",
  skipPreferredCategories: false,
};

const VALID_STATUSES = new Set<MissionKanbanStatus>([
  "a_faire",
  "en_cours",
  "terminee",
  "archivee",
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

function parseStatuses(raw: string | undefined): MissionKanbanStatus[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is MissionKanbanStatus =>
      VALID_STATUSES.has(part as MissionKanbanStatus),
    );
}

function parseView(raw: string | undefined): MissionsListView {
  if (raw === "cards" || raw === "table" || raw === "kanban") return raw;
  return DEFAULT_MISSIONS_LIST_FILTERS.view;
}

function parseScope(raw: string | undefined): MissionScope | "" {
  if (raw === "client" || raw === "interne") return raw;
  return "";
}

function parseSkipPreferredCategories(raw: string | undefined): boolean {
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
export function parseMissionsListSearchParams(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): MissionsListFilters {
  if (!params) {
    return { ...DEFAULT_MISSIONS_LIST_FILTERS };
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
    scope: parseScope(get("scope")),
    statuses: parseStatuses(get("statuses")),
    startFrom: (get("startFrom") ?? "").trim(),
    startTo: (get("startTo") ?? "").trim(),
    endFrom: (get("endFrom") ?? "").trim(),
    endTo: (get("endTo") ?? "").trim(),
    skipPreferredCategories: parseSkipPreferredCategories(
      get("skipPreferredCategories"),
    ),
  };
}

/** Query string sans `?` (omets les valeurs par défaut pour des URLs courtes). */
export function serializeMissionsListSearchParams(
  filters: MissionsListFilters | null | undefined,
): string {
  const value = filters ?? DEFAULT_MISSIONS_LIST_FILTERS;
  const sp = new URLSearchParams();
  if (value.page > 1) sp.set("page", String(value.page));
  if (value.q.trim()) sp.set("q", value.q.trim());
  if (value.view !== DEFAULT_MISSIONS_LIST_FILTERS.view) {
    sp.set("view", value.view);
  }
  if (value.clientId) sp.set("clientId", value.clientId);
  if (value.responsibleId) sp.set("responsibleId", value.responsibleId);
  if (value.teamId) sp.set("teamId", value.teamId);
  if (value.categoryIds.length > 0) {
    sp.set("categoryIds", value.categoryIds.join(","));
  }
  if (value.scope) sp.set("scope", value.scope);
  if (value.statuses.length > 0) {
    sp.set("statuses", value.statuses.join(","));
  }
  if (value.startFrom) sp.set("startFrom", value.startFrom);
  if (value.startTo) sp.set("startTo", value.startTo);
  if (value.endFrom) sp.set("endFrom", value.endFrom);
  if (value.endTo) sp.set("endTo", value.endTo);
  if (value.skipPreferredCategories) {
    sp.set("skipPreferredCategories", "1");
  }
  return sp.toString();
}

export function missionsListHref(filters: MissionsListFilters): string {
  const qs = serializeMissionsListSearchParams(filters);
  return qs ? `/missions?${qs}` : "/missions";
}

export function hasMissionsCategoryIdsParam(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): boolean {
  if (!params) return false;
  if (params instanceof URLSearchParams) {
    return params.has("categoryIds");
  }
  return params.categoryIds != null && params.categoryIds !== "";
}

/**
 * Kanban sans filtre statut explicite : ouverts d’abord, closes en 2ᵉ requête.
 */
export function shouldDeferClosedKanbanColumns(
  filters: MissionsListFilters,
): boolean {
  return filters.view === "kanban" && filters.statuses.length === 0;
}
