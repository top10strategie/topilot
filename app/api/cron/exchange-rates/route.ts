import { NextResponse } from "next/server";
import { verifyBearerCronSecret } from "@/lib/auth/cron-secret";
import { syncAllUsedCurrencies } from "@/lib/exchange-rate/sync-rates";

/** Limite Vercel pour le sync Frankfurter multi-devises. */
export const maxDuration = 60;

/**
 * Cron Vercel — mise à jour des taux de change au 1er de chaque mois.
 * Auth : `Authorization: Bearer <CRON_SECRET>`.
 * Dynamique par nature (lecture du header Authorization) — pas de
 * `export const dynamic` (incompatible avec `cacheComponents`).
 */
export async function GET(request: Request) {
  if (!verifyBearerCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncAllUsedCurrencies();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cron_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
