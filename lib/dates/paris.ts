/** Date calendaire du jour en Europe/Paris (`YYYY-MM-DD`). */
export function todayParisYmd(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
