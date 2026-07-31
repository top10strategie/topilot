import { after } from "next/server";
import { backfillNewCurrencyIfNeeded } from "@/lib/exchange-rate/sync-rates";

/**
 * Lance le backfill Frankfurter après la réponse HTTP si la devise est nouvelle.
 */
export function scheduleExchangeRateSyncIfNewCurrency(currency: string): void {
  const code = currency.trim().toUpperCase();
  if (code === "EUR") return;

  after(async () => {
    try {
      await backfillNewCurrencyIfNeeded(code);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[exchange-rate] Échec du backfill async pour ${code}:`,
        message,
      );
    }
  });
}
