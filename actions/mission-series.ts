"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import type { MissionRecurrenceFrequency } from "@/lib/missions/types";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

const FREQUENCIES = new Set<MissionRecurrenceFrequency>([
  "mensuelle",
  "trimestrielle",
  "annuelle",
]);

export type MissionSeriesActionResult =
  | { success: true; seriesId: string }
  | { success: false; error: string };

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function revalidateSeries(missionId?: string) {
  revalidatePath("/missions");
  if (missionId) revalidatePath(`/missions/${missionId}`);
}

async function closeSeriesIfOrphan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seriesId: string,
): Promise<void> {
  const { count, error } = await supabase
    .from("mission")
    .select("id", { count: "exact", head: true })
    .eq("series_id", seriesId);

  if (error) {
    console.error("closeSeriesIfOrphan:", error);
    return;
  }
  if ((count ?? 0) > 0) return;

  await supabase
    .from("mission_series")
    .update({ ends_on: todayYmd() })
    .eq("id", seriesId)
    .is("ends_on", null);
}

/**
 * Attache / met à jour la récurrence d'une mission.
 * Changement de fréquence → nouvelle série + détachement de l'ancienne.
 */
export async function syncMissionRecurrence(input: {
  missionId: string;
  enabled: boolean;
  frequency: MissionRecurrenceFrequency | null;
  startsOn: string | null;
  endsOn: string | null;
}): Promise<MissionSeriesActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const missionId = input.missionId.trim();
  if (!isUuid(missionId)) {
    return { success: false, error: "Identifiant mission invalide." };
  }

  const supabase = await createClient();
  const { data: mission, error: missionError } = await supabase
    .from("mission")
    .select("id, series_id")
    .eq("id", missionId)
    .maybeSingle();

  if (missionError || !mission) {
    return {
      success: false,
      error: missionError?.message ?? "Mission introuvable.",
    };
  }

  const previousSeriesId = (mission.series_id as string | null) ?? null;

  if (!input.enabled) {
    if (previousSeriesId) {
      await supabase
        .from("mission")
        .update({ series_id: null })
        .eq("id", missionId);
      await closeSeriesIfOrphan(supabase, previousSeriesId);
    }
    revalidateSeries(missionId);
    return { success: true, seriesId: "" };
  }

  if (!input.frequency || !FREQUENCIES.has(input.frequency)) {
    return { success: false, error: "La fréquence est obligatoire." };
  }
  const startsOn = input.startsOn?.trim() || todayYmd();
  const endsOn = input.endsOn?.trim() || null;
  if (endsOn && endsOn < startsOn) {
    return {
      success: false,
      error: "La fin de série doit être postérieure au début.",
    };
  }

  let previousFrequency: MissionRecurrenceFrequency | null = null;
  if (previousSeriesId) {
    const { data: prev } = await supabase
      .from("mission_series")
      .select("frequency")
      .eq("id", previousSeriesId)
      .maybeSingle();
    previousFrequency =
      (prev?.frequency as MissionRecurrenceFrequency | undefined) ?? null;
  }

  const frequencyChanged =
    Boolean(previousSeriesId) && previousFrequency !== input.frequency;

  if (!previousSeriesId || frequencyChanged) {
    const { data: series, error: createError } = await supabase
      .from("mission_series")
      .insert({
        frequency: input.frequency,
        starts_on: startsOn,
        ends_on: endsOn,
      })
      .select("id")
      .single();

    if (createError || !series) {
      return {
        success: false,
        error:
          createError?.message ?? "Impossible de créer la série de récurrence.",
      };
    }

    const { error: linkError } = await supabase
      .from("mission")
      .update({ series_id: series.id })
      .eq("id", missionId);

    if (linkError) {
      return { success: false, error: linkError.message };
    }

    if (previousSeriesId && frequencyChanged) {
      await closeSeriesIfOrphan(supabase, previousSeriesId);
    }

    revalidateSeries(missionId);
    return { success: true, seriesId: series.id as string };
  }

  const { error: updateError } = await supabase
    .from("mission_series")
    .update({
      starts_on: startsOn,
      ends_on: endsOn,
    })
    .eq("id", previousSeriesId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidateSeries(missionId);
  return { success: true, seriesId: previousSeriesId };
}

/** Arrête la série (ends_on = aujourd'hui). */
export async function stopMissionSeries(
  seriesId: string,
  missionId?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }
  if (!isUuid(seriesId)) {
    return { success: false, error: "Identifiant de série invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mission_series")
    .update({ ends_on: todayYmd() })
    .eq("id", seriesId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateSeries(missionId);
  return { success: true };
}
