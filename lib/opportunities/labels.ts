import type {
  OpportunityKanbanStatus,
  OpportunityPriority,
  OpportunityResponsibleItem,
} from "./types";

export const OPPORTUNITY_KANBAN_STATUSES: OpportunityKanbanStatus[] = [
  "suspect",
  "prospect",
  "besoin_specifie",
  "proposition_envoyee",
  "gagne",
  "perdue",
];

export const OPPORTUNITY_PRIORITIES: OpportunityPriority[] = [
  "faible",
  "normal",
  "urgente",
  "prioritaire",
];

const KANBAN_STATUS_LABELS: Record<OpportunityKanbanStatus, string> = {
  suspect: "Suspect",
  prospect: "Prospect",
  besoin_specifie: "Besoin spécifié",
  proposition_envoyee: "Proposition envoyée",
  gagne: "Gagné",
  perdue: "Perdue",
};

const PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  faible: "Faible",
  normal: "Normal",
  urgente: "Urgente",
  prioritaire: "Prioritaire",
};

export function getOpportunityKanbanStatusLabel(
  status: OpportunityKanbanStatus,
): string {
  return KANBAN_STATUS_LABELS[status];
}

export function getOpportunityPriorityLabel(
  priority: OpportunityPriority,
): string {
  return PRIORITY_LABELS[priority];
}

export function getOpportunityResponsibleName(
  person: Pick<OpportunityResponsibleItem, "first_name" | "last_name">,
): string {
  return `${person.first_name} ${person.last_name.toLocaleUpperCase("fr")}`.trim();
}

export function formatOpportunityPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatOpportunityDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatOpportunityProbability(value: number): string {
  return `${Math.round(value)} %`;
}
