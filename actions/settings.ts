"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { uploadCollaboratorProfilePicture } from "@/lib/collaborators/profile-picture";
import { formText } from "@/lib/form-data";
import {
  isCollaboratorHomeWidgetId,
  isHomeWidgetId,
  type HomeWidgetId,
} from "@/lib/analyses/types";
import type { AppTheme } from "@/lib/settings/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/uuid";

export type SettingsActionResult =
  | { success: true }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<string, string>>;
    };

const THEMES = new Set<AppTheme>(["clair", "sombre", "systeme"]);

export async function updateOwnTheme(
  theme: AppTheme,
): Promise<SettingsActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) return { success: false, error: auth.error };
  if (!THEMES.has(theme)) {
    return { success: false, error: "Thème invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("setting")
    .update({ theme })
    .eq("collaborator_id", auth.collaborator.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function updateOwnPassword(input: {
  password: string;
  confirm: string;
}): Promise<SettingsActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) return { success: false, error: auth.error };

  const password = input.password.trim();
  const confirm = input.confirm.trim();
  if (password.length < 8) {
    return {
      success: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
      fieldErrors: { password: "Minimum 8 caractères." },
    };
  }
  if (password !== confirm) {
    return {
      success: false,
      error: "Les mots de passe ne correspondent pas.",
      fieldErrors: { confirm: "Ne correspond pas." },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateOwnProfile(
  formData: FormData,
): Promise<SettingsActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) return { success: false, error: auth.error };

  const firstName = formText(formData, "first_name");
  const lastName = formText(formData, "last_name");
  const email = formText(formData, "email").toLowerCase();
  const teamId = formText(formData, "team_id");
  const jobTitle = formText(formData, "job_title");
  const themeRaw = formText(formData, "theme") as AppTheme;
  const fieldErrors: Partial<Record<string, string>> = {};

  if (!firstName) fieldErrors.first_name = "Prénom obligatoire.";
  if (!lastName) fieldErrors.last_name = "Nom obligatoire.";
  if (!email || !email.includes("@")) fieldErrors.email = "Email invalide.";
  if (!isUuid(teamId)) fieldErrors.team_id = "Pôle obligatoire.";
  if (!jobTitle) fieldErrors.job_title = "Poste obligatoire.";
  if (!THEMES.has(themeRaw)) fieldErrors.theme = "Thème invalide.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("collaborator")
    .select("id, auth_user_id, email, profile_picture_id")
    .eq("id", auth.collaborator.id)
    .maybeSingle();

  if (existingError || !existing) {
    return { success: false, error: "Profil introuvable." };
  }

  const avatar = formData.get("avatar");
  const avatarFile =
    avatar instanceof File && avatar.size > 0 ? avatar : null;
  let profilePictureId = existing.profile_picture_id as string | null;
  if (avatarFile) {
    try {
      const uploaded = await uploadCollaboratorProfilePicture(avatarFile);
      profilePictureId = uploaded.documentId;
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Échec de l'upload de la photo.",
        fieldErrors: { avatar: "Image invalide." },
      };
    }
  }

  if (email !== existing.email) {
    const admin = createAdminClient();
    const { error: authEmailError } = await admin.auth.admin.updateUserById(
      existing.auth_user_id,
      { email },
    );
    if (authEmailError) {
      return {
        success: false,
        error: `Impossible de mettre à jour l'email : ${authEmailError.message}`,
        fieldErrors: { email: authEmailError.message },
      };
    }
  }

  const { error: updateError } = await supabase
    .from("collaborator")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      team_id: teamId,
      job_title: jobTitle,
      profile_picture_id: profilePictureId,
    })
    .eq("id", auth.collaborator.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: themeError } = await supabase
    .from("setting")
    .update({ theme: themeRaw })
    .eq("collaborator_id", auth.collaborator.id);

  if (themeError) {
    return { success: false, error: themeError.message };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function updateHomeWidgets(
  widgetIds: string[],
): Promise<SettingsActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) return { success: false, error: auth.error };

  const cleaned: HomeWidgetId[] = [];
  for (const id of widgetIds) {
    if (!isHomeWidgetId(id)) {
      return { success: false, error: `Widget inconnu : ${id}` };
    }
    if (
      auth.collaborator.role === "collaborator" &&
      !isCollaboratorHomeWidgetId(id)
    ) {
      continue;
    }
    if (!cleaned.includes(id)) cleaned.push(id);
  }

  // Preserve catalogue order of selection as provided
  const supabase = await createClient();
  const { error } = await supabase
    .from("setting")
    .update({ home_widgets: cleaned })
    .eq("collaborator_id", auth.collaborator.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

export async function updatePreferredMissionCategories(
  categoryIds: string[],
): Promise<SettingsActionResult> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) return { success: false, error: auth.error };

  const cleaned: string[] = [];
  for (const raw of categoryIds) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!isUuid(id)) {
      return { success: false, error: "Identifiant de catégorie invalide." };
    }
    if (!cleaned.includes(id)) cleaned.push(id);
  }

  const supabase = await createClient();

  if (cleaned.length > 0) {
    const { data: visible, error: catError } = await supabase
      .from("category_business")
      .select("id")
      .in("id", cleaned);

    if (catError) {
      return { success: false, error: catError.message };
    }

    const visibleIds = new Set((visible ?? []).map((row) => row.id as string));
    for (const id of cleaned) {
      if (!visibleIds.has(id)) {
        return {
          success: false,
          error: "Une ou plusieurs catégories sont inaccessibles.",
        };
      }
    }
  }

  const { error } = await supabase
    .from("setting")
    .update({ preferred_mission_category_ids: cleaned })
    .eq("collaborator_id", auth.collaborator.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/missions");
  return { success: true };
}
