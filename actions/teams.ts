"use server";

import { revalidatePath } from "next/cache";
import { requireManagerOrDirectionAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";

export type TeamActionResult =
  | { success: true; id: string }
  | { success: false; error: string; fieldErrors?: Partial<Record<"team_name" | "notes", string>> };

export type DeleteTeamResult =
  | { success: true }
  | {
      success: false;
      error: string;
      /** Nombre de collaborateurs encore rattachés (tous statuts). */
      memberCount?: number;
    };

export type TeamInput = {
  team_name: string;
  notes?: string | null;
};

function normalizeTeamInput(input: TeamInput): {
  team_name: string;
  notes: string | null;
  fieldErrors: Partial<Record<"team_name" | "notes", string>>;
} {
  const team_name = input.team_name.trim();
  const notesRaw = input.notes?.trim() ?? "";
  const notes = notesRaw.length > 0 ? notesRaw : null;
  const fieldErrors: Partial<Record<"team_name" | "notes", string>> = {};

  if (!team_name) {
    fieldErrors.team_name = "Le nom du pôle est obligatoire.";
  } else if (team_name.length > 120) {
    fieldErrors.team_name = "Le nom du pôle ne peut pas dépasser 120 caractères.";
  }

  return { team_name, notes, fieldErrors };
}

function revalidatePeoplePages() {
  revalidatePath("/top10");
  revalidatePath("/administration");
}

export async function createTeam(input: TeamInput): Promise<TeamActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const { team_name, notes, fieldErrors } = normalizeTeamInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire (nom du pôle).",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team")
    .insert({ team_name, notes })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Un pôle porte déjà ce nom.",
        fieldErrors: { team_name: "Ce nom est déjà utilisé." },
      };
    }
    console.error("createTeam:", error);
    return { success: false, error: `Impossible de créer le pôle : ${error.message}` };
  }

  revalidatePeoplePages();
  return { success: true, id: data.id };
}

export async function updateTeam(
  id: string,
  input: TeamInput,
): Promise<TeamActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant de pôle manquant." };
  }

  const { team_name, notes, fieldErrors } = normalizeTeamInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire (nom du pôle).",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("team")
    .select("id, notes")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("updateTeam — lecture:", existingError);
    return {
      success: false,
      error: `Impossible de lire le pôle : ${existingError.message}`,
    };
  }

  if (!existing) {
    return { success: false, error: "Pôle introuvable." };
  }

  const payload: {
    team_name: string;
    notes: string | null;
    notes_updated_at?: string;
  } = { team_name, notes };

  if (existing.notes !== notes) {
    payload.notes_updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("team")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Un pôle porte déjà ce nom.",
        fieldErrors: { team_name: "Ce nom est déjà utilisé." },
      };
    }
    console.error("updateTeam:", error);
    return {
      success: false,
      error: `Impossible de mettre à jour le pôle : ${error.message}`,
    };
  }

  if (!data) {
    return { success: false, error: "Pôle introuvable." };
  }

  revalidatePeoplePages();
  return { success: true, id: data.id };
}

export async function deleteTeam(id: string): Promise<DeleteTeamResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant de pôle manquant." };
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("collaborator")
    .select("id", { count: "exact", head: true })
    .eq("team_id", id);

  if (countError) {
    console.error("deleteTeam — count members:", countError);
    return {
      success: false,
      error: `Impossible de vérifier les collaborateurs : ${countError.message}`,
    };
  }

  const memberCount = count ?? 0;
  if (memberCount > 0) {
    return {
      success: false,
      memberCount,
      error:
        memberCount === 1
          ? "Ce pôle compte encore 1 collaborateur. Déplacez-le vers un autre pôle avant de supprimer celui-ci."
          : `Ce pôle compte encore ${memberCount} collaborateurs. Déplacez-les vers un autre pôle avant de supprimer celui-ci.`,
    };
  }

  const { error } = await supabase.from("team").delete().eq("id", id);

  if (error) {
    // Filet de sécurité si la FK RESTRICT se déclenche malgré le count
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Des collaborateurs sont encore rattachés à ce pôle. Déplacez-les avant de le supprimer.",
      };
    }
    console.error("deleteTeam:", error);
    return {
      success: false,
      error: `Impossible de supprimer le pôle : ${error.message}`,
    };
  }

  revalidatePeoplePages();
  return { success: true };
}
