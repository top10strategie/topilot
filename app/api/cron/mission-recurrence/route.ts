import { NextResponse } from "next/server";
import { verifyBearerCronSecret } from "@/lib/auth/cron-secret";
import { generateDueMissionOccurrences } from "@/lib/missions/generate-recurrence";

/** Limite Vercel pour génération des occurrences récurrentes. */
export const maxDuration = 60;

/**
 * Cron Vercel — génération des missions récurrentes (J−10).
 * Auth : `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  if (!verifyBearerCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await generateDueMissionOccurrences();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cron_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
