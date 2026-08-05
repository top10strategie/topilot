import type { AuditAction, AuditEntityType } from "./types";

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  category: "Catégorie",
  team: "Pôle",
  collaborator: "Collaborateur",
  client: "Client",
  contact_client: "Contact client",
  opportunity: "Opportunité",
  mission: "Mission",
  mission_series: "Récurrence",
  document_type: "Type de document",
  document: "Document",
  tool: "Outil",
  tool_access: "Accès outil",
  tool_subscription: "Abonnement outil",
  tool_subscription_price: "Prix d'abonnement",
  exchange_rate: "Taux de change",
  wiki: "Wiki",
  setting: "Préférences",
  note: "Note",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: "Création",
  DELETE: "Suppression",
};

export function getAuditEntityTypeLabel(
  entityType: string,
): string {
  if (entityType in ENTITY_TYPE_LABELS) {
    return ENTITY_TYPE_LABELS[entityType as AuditEntityType];
  }
  return entityType;
}

export function getAuditActionLabel(action: string): string {
  if (action in ACTION_LABELS) {
    return ACTION_LABELS[action as AuditAction];
  }
  return action;
}

/** Collaborateur null → prénom « Top10 » sans nom. */
export function getAuditCollaboratorDisplayName(person: {
  first_name: string | null;
  last_name: string | null;
} | null): string {
  if (!person?.first_name && !person?.last_name) {
    return "Top10";
  }
  if (!person.first_name && person.last_name) {
    return person.last_name.toLocaleUpperCase("fr");
  }
  if (person.first_name && !person.last_name) {
    return person.first_name;
  }
  return `${person.first_name} ${person.last_name!.toLocaleUpperCase("fr")}`.trim();
}

export function formatAuditDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
