export type ToolSubscriptionPlan = "mensuel" | "annuel";

export type ToolCategoryItem = {
  id: string;
  label: string;
};

export type ToolClientRef = {
  id: string;
  client_name: string;
};

export type ToolSubscriptionPriceItem = {
  id: string;
  currency: string;
  /** Montant stocké en centimes (cf. `04_database_schema.mdc`). */
  amount_cents: number;
  valid_from: string;
  valid_to: string | null;
};

export type ToolSubscriptionItem = {
  id: string;
  title: string;
  subscription_plan: ToolSubscriptionPlan;
  prices: ToolSubscriptionPriceItem[];
};

export type ToolAccessItem = {
  id: string;
  tool_id: string;
  client_id: string | null;
  /** Client lié, ou `null` = accès interne (pas de client). */
  client: ToolClientRef | null;
  label: string;
  identifier: string;
  vault_secret_id: string;
  is_private: boolean;
};

export type ToolListItem = {
  id: string;
  tool_name: string;
  url: string;
  description: string | null;
  categories: ToolCategoryItem[];
  /** Clients liés (`client_tool`) — affiché sur la fiche uniquement si non vide. */
  clients: ToolClientRef[];
  subscriptions: ToolSubscriptionItem[];
};

/** Outil lié à une entité (client / mission / opportunité) — résumé liste. */
export type LinkedToolItem = {
  id: string;
  tool_name: string;
  url: string;
  description: string | null;
  categories: ToolCategoryItem[];
};

export type ToolDetail = ToolListItem & {
  accesses: ToolAccessItem[];
};
