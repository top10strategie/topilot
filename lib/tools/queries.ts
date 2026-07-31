import { createClient } from "@/lib/supabase/server";
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

export async function listTools(): Promise<ToolListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tool")
    .select(TOOL_LIST_SELECT)
    .order("tool_name", { ascending: true });

  if (error) {
    console.error("listTools:", error);
    throw new Error(`Impossible de charger les outils : ${error.message}`);
  }

  return ((data ?? []) as unknown as ToolListRow[]).map(mapListItem);
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
