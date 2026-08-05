import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import type {
  AuditContactOption,
  AuditEntityRef,
  AuditEntityScope,
  AuditEntityType,
  AuditHistoryPageFilters,
  AuditLogListItem,
} from "./types";

type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  collaborator: {
    first_name: string;
    last_name: string;
  } | null;
};

function mapRow(row: AuditLogRow): AuditLogListItem {
  return {
    id: row.id,
    created_at: row.created_at,
    action: row.action as AuditLogListItem["action"],
    entity_type: row.entity_type as AuditEntityType,
    entity_id: row.entity_id,
    collaborator_first_name: row.collaborator?.first_name ?? null,
    collaborator_last_name: row.collaborator?.last_name ?? null,
  };
}

async function fetchIds(
  table: string,
  column: string,
  value: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select("id").eq(column, value);
  if (error) {
    console.error(`audit fetchIds ${table}:`, error);
    throw new Error(`Impossible de résoudre les liens audit (${table}).`);
  }
  return (data ?? []).map((row) => row.id as string);
}

async function fetchColumnValues(
  table: string,
  selectColumn: string,
  filterColumn: string,
  value: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select(selectColumn)
    .eq(filterColumn, value)
    .not(selectColumn, "is", null);
  if (error) {
    console.error(`audit fetchColumnValues ${table}:`, error);
    throw new Error(`Impossible de résoudre les liens audit (${table}).`);
  }
  return (data ?? [])
    .map((row) => {
      const record = row as unknown as Record<string, string | null>;
      return record[selectColumn];
    })
    .filter((id): id is string => Boolean(id));
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(isUuid))];
}

/**
 * Liste les contacts (filtre page historique).
 */
export async function listAuditContactOptions(): Promise<AuditContactOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_client")
    .select(
      "id, first_name, last_name, client:client_id ( client_name )",
    )
    .order("last_name", { ascending: true });

  if (error) {
    console.error("listAuditContactOptions:", error);
    throw new Error("Impossible de charger les contacts.");
  }

  return (data ?? []).map((row) => {
    const raw = row as unknown as {
      id: string;
      first_name: string;
      last_name: string;
      client: { client_name: string } | { client_name: string }[] | null;
    };
    const client = Array.isArray(raw.client) ? raw.client[0] : raw.client;
    return {
      id: raw.id,
      first_name: raw.first_name,
      last_name: raw.last_name,
      client_name: client?.client_name ?? "—",
    };
  });
}

async function resolveClientRelatedRefs(
  clientId: string,
): Promise<AuditEntityRef[]> {
  const supabase = await createClient();
  const [
    missionIds,
    opportunityIds,
    contactIds,
    documentIds,
    clientToolIds,
    accessToolIds,
  ] = await Promise.all([
    fetchIds("mission", "client_id", clientId),
    fetchIds("opportunity", "client_id", clientId),
    fetchIds("contact_client", "client_id", clientId),
    fetchColumnValues("client_document", "document_id", "client_id", clientId),
    fetchColumnValues("client_tool", "tool_id", "client_id", clientId),
    fetchColumnValues("tool_access", "tool_id", "client_id", clientId),
  ]);

  const toolIds = uniqueIds([...clientToolIds, ...accessToolIds]);

  const refs: AuditEntityRef[] = [
    { entity_type: "client", entity_id: clientId },
    ...missionIds.map((id) => ({
      entity_type: "mission" as const,
      entity_id: id,
    })),
    ...opportunityIds.map((id) => ({
      entity_type: "opportunity" as const,
      entity_id: id,
    })),
    ...contactIds.map((id) => ({
      entity_type: "contact_client" as const,
      entity_id: id,
    })),
    ...documentIds.map((id) => ({
      entity_type: "document" as const,
      entity_id: id,
    })),
    ...toolIds.map((id) => ({
      entity_type: "tool" as const,
      entity_id: id,
    })),
  ];

  // Accès outils liés au client (entity_id = tool_access.id)
  const { data: accesses, error: accessError } = await supabase
    .from("tool_access")
    .select("id")
    .eq("client_id", clientId);
  if (accessError) {
    console.error("resolveClientRelatedRefs tool_access:", accessError);
  } else {
    for (const row of accesses ?? []) {
      refs.push({ entity_type: "tool_access", entity_id: row.id as string });
    }
  }

  return refs;
}

async function resolveOpportunityRelatedRefs(
  opportunityId: string,
): Promise<AuditEntityRef[]> {
  const [missionIds, documentIds, toolIds] = await Promise.all([
    fetchIds("mission", "opportunity_id", opportunityId),
    fetchColumnValues(
      "opportunity_document",
      "document_id",
      "opportunity_id",
      opportunityId,
    ),
    fetchColumnValues(
      "opportunity_tool",
      "tool_id",
      "opportunity_id",
      opportunityId,
    ),
  ]);

  return [
    { entity_type: "opportunity", entity_id: opportunityId },
    ...missionIds.map((id) => ({
      entity_type: "mission" as const,
      entity_id: id,
    })),
    ...documentIds.map((id) => ({
      entity_type: "document" as const,
      entity_id: id,
    })),
    ...toolIds.map((id) => ({
      entity_type: "tool" as const,
      entity_id: id,
    })),
  ];
}

async function resolveMissionRelatedRefs(
  missionId: string,
  seriesId?: string | null,
): Promise<AuditEntityRef[]> {
  const [documentIds, toolIds, wikiIds] = await Promise.all([
    fetchColumnValues("mission_document", "document_id", "mission_id", missionId),
    fetchColumnValues("mission_tool", "tool_id", "mission_id", missionId),
    fetchColumnValues("mission_wiki", "wiki_id", "mission_id", missionId),
  ]);

  const refs: AuditEntityRef[] = [
    { entity_type: "mission", entity_id: missionId },
    ...documentIds.map((id) => ({
      entity_type: "document" as const,
      entity_id: id,
    })),
    ...toolIds.map((id) => ({
      entity_type: "tool" as const,
      entity_id: id,
    })),
    ...wikiIds.map((id) => ({
      entity_type: "wiki" as const,
      entity_id: id,
    })),
  ];

  if (seriesId && isUuid(seriesId)) {
    refs.push({ entity_type: "mission_series", entity_id: seriesId });
  }

  return refs;
}

async function resolveToolRelatedRefs(toolId: string): Promise<AuditEntityRef[]> {
  const supabase = await createClient();
  const refs: AuditEntityRef[] = [{ entity_type: "tool", entity_id: toolId }];

  const { data: accesses, error: accessError } = await supabase
    .from("tool_access")
    .select("id")
    .eq("tool_id", toolId);
  if (accessError) {
    console.error("resolveToolRelatedRefs tool_access:", accessError);
    throw new Error("Impossible de charger les accès outil pour l'historique.");
  }
  for (const row of accesses ?? []) {
    refs.push({ entity_type: "tool_access", entity_id: row.id as string });
  }

  const { data: subscriptions, error: subError } = await supabase
    .from("tool_subscription")
    .select("id")
    .eq("tool_id", toolId);
  if (subError) {
    console.error("resolveToolRelatedRefs tool_subscription:", subError);
    throw new Error(
      "Impossible de charger les abonnements outil pour l'historique.",
    );
  }

  const subscriptionIds = (subscriptions ?? []).map((row) => row.id as string);
  for (const id of subscriptionIds) {
    refs.push({ entity_type: "tool_subscription", entity_id: id });
  }

  if (subscriptionIds.length > 0) {
    const { data: prices, error: priceError } = await supabase
      .from("tool_subscription_price")
      .select("id")
      .in("tool_subscription_id", subscriptionIds);
    if (priceError) {
      console.error("resolveToolRelatedRefs prices:", priceError);
      throw new Error("Impossible de charger les prix d'abonnement.");
    }
    for (const row of prices ?? []) {
      refs.push({
        entity_type: "tool_subscription_price",
        entity_id: row.id as string,
      });
    }
  }

  return refs;
}

export async function resolveAuditEntityScope(
  scope: AuditEntityScope,
): Promise<AuditEntityRef[] | { entityTypesOnly: AuditEntityType[] }> {
  switch (scope.kind) {
    case "client":
      return resolveClientRelatedRefs(scope.clientId);
    case "opportunity":
      return resolveOpportunityRelatedRefs(scope.opportunityId);
    case "mission":
      return resolveMissionRelatedRefs(scope.missionId, scope.seriesId);
    case "tool":
      return resolveToolRelatedRefs(scope.toolId);
    case "documents":
      return { entityTypesOnly: ["document"] };
    case "wikis":
      return { entityTypesOnly: ["wiki"] };
  }
}

async function queryAuditLogs(options: {
  refs?: AuditEntityRef[];
  entityTypes?: AuditEntityType[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<AuditLogListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select(
      `
      id,
      created_at,
      action,
      entity_type,
      entity_id,
      collaborator:collaborator_id ( first_name, last_name )
    `,
    )
    .in("action", ["INSERT", "DELETE"])
    .order("created_at", { ascending: false });

  if (options.dateFrom) {
    query = query.gte("created_at", `${options.dateFrom}T00:00:00.000Z`);
  }
  if (options.dateTo) {
    query = query.lte("created_at", `${options.dateTo}T23:59:59.999Z`);
  }

  if (options.entityTypes && options.entityTypes.length > 0) {
    query = query.in("entity_type", options.entityTypes);
  }

  if (options.refs && options.refs.length > 0) {
    // PostgREST : or=(and(entity_type.eq.x,entity_id.eq.y),...)
    const orFilter = options.refs
      .map(
        (ref) =>
          `and(entity_type.eq.${ref.entity_type},entity_id.eq.${ref.entity_id})`,
      )
      .join(",");
    query = query.or(orFilter);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(500);
  }

  const { data, error } = await query;
  if (error) {
    console.error("queryAuditLogs:", error);
    throw new Error(`Impossible de charger l'historique : ${error.message}`);
  }

  return ((data ?? []) as unknown as AuditLogRow[]).map(mapRow);
}

/**
 * Construit les refs / types pour les filtres de la page Historique.
 */
async function buildPageFilterTarget(
  filters: AuditHistoryPageFilters,
): Promise<
  | { kind: "all" }
  | { kind: "refs"; refs: AuditEntityRef[] }
  | { kind: "types"; entityTypes: AuditEntityType[] }
> {
  const focusMissions = Boolean(filters.focusMissions);
  const focusOpportunities = Boolean(filters.focusOpportunities);
  const focusRecurrences = Boolean(filters.focusRecurrences);
  const hasFocus = focusMissions || focusOpportunities || focusRecurrences;

  const clientId =
    filters.clientId && isUuid(filters.clientId) ? filters.clientId : undefined;
  const contactId =
    filters.contactId && isUuid(filters.contactId)
      ? filters.contactId
      : undefined;
  const categoryId =
    filters.categoryId && isUuid(filters.categoryId)
      ? filters.categoryId
      : undefined;
  const toolId =
    filters.toolId && isUuid(filters.toolId) ? filters.toolId : undefined;

  if (hasFocus) {
    if (!clientId) {
      const types: AuditEntityType[] = [];
      if (focusMissions) types.push("mission");
      if (focusOpportunities) types.push("opportunity");
      if (focusRecurrences) types.push("mission_series");
      return { kind: "types", entityTypes: types };
    }

    const refs: AuditEntityRef[] = [];

    if (focusMissions) {
      const ids = await fetchIds("mission", "client_id", clientId);
      for (const id of ids) {
        refs.push({ entity_type: "mission", entity_id: id });
      }
    }
    if (focusOpportunities) {
      const ids = await fetchIds("opportunity", "client_id", clientId);
      for (const id of ids) {
        refs.push({ entity_type: "opportunity", entity_id: id });
      }
    }
    if (focusRecurrences) {
      const seriesIds = uniqueIds(
        await fetchColumnValues("mission", "series_id", "client_id", clientId),
      );
      for (const id of seriesIds) {
        refs.push({ entity_type: "mission_series", entity_id: id });
      }
    }

    if (contactId) {
      refs.push({ entity_type: "contact_client", entity_id: contactId });
    }
    if (categoryId) {
      refs.push({ entity_type: "category", entity_id: categoryId });
    }
    if (toolId) {
      refs.push({ entity_type: "tool", entity_id: toolId });
    }

    return { kind: "refs", refs };
  }

  const exactRefs: AuditEntityRef[] = [];
  if (clientId) {
    exactRefs.push({ entity_type: "client", entity_id: clientId });
  }
  if (contactId) {
    exactRefs.push({ entity_type: "contact_client", entity_id: contactId });
  }
  if (categoryId) {
    exactRefs.push({ entity_type: "category", entity_id: categoryId });
  }
  if (toolId) {
    exactRefs.push({ entity_type: "tool", entity_id: toolId });
  }

  if (exactRefs.length === 0) {
    return { kind: "all" };
  }
  return { kind: "refs", refs: exactRefs };
}

/**
 * Historique global (page /history) — INSERT/DELETE uniquement.
 */
export async function listAuditLogsForPage(
  filters: AuditHistoryPageFilters = {},
): Promise<AuditLogListItem[]> {
  const target = await buildPageFilterTarget(filters);

  if (target.kind === "refs" && target.refs.length === 0) {
    return [];
  }

  if (target.kind === "all") {
    return queryAuditLogs({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  }

  if (target.kind === "types") {
    return queryAuditLogs({
      entityTypes: target.entityTypes,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  }

  return queryAuditLogs({
    refs: target.refs,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
}

/**
 * Historique filtré pour une modale d'entité.
 */
export async function listAuditLogsForScope(
  scope: AuditEntityScope,
): Promise<AuditLogListItem[]> {
  const resolved = await resolveAuditEntityScope(scope);

  if ("entityTypesOnly" in resolved) {
    return queryAuditLogs({ entityTypes: resolved.entityTypesOnly });
  }

  if (resolved.length === 0) {
    return [];
  }

  return queryAuditLogs({ refs: resolved });
}
