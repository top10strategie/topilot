/** Pagination / filtres URL pour `/documents`. */

export const DOCUMENTS_PAGE_SIZE = 24;

/** Sentinelle URL / filtre : document sans lien client (ni jonction ni logo). */
export const DOCUMENTS_OWNER_INTERNE_ID = "__interne__";

export type DocumentsListFilters = {
  page: number;
  q: string;
  typeIds: string[];
  /** Vide = dernières versions uniquement ; sinon filtre sur ces numéros. */
  versions: number[];
  clientIds: string[];
};

export const DEFAULT_DOCUMENTS_LIST_FILTERS: DocumentsListFilters = {
  page: 1,
  q: "",
  typeIds: [],
  versions: [],
  clientIds: [],
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

function parseVersionList(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseClientIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Lit les searchParams Next (`Record` ou `URLSearchParams`).
 */
export function parseDocumentsListSearchParams(
  params:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): DocumentsListFilters {
  if (!params) {
    return { ...DEFAULT_DOCUMENTS_LIST_FILTERS };
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
    typeIds: parseUuidList(get("typeIds")),
    versions: parseVersionList(get("versions")),
    clientIds: parseClientIds(get("clientIds")),
  };
}

/** Query string sans `?` (omets les valeurs par défaut pour des URLs courtes). */
export function serializeDocumentsListSearchParams(
  filters: DocumentsListFilters | null | undefined,
): string {
  const value = filters ?? DEFAULT_DOCUMENTS_LIST_FILTERS;
  const sp = new URLSearchParams();
  if (value.page > 1) sp.set("page", String(value.page));
  if (value.q.trim()) sp.set("q", value.q.trim());
  if (value.typeIds.length > 0) {
    sp.set("typeIds", value.typeIds.join(","));
  }
  if (value.versions.length > 0) {
    sp.set("versions", value.versions.join(","));
  }
  if (value.clientIds.length > 0) {
    sp.set("clientIds", value.clientIds.join(","));
  }
  return sp.toString();
}

export function documentsListHref(filters: DocumentsListFilters): string {
  const qs = serializeDocumentsListSearchParams(filters);
  return qs ? `/documents?${qs}` : "/documents";
}
