export type AuditAction = "INSERT" | "DELETE";

export type AuditEntityType =
  | "category"
  | "team"
  | "collaborator"
  | "client"
  | "contact_client"
  | "opportunity"
  | "mission"
  | "mission_series"
  | "document_type"
  | "document"
  | "tool"
  | "tool_access"
  | "tool_subscription"
  | "tool_subscription_price"
  | "exchange_rate"
  | "wiki"
  | "setting"
  | "note";

export type AuditLogListItem = {
  id: string;
  created_at: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  collaborator_first_name: string | null;
  collaborator_last_name: string | null;
};

/** Filtres de la page /history. */
export type AuditHistoryPageFilters = {
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  contactId?: string;
  categoryId?: string;
  toolId?: string;
  focusMissions?: boolean;
  focusOpportunities?: boolean;
  focusRecurrences?: boolean;
};

export type AuditEntityScope =
  | { kind: "client"; clientId: string }
  | { kind: "opportunity"; opportunityId: string }
  | { kind: "mission"; missionId: string; seriesId?: string | null }
  | { kind: "tool"; toolId: string }
  | { kind: "documents" }
  | { kind: "wikis" };

export type AuditEntityRef = {
  entity_type: AuditEntityType;
  entity_id: string;
};

export type AuditContactOption = {
  id: string;
  first_name: string;
  last_name: string;
  client_name: string;
};
