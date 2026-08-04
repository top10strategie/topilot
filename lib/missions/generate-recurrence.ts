import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MissionRecurrenceFrequency,
  MissionScope,
} from "@/lib/missions/types";

const LEAD_DAYS = 10;

function addMonthsYmd(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function frequencyMonths(frequency: MissionRecurrenceFrequency): number {
  switch (frequency) {
    case "mensuelle":
      return 1;
    case "trimestrielle":
      return 3;
    case "annuelle":
      return 12;
  }
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

type SeriesRow = {
  id: string;
  frequency: MissionRecurrenceFrequency;
  starts_on: string;
  ends_on: string | null;
};

type MissionRow = {
  id: string;
  mission_name: string;
  mission_scope: MissionScope;
  client_id: string | null;
  collaborator_id: string;
  estimated_charge: number | string | null;
  notes: string | null;
  start_at: string | null;
  end_at: string | null;
  series_id: string;
};

export type MissionRecurrenceCronSummary = {
  seriesScanned: number;
  created: number;
  skipped: number;
  errors: string[];
};

/**
 * Génère les prochaines occurrences des séries actives (J−10).
 */
export async function generateDueMissionOccurrences(): Promise<MissionRecurrenceCronSummary> {
  const admin = createAdminClient();
  const today = todayYmd();
  const summary: MissionRecurrenceCronSummary = {
    seriesScanned: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };

  const { data: seriesRows, error: seriesError } = await admin
    .from("mission_series")
    .select("id, frequency, starts_on, ends_on")
    .or(`ends_on.is.null,ends_on.gte.${today}`);

  if (seriesError) {
    throw new Error(seriesError.message);
  }

  const seriesList = (seriesRows ?? []) as SeriesRow[];
  summary.seriesScanned = seriesList.length;

  for (const series of seriesList) {
    try {
      const { data: missions, error: missionsError } = await admin
        .from("mission")
        .select(
          "id, mission_name, mission_scope, client_id, collaborator_id, estimated_charge, notes, start_at, end_at, series_id",
        )
        .eq("series_id", series.id)
        .order("start_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (missionsError) {
        summary.errors.push(`${series.id}: ${missionsError.message}`);
        continue;
      }

      const last = (missions?.[0] ?? null) as MissionRow | null;
      if (!last) {
        summary.skipped += 1;
        continue;
      }

      const anchor = last.start_at ?? series.starts_on;
      const nextStart = addMonthsYmd(
        anchor,
        frequencyMonths(series.frequency),
      );

      if (series.ends_on && nextStart > series.ends_on) {
        summary.skipped += 1;
        continue;
      }

      const generateFrom = addDaysYmd(nextStart, -LEAD_DAYS);
      if (today < generateFrom) {
        summary.skipped += 1;
        continue;
      }

      const { data: existing, error: existingError } = await admin
        .from("mission")
        .select("id")
        .eq("series_id", series.id)
        .eq("start_at", nextStart)
        .maybeSingle();

      if (existingError) {
        summary.errors.push(`${series.id}: ${existingError.message}`);
        continue;
      }
      if (existing) {
        summary.skipped += 1;
        continue;
      }

      let nextEnd: string | null = null;
      if (last.start_at && last.end_at) {
        const start = new Date(`${last.start_at}T00:00:00Z`);
        const end = new Date(`${last.end_at}T00:00:00Z`);
        const durationDays = Math.round(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (Number.isFinite(durationDays) && durationDays >= 0) {
          nextEnd = addDaysYmd(nextStart, durationDays);
        }
      }

      const { data: created, error: createError } = await admin
        .from("mission")
        .insert({
          mission_name: last.mission_name,
          mission_scope: last.mission_scope,
          client_id: last.client_id,
          collaborator_id: last.collaborator_id,
          opportunity_id: null,
          series_id: series.id,
          kanban_status: "a_faire",
          estimated_charge: last.estimated_charge,
          notes: last.notes,
          start_at: nextStart,
          end_at: nextEnd,
        })
        .select("id")
        .single();

      if (createError || !created) {
        summary.errors.push(
          `${series.id}: ${createError?.message ?? "create failed"}`,
        );
        continue;
      }

      const { data: categories } = await admin
        .from("mission_category")
        .select("category_id")
        .eq("mission_id", last.id);

      const categoryIds = (categories ?? []).map(
        (row) => row.category_id as string,
      );
      if (categoryIds.length > 0) {
        const { error: catError } = await admin.from("mission_category").insert(
          categoryIds.map((category_id) => ({
            mission_id: created.id as string,
            category_id,
          })),
        );
        if (catError) {
          summary.errors.push(`${series.id} categories: ${catError.message}`);
        }
      }

      summary.created += 1;
    } catch (err) {
      summary.errors.push(
        `${series.id}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return summary;
}
