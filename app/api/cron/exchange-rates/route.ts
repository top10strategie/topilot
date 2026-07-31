import { NextResponse } from "next/server";
import { syncAllUsedCurrencies } from "@/lib/exchange-rate/sync-rates";

/** Limite Vercel pour le sync Frankfurter multi-devises. */
export const maxDuration = 60;

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return header.slice("Bearer ".length) === secret;
}

/**
 * Cron Vercel — mise à jour des taux de change au 1er de chaque mois.
 * Auth : `Authorization: Bearer <CRON_SECRET>`.
 * Dynamique par nature (lecture du header Authorization) — pas de
 * `export const dynamic` (incompatible avec `cacheComponents`).
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
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
