import { createClient } from "@/lib/supabase/server";
import {
  TOOLS_OWNER_INTERNE_ID,
  TOOLS_PAGE_SIZE,
  type ToolsListFilters,
} from "./list-filters";
import type {
  LinkedToolItem,
  ToolAccessItem,
  ToolCategoryItem,
  ToolClientRef,
  ToolDetail,
  ToolListItem,
  ToolSubscriptionItem,
  ToolSubscriptionPlan,
} from "./types";

const TOOL_LIST_SELECT = `
  id,
  tool_name,
  url,
  description,
  tool_category (
    category:category_id ( id, label )
  ),
  client_tool (
    client:client_id ( id, client_name )
  ),
  tool_subscription (
    id,
    title,
    subscription_plan,
    tool_subscription_price ( id, currency, amount, valid_from, valid_to )
  )
`;

type ToolSubscriptionPriceRow = {
  id: string;
  currency: string;
  amount: number;
  valid_from: string;
  valid_to: string | null;
};

type ToolSubscriptionRow = {
  id: string;
  title: string;
  subscription_plan: ToolSubscriptionPlan;
  tool_subscription_price: ToolSubscriptionPriceRow[] | null;
};

type ToolListRow = {
  id: string;
  tool_name: string;
  url: string;
  description: string | null;
  tool_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
  client_tool: Array<{
    client: { id: string; client_name: string } | null;
  }> | null;
  tool_subscription: ToolSubscriptionRow[] | null;
};

function mapSubscriptions(
  rows: ToolSubscriptionRow[] | null,
): ToolSubscriptionItem[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    subscription_plan: row.subscription_plan,
    prices: (row.tool_subscription_price ?? []).map((price) => ({
      id: price.id,
      currency: price.currency,
      amount_cents: price.amount,
      valid_from: price.valid_from,
      valid_to: price.valid_to,
    })),
  }));
}

function mapListItem(row: ToolListRow): ToolListItem {
  const categories: ToolCategoryItem[] = (row.tool_category ?? [])
    .map((link) => link.category)
    .filter((c): c is { id: string; label: string } => Boolean(c))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const clients: ToolClientRef[] = (row.client_tool ?? [])
    .map((link) => link.client)
    .filter((c): c is { id: string; client_name: string } => Boolean(c))
    .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr"));

  return {
    id: row.id,
    tool_name: row.tool_name,
    url: row.url,
    description: row.description,
    categories,
    clients,
    subscriptions: mapSubscriptions(row.tool_subscription),
  };
}

type ToolsPageRpcRow = {
  id: string;
  tool_name: string;
  url: string;
  description: string | null;
  categories: unknown;
  clients: unknown;
  subscriptions: unknown;
  total_count: number;
};

function mapJsonCategories(raw: unknown): ToolCategoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as { id?: unknown; label?: unknown };
      const id = typeof record.id === "string" ? record.id : "";
      const label = typeof record.label === "string" ? record.label : "";
      if (!id || !label) return null;
      return { id, label };
    })
    .filter((item): item is ToolCategoryItem => Boolean(item))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

function mapJsonClients(raw: unknown): ToolClientRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as { id?: unknown; client_name?: unknown };
      const id = typeof record.id === "string" ? record.id : "";
      const client_name =
        typeof record.client_name === "string" ? record.client_name : "";
      if (!id || !client_name) return null;
      return { id, client_name };
    })
    .filter((item): item is ToolClientRef => Boolean(item))
    .sort((a, b) => a.client_name.localeCompare(b.client_name, "fr"));
}

function mapJsonSubscriptions(raw: unknown): ToolSubscriptionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as {
        id?: unknown;
        title?: unknown;
        subscription_plan?: unknown;
        prices?: unknown;
      };
      const id = typeof record.id === "string" ? record.id : "";
      const title = typeof record.title === "string" ? record.title : "";
      const plan = record.subscription_plan;
      if (
        !id ||
        !title ||
        (plan !== "mensuel" && plan !== "annuel")
      ) {
        return null;
      }
      const pricesRaw = Array.isArray(record.prices) ? record.prices : [];
      const prices = pricesRaw
        .map((price) => {
          if (!price || typeof price !== "object") return null;
          const p = price as {
            id?: unknown;
            currency?: unknown;
            amount_cents?: unknown;
            valid_from?: unknown;
            valid_to?: unknown;
          };
          const priceId = typeof p.id === "string" ? p.id : "";
          const currency = typeof p.currency === "string" ? p.currency : "";
          const amount =
            typeof p.amount_cents === "number"
              ? p.amount_cents
              : Number(p.amount_cents);
          const valid_from =
            typeof p.valid_from === "string" ? p.valid_from : "";
          if (!priceId || !currency || !Number.isFinite(amount) || !valid_from) {
            return null;
          }
          return {
            id: priceId,
            currency,
            amount_cents: amount,
            valid_from,
            valid_to:
              typeof p.valid_to === "string" || p.valid_to === null
                ? (p.valid_to as string | null)
                : null,
          };
        })
        .filter(
          (
            price,
          ): price is ToolSubscriptionItem["prices"][number] => Boolean(price),
        );

      return {
        id,
        title,
        subscription_plan: plan,
        prices,
      };
    })
    .filter((item): item is ToolSubscriptionItem => Boolean(item));
}

function mapToolsPageRpcRow(row: ToolsPageRpcRow): ToolListItem {
  return {
    id: row.id,
    tool_name: row.tool_name,
    url: row.url,
    description: row.description,
    categories: mapJsonCategories(row.categories),
    clients: mapJsonClients(row.clients),
    subscriptions: mapJsonSubscriptions(row.subscriptions),
  };
}

export type ToolsPageResult = {
  tools: ToolListItem[];
  totalCount: number;
};

/**
 * Page /tools filtrée + paginée (RPC `list_tools_page`).
 */
export async function listToolsPage(
  filters: ToolsListFilters,
): Promise<ToolsPageResult> {
  const supabase = await createClient();
  const includeInterne = filters.clientIds.includes(TOOLS_OWNER_INTERNE_ID);
  const clientIds = filters.clientIds.filter(
    (id) => id !== TOOLS_OWNER_INTERNE_ID,
  );

  const { data, error } = await supabase.rpc("list_tools_page", {
    p_page: filters.page,
    p_page_size: TOOLS_PAGE_SIZE,
    p_category_ids:
      filters.categoryIds.length > 0 ? filters.categoryIds : null,
    p_client_ids: clientIds.length > 0 ? clientIds : null,
    p_include_interne: includeInterne,
    p_cost_bucket: filters.costBucket,
    p_with_subscription: filters.withSubscription,
    p_without_subscription: filters.withoutSubscription,
    p_query: filters.q || null,
  });

  if (error) {
    console.error("listToolsPage:", error);
    throw new Error(`Impossible de charger les outils : ${error.message}`);
  }

  const rows = (data ?? []) as ToolsPageRpcRow[];
  const totalCount =
    rows.length > 0 ? Number(rows[0].total_count) || 0 : 0;

  return {
    tools: rows.map(mapToolsPageRpcRow),
    totalCount,
  };
}

type ToolAccessRow = {
  id: string;
  tool_id: string;
  client_id: string | null;
  label: string;
  identifier: string;
  vault_secret_id: string;
  is_private: boolean;
  client: { id: string; client_name: string } | null;
};

async function listToolAccessesByToolId(
  toolId: string,
): Promise<ToolAccessItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool_access")
    .select(
      `
      id,
      tool_id,
      client_id,
      label,
      identifier,
      vault_secret_id,
      is_private,
      client:client_id ( id, client_name )
    `,
    )
    .eq("tool_id", toolId)
    .order("label", { ascending: true });

  if (error) {
    console.error("listToolAccessesByToolId:", error);
    throw new Error(`Impossible de charger les accès : ${error.message}`);
  }

  return ((data ?? []) as unknown as ToolAccessRow[]).map((row) => ({
    id: row.id,
    tool_id: row.tool_id,
    client_id: row.client_id,
    client: row.client
      ? { id: row.client.id, client_name: row.client.client_name }
      : null,
    label: row.label,
    identifier: row.identifier,
    vault_secret_id: row.vault_secret_id,
    is_private: row.is_private,
  }));
}

export async function getToolById(id: string): Promise<ToolDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool")
    .select(TOOL_LIST_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getToolById:", error);
    throw new Error(`Impossible de charger l'outil : ${error.message}`);
  }

  if (!data) return null;

  const base = mapListItem(data as unknown as ToolListRow);
  const accesses = await listToolAccessesByToolId(id);
  return { ...base, accesses };
}

function mapLinkedTool(row: ToolListRow): LinkedToolItem {
  const item = mapListItem(row);
  return {
    id: item.id,
    tool_name: item.tool_name,
    url: item.url,
    description: item.description,
    categories: item.categories,
  };
}

async function listToolsByIds(ids: string[]): Promise<LinkedToolItem[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool")
    .select(TOOL_LIST_SELECT)
    .in("id", ids)
    .order("tool_name", { ascending: true });

  if (error) {
    console.error("listToolsByIds:", error);
    throw new Error(`Impossible de charger les outils : ${error.message}`);
  }

  return ((data ?? []) as unknown as ToolListRow[]).map(mapLinkedTool);
}

/** Outils tagués via `client_tool` ou ayant un accès `tool_access.client_id`. */
export async function listToolsByClientId(
  clientId: string,
): Promise<LinkedToolItem[]> {
  const supabase = await createClient();
  const [junctionRes, accessRes] = await Promise.all([
    supabase.from("client_tool").select("tool_id").eq("client_id", clientId),
    supabase.from("tool_access").select("tool_id").eq("client_id", clientId),
  ]);

  if (junctionRes.error) {
    console.error("listToolsByClientId client_tool:", junctionRes.error);
    throw new Error(
      `Impossible de charger les outils du client : ${junctionRes.error.message}`,
    );
  }
  if (accessRes.error) {
    console.error("listToolsByClientId tool_access:", accessRes.error);
    throw new Error(
      `Impossible de charger les outils du client : ${accessRes.error.message}`,
    );
  }

  const ids = [
    ...new Set([
      ...(junctionRes.data ?? []).map((r) => r.tool_id as string),
      ...(accessRes.data ?? []).map((r) => r.tool_id as string),
    ]),
  ];
  return listToolsByIds(ids);
}

export async function listToolsByMissionId(
  missionId: string,
): Promise<LinkedToolItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission_tool")
    .select("tool_id")
    .eq("mission_id", missionId);

  if (error) {
    console.error("listToolsByMissionId:", error);
    throw new Error(
      `Impossible de charger les outils de la mission : ${error.message}`,
    );
  }

  return listToolsByIds((data ?? []).map((r) => r.tool_id as string));
}

export async function listToolsByOpportunityId(
  opportunityId: string,
): Promise<LinkedToolItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_tool")
    .select("tool_id")
    .eq("opportunity_id", opportunityId);

  if (error) {
    console.error("listToolsByOpportunityId:", error);
    throw new Error(
      `Impossible de charger les outils de l'opportunité : ${error.message}`,
    );
  }

  return listToolsByIds((data ?? []).map((r) => r.tool_id as string));
}

/** Options légères pour lier un outil existant. */
export async function listToolLinkOptions(): Promise<
  Array<{ id: string; tool_name: string }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool")
    .select("id, tool_name")
    .order("tool_name", { ascending: true });

  if (error) {
    console.error("listToolLinkOptions:", error);
    throw new Error(`Impossible de charger les outils : ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    tool_name: row.tool_name as string,
  }));
}
