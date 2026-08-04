import type {
  MissionKanbanStatus,
  MissionRecurrenceFrequency,
  MissionResponsibleItem,
  MissionScope,
} from "./types";

export const MISSION_KANBAN_STATUSES: MissionKanbanStatus[] = [
  "a_faire",
  "en_cours",
  "terminee",
  "archivee",
];

export const MISSION_SCOPES: MissionScope[] = ["client", "interne"];

export const MISSION_RECURRENCE_FREQUENCIES: MissionRecurrenceFrequency[] = [
  "mensuelle",
  "trimestrielle",
  "annuelle",
];

const KANBAN_STATUS_LABELS: Record<MissionKanbanStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminé",
  archivee: "Archivé",
};

const SCOPE_LABELS: Record<MissionScope, string> = {
  client: "Client",
  interne: "Interne",
};

const RECURRENCE_FREQUENCY_LABELS: Record<MissionRecurrenceFrequency, string> =
  {
    mensuelle: "Mensuelle",
    trimestrielle: "Trimestrielle",
    annuelle: "Annuelle",
  };

export function getMissionRecurrenceFrequencyLabel(
  frequency: MissionRecurrenceFrequency,
): string {
  return RECURRENCE_FREQUENCY_LABELS[frequency];
}

export function getMissionKanbanStatusLabel(
  status: MissionKanbanStatus,
): string {
  return KANBAN_STATUS_LABELS[status];
}

export function getMissionScopeLabel(scope: MissionScope): string {
  return SCOPE_LABELS[scope];
}

export function getMissionResponsibleName(
  person: Pick<MissionResponsibleItem, "first_name" | "last_name">,
): string {
  return `${person.first_name} ${person.last_name.toLocaleUpperCase("fr")}`.trim();
}

export function formatMissionDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatMissionCharge(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value)} j`;
}
