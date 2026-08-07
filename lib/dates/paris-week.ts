/**
 * Helpers calendaires Europe/Paris (semaine ISO pour Top10).
 */

const PARIS_TZ = "Europe/Paris";

/** Date calendaire YYYY-MM-DD en Europe/Paris. */
export function todayDateParis(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Fin du dimanche de la semaine ISO courante (YYYY-MM-DD), fuseau Europe/Paris. */
export function endOfCurrentIsoWeekParis(date: Date = new Date()): string {
  const today = todayDateParis(date);
  const [y0, m0, d0] = today.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y0, m0 - 1, d0, 12, 0, 0));
  const weekday = utcNoon.getUTCDay(); // 0=dim … 6=sam
  const daysUntilSunday = weekday === 0 ? 0 : 7 - weekday;
  utcNoon.setUTCDate(utcNoon.getUTCDate() + daysUntilSunday);
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcNoon.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
