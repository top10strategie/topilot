/** Fenêtre de rétention des entités terminées (Kanban / Cartes / Tableau). */
export const TERMINAL_RETENTION_MONTHS = 1;

function monthsAgo(months: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Parse `YYYY-MM-DD` ou timestamptz ISO en date locale (minuit). */
function parseDateValue(value: string): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * True si la date de référence est dans la fenêtre de rétention
 * (ou absente → hors fenêtre / masqué).
 */
export function isWithinTerminalRetention(
  reference: string | null | undefined,
  months: number = TERMINAL_RETENTION_MONTHS,
): boolean {
  if (!reference) return false;
  const date = parseDateValue(reference);
  if (!date) return false;
  return date >= monthsAgo(months);
}

/** Opportunité gagnée/perdue : `closed_at`, repli `due_date_at`. */
export function opportunityTerminalReference(item: {
  closed_at: string | null;
  due_date_at: string | null;
}): string | null {
  return item.closed_at ?? item.due_date_at;
}

/** Mission terminée/archivée : completed_at / archived_at, repli `end_at`. */
export function missionTerminalReference(item: {
  kanban_status: string;
  completed_at: string | null;
  archived_at: string | null;
  end_at: string | null;
}): string | null {
  if (item.kanban_status === "archivee") {
    return item.archived_at ?? item.end_at;
  }
  if (item.kanban_status === "terminee") {
    return item.completed_at ?? item.end_at;
  }
  return null;
}
