/** Cookie session : re-auth purge (sans Max-Age → fin à fermeture navigateur). */
export const PURGE_REAUTH_COOKIE = "topilot_purge_reauth";

export type PurgeYearResult = {
  year: number;
  dry_run: boolean;
  opportunities: number;
  missions: number;
  mission_series: number;
  audit_logs: number;
};

export function maxPurgeableYear(now = new Date()): number {
  const parisYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
    }).format(now),
  );
  return parisYear - 3;
}

export function isPurgeYearEligible(year: number, now = new Date()): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= maxPurgeableYear(now);
}
