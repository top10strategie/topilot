const FRANKFURTER_BASE = "https://api.frankfurter.app";

export type FrankfurterSingleResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

export type FrankfurterRangeResponse = {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
};

export class FrankfurterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FrankfurterError";
  }
}

/**
 * Taux : 1 unité de `fromCurrency` vaut X EUR (via Frankfurter from→EUR).
 */
export async function fetchRateOnDate(
  fromCurrency: string,
  dateYmd: string,
): Promise<{ date: string; rate: number } | null> {
  const from = fromCurrency.toUpperCase();
  if (from === "EUR") {
    return { date: dateYmd, rate: 1 };
  }

  const url = `${FRANKFURTER_BASE}/${dateYmd}?from=${encodeURIComponent(from)}&to=EUR`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new FrankfurterError(`Frankfurter HTTP ${res.status}`, res.status);
  }

  const body = (await res.json()) as FrankfurterSingleResponse;
  const eur = body.rates.EUR;
  if (typeof eur !== "number" || eur <= 0) {
    return null;
  }
  return { date: body.date, rate: eur };
}

/**
 * Plage de taux journaliers ; filtrer côté appelant aux dates souhaitées.
 */
export async function fetchRateRange(
  fromCurrency: string,
  startYmd: string,
  endYmd: string,
): Promise<Map<string, number>> {
  const from = fromCurrency.toUpperCase();
  const result = new Map<string, number>();
  if (from === "EUR") {
    return result;
  }

  const url = `${FRANKFURTER_BASE}/${startYmd}..${endYmd}?from=${encodeURIComponent(from)}&to=EUR`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new FrankfurterError(`Frankfurter HTTP ${res.status}`, res.status);
  }

  const body = (await res.json()) as FrankfurterRangeResponse;
  for (const [date, rates] of Object.entries(body.rates)) {
    const eur = rates.EUR;
    if (typeof eur === "number" && eur > 0) {
      result.set(date, eur);
    }
  }
  return result;
}
