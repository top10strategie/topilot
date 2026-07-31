import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchRateOnDate,
  fetchRateRange,
} from "@/lib/exchange-rate/frankfurter-client";
import {
  firstOfMonthUtcIso,
  firstOfMonthYmd,
  listFirstOfMonthYmdsUntilNow,
} from "@/lib/exchange-rate/month-dates";

type ExchangeRateInsert = {
  currency: string;
  rate: number;
  date: string;
};

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

async function upsertRates(rows: ExchangeRateInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  const admin = createAdminClient();
  const { error } = await admin.from("exchange_rate").upsert(rows, {
    onConflict: "currency,date",
    ignoreDuplicates: false,
  });
  if (error) throw new Error(error.message);
  return rows.length;
}

/** Devises distinctes utilisées dans les tarifs abonnements (hors EUR). */
export async function listUsedNonEurCurrencies(): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tool_subscription_price")
    .select("currency");
  if (error) throw new Error(error.message);

  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = normalizeCurrency(String(row.currency ?? ""));
    if (c && c !== "EUR") set.add(c);
  }
  return [...set].sort();
}

/** Backfill des 1ers de mois (janv. 2024 → mois courant) pour une devise. */
export async function syncRatesForCurrency(currency: string): Promise<number> {
  const code = normalizeCurrency(currency);
  if (code === "EUR") return 0;

  const monthDates = listFirstOfMonthYmdsUntilNow();
  if (monthDates.length === 0) return 0;

  const start = monthDates[0]!;
  const end = monthDates[monthDates.length - 1]!;
  const dailyRates = await fetchRateRange(code, start, end);
  const toUpsert: ExchangeRateInsert[] = [];

  for (const ymd of monthDates) {
    let rate = dailyRates.get(ymd);
    if (rate == null) {
      const fetched = await fetchRateOnDate(code, ymd);
      rate = fetched?.rate;
    }
    if (rate != null && rate > 0) {
      const [y, m] = ymd.split("-").map(Number);
      toUpsert.push({
        currency: code,
        rate,
        date: firstOfMonthUtcIso(y!, m!),
      });
    }
  }

  return upsertRates(toUpsert);
}

/** Met à jour le taux du 1er du mois courant pour toutes les devises utilisées. */
export async function syncAllUsedCurrencies(): Promise<{
  currencies: string[];
  upserted: number;
}> {
  const currencies = await listUsedNonEurCurrencies();
  let upserted = 0;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const ymd = firstOfMonthYmd(y, m);

  for (const currency of currencies) {
    const fetched = await fetchRateOnDate(currency, ymd);
    if (fetched) {
      upserted += await upsertRates([
        {
          currency,
          rate: fetched.rate,
          date: firstOfMonthUtcIso(y, m),
        },
      ]);
    }
  }
  return { currencies, upserted };
}

/**
 * True si la devise (non EUR) n'apparaît qu'une seule fois dans les prix
 * (typiquement juste après le premier insert).
 */
export async function isNewSubscriptionCurrency(
  currency: string,
): Promise<boolean> {
  const code = normalizeCurrency(currency);
  if (code === "EUR") return false;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("tool_subscription_price")
    .select("id", { count: "exact", head: true })
    .eq("currency", code);
  if (error) throw new Error(error.message);
  return (count ?? 0) === 1;
}

export async function backfillNewCurrencyIfNeeded(
  currency: string,
): Promise<void> {
  const code = normalizeCurrency(currency);
  if (code === "EUR") return;
  const isNew = await isNewSubscriptionCurrency(code);
  if (!isNew) return;
  await syncRatesForCurrency(code);
}
