import type { MissionRecurrenceFrequency } from "@/lib/missions/types";

/** Génération automatique des occurrences à J−10 avant `start_at`. */
export const MISSION_RECURRENCE_LEAD_DAYS = 10;

export function addMonthsYmd(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nextOccurrenceStart(
  anchor: string,
  frequency: MissionRecurrenceFrequency,
): string {
  switch (frequency) {
    case "hebdomadaire":
      return addDaysYmd(anchor, 7);
    case "mensuelle":
      return addMonthsYmd(anchor, 1);
    case "trimestrielle":
      return addMonthsYmd(anchor, 3);
    case "annuelle":
      return addMonthsYmd(anchor, 12);
  }
}

export function shouldGenerateOccurrence(input: {
  today: string;
  nextStart: string;
  endsOn: string | null;
  leadDays?: number;
}): boolean {
  const leadDays = input.leadDays ?? MISSION_RECURRENCE_LEAD_DAYS;
  if (input.endsOn && input.nextStart > input.endsOn) {
    return false;
  }
  const generateFrom = addDaysYmd(input.nextStart, -leadDays);
  return input.today >= generateFrom;
}

/** Recalcule `end_at` en conservant la durée de la dernière occurrence. */
export function nextOccurrenceEnd(
  lastStartAt: string | null,
  lastEndAt: string | null,
  nextStart: string,
): string | null {
  if (!lastStartAt || !lastEndAt) {
    return null;
  }
  const start = new Date(`${lastStartAt}T00:00:00Z`);
  const end = new Date(`${lastEndAt}T00:00:00Z`);
  const durationDays = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (!Number.isFinite(durationDays) || durationDays < 0) {
    return null;
  }
  return addDaysYmd(nextStart, durationDays);
}
