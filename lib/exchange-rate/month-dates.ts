import {
  EXCHANGE_RATE_BACKFILL_START_MONTH,
  EXCHANGE_RATE_BACKFILL_START_YEAR,
} from "@/lib/exchange-rate/constants";

/** yyyy-MM-dd — 1er jour du mois. */
export function firstOfMonthYmd(year: number, month: number): string {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-01`;
}

/** timestamptz ISO — 1er du mois à minuit UTC. */
export function firstOfMonthUtcIso(year: number, month: number): string {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-01T00:00:00.000Z`;
}

/** Liste yyyy-MM-dd des 1ers de mois de janv. 2024 au mois courant inclus. */
export function listFirstOfMonthYmdsUntilNow(now = new Date()): string[] {
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const dates: string[] = [];
  let y = EXCHANGE_RATE_BACKFILL_START_YEAR;
  let m = EXCHANGE_RATE_BACKFILL_START_MONTH;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    dates.push(firstOfMonthYmd(y, m));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return dates;
}
