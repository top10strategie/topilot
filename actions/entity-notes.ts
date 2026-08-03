"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type NotesEntity = "client" | "opportunity" | "mission" | "team";

export type UpdateNotesResult =
  | { success: true }
  | { success: false; error: string };

const TABLE: Record<NotesEntity, string> = {
  client: "client",
  opportunity: "opportunity",
  mission: "mission",
  team: "team",
};

function revalidateNotes(entity: NotesEntity, id: string) {
  if (entity === "client") {
    revalidatePath(`/clients/${id}`);
    revalidatePath("/clients");
  } else if (entity === "opportunity") {
    revalidatePath(`/opportunities/${id}`);
    revalidatePath("/opportunities");
  } else if (entity === "mission") {
    revalidatePath(`/missions/${id}`);
    revalidatePath("/missions");
  } else {
    revalidatePath("/top10");
    revalidatePath("/administration");
  }
}

/**
 * Met à jour les notes d'une entité (autosave fiche / consultation pôle).
 */
export async function updateEntityNotes(input: {
  entity: NotesEntity;
  entityId: string;
  notes: string;
}): Promise<UpdateNotesResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  if (!isUuid(entityId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const notesRaw = input.notes.trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const supabase = await createClient();
  const table = TABLE[input.entity];

  const { data: existing, error: readError } = await supabase
    .from(table)
    .select("id, notes")
    .eq("id", entityId)
    .maybeSingle();

  if (readError) {
    return { success: false, error: readError.message };
  }
  if (!existing) {
    return { success: false, error: "Entité introuvable." };
  }

  const previous = (existing.notes as string | null) ?? null;
  if (previous === notes) {
    return { success: true };
  }

  const { error } = await supabase
    .from(table)
    .update({
      notes,
      notes_updated_at: new Date().toISOString(),
    })
    .eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateNotes(input.entity, entityId);
  return { success: true };
}
