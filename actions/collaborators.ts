"use server";

import { revalidatePath } from "next/cache";
import { requireManagerOrDirectionAction } from "@/lib/auth/require-action";
import { getAppOrigin } from "@/lib/app-url";
import { FORCE_PASSWORD_CHANGE_PATH } from "@/lib/auth/constants";
import type {
  CollaboratorRole,
  CollaboratorStatus,
} from "@/lib/collaborators/types";
import { isCollaboratorRole } from "@/lib/auth/roles";
import { uploadCollaboratorProfilePicture } from "@/lib/collaborators/profile-picture";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CollaboratorField =
  | "first_name"
  | "last_name"
  | "email"
  | "role"
  | "status"
  | "team_id"
  | "job_title"
  | "avatar";

export type CollaboratorActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<CollaboratorField, string>>;
    };

export type AnonymizeCollaboratorResult =
  | { success: true }
  | { success: false; error: string };

const STATUSES: CollaboratorStatus[] = ["actif", "inactif", "sorti"];

function revalidatePeoplePages() {
  revalidatePath("/top10");
  revalidatePath("/administration");
}

function isStatus(value: string): value is CollaboratorStatus {
  return STATUSES.includes(value as CollaboratorStatus);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateCollaboratorFields(input: {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  team_id: string;
  job_title: string;
}): {
  values: {
    first_name: string;
    last_name: string;
    email: string;
    role: CollaboratorRole;
    status: CollaboratorStatus;
    team_id: string;
    job_title: string;
  };
  fieldErrors: Partial<Record<CollaboratorField, string>>;
} {
  const first_name = input.first_name.trim();
  const last_name = input.last_name.trim();
  const email = normalizeEmail(input.email);
  const job_title = input.job_title.trim();
  const team_id = input.team_id.trim();
  const fieldErrors: Partial<Record<CollaboratorField, string>> = {};

  if (!first_name) fieldErrors.first_name = "Le prénom est obligatoire.";
  if (!last_name) fieldErrors.last_name = "Le nom est obligatoire.";
  if (!email) {
    fieldErrors.email = "L'email est obligatoire.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Format d'email invalide.";
  }
  if (!job_title) fieldErrors.job_title = "Le poste est obligatoire.";
  if (!team_id) fieldErrors.team_id = "Le pôle est obligatoire.";
  if (!isCollaboratorRole(input.role)) {
    fieldErrors.role = "Rôle invalide.";
  }
  if (!isStatus(input.status)) {
    fieldErrors.status = "Statut invalide.";
  }

  return {
    values: {
      first_name,
      last_name,
      email,
      role: input.role as CollaboratorRole,
      status: input.status as CollaboratorStatus,
      team_id,
      job_title,
    },
    fieldErrors,
  };
}

/** Destination post-invitation (`{{ .RedirectTo }}` dans le template e-mail). */
function inviteRedirectTo(): string {
  return `${getAppOrigin()}${FORCE_PASSWORD_CHANGE_PATH}`;
}

/**
 * Invite Auth + création collaborateur. Rollback Auth si l'INSERT échoue.
 * Avatar optionnel (FormData field `avatar`).
 */
export async function createCollaborator(
  formData: FormData,
): Promise<CollaboratorActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const { values, fieldErrors } = validateCollaboratorFields({
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: String(formData.get("status") ?? "actif"),
    team_id: String(formData.get("team_id") ?? ""),
    job_title: String(formData.get("job_title") ?? ""),
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Corrigez les erreurs du formulaire.",
      fieldErrors,
    };
  }

  const avatar = formData.get("avatar");
  const avatarFile =
    avatar instanceof File && avatar.size > 0 ? avatar : null;

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(values.email, {
      redirectTo: inviteRedirectTo(),
      data: {
        first_name: values.first_name,
        last_name: values.last_name,
      },
    });

  if (inviteError || !inviteData.user) {
    console.error("createCollaborator — invite:", inviteError);
    const message = inviteError?.message ?? "Invitation impossible.";
    const isDuplicate =
      /already|registered|exists/i.test(message) ||
      inviteError?.status === 422;
    return {
      success: false,
      error: isDuplicate
        ? "Un compte Auth existe déjà pour cet email."
        : `Invitation échouée : ${message}`,
      fieldErrors: isDuplicate ? { email: "Email déjà utilisé." } : undefined,
    };
  }

  const authUserId = inviteData.user.id;
  let profilePictureId: string | null = null;

  try {
    if (avatarFile) {
      const uploaded = await uploadCollaboratorProfilePicture(avatarFile);
      profilePictureId = uploaded.documentId;
    }

    const { data: created, error: insertError } = await supabase
      .from("collaborator")
      .insert({
        auth_user_id: authUserId,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        role: values.role,
        status: values.status,
        team_id: values.team_id,
        job_title: values.job_title,
        profile_picture_id: profilePictureId,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      throw new Error(insertError?.message ?? "INSERT collaborator échoué.");
    }

    revalidatePeoplePages();
    return { success: true, id: created.id };
  } catch (err) {
    console.error("createCollaborator — rollback:", err);
    await admin.auth.admin.deleteUser(authUserId);
    if (profilePictureId) {
      // best effort : laisse le document orphelin plutôt que bloquer le rollback Auth
    }
    const message =
      err instanceof Error ? err.message : "Création du collaborateur échouée.";
    const isDuplicate = /unique|duplicate|23505/i.test(message);
    return {
      success: false,
      error: isDuplicate
        ? "Un collaborateur existe déjà avec cet email."
        : message,
      fieldErrors: isDuplicate ? { email: "Email déjà utilisé." } : undefined,
    };
  }
}

export async function updateCollaborator(
  id: string,
  formData: FormData,
): Promise<CollaboratorActionResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant collaborateur manquant." };
  }

  const { values, fieldErrors } = validateCollaboratorFields({
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: String(formData.get("status") ?? ""),
    team_id: String(formData.get("team_id") ?? ""),
    job_title: String(formData.get("job_title") ?? ""),
  });

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
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      error: `Impossible de lire le collaborateur : ${existingError.message}`,
    };
  }
  if (!existing) {
    return { success: false, error: "Collaborateur introuvable." };
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
            : "Échec de l'upload de la photo de profil.",
        fieldErrors: { avatar: "Image invalide." },
      };
    }
  }

  if (values.email !== existing.email) {
    const admin = createAdminClient();
    const { error: authEmailError } = await admin.auth.admin.updateUserById(
      existing.auth_user_id,
      { email: values.email },
    );
    if (authEmailError) {
      return {
        success: false,
        error: `Impossible de mettre à jour l'email Auth : ${authEmailError.message}`,
        fieldErrors: { email: authEmailError.message },
      };
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("collaborator")
    .update({
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      role: values.role,
      status: values.status,
      team_id: values.team_id,
      job_title: values.job_title,
      profile_picture_id: profilePictureId,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("updateCollaborator:", updateError);
    const isDuplicate = updateError.code === "23505";
    return {
      success: false,
      error: isDuplicate
        ? "Un collaborateur existe déjà avec cet email."
        : `Mise à jour impossible : ${updateError.message}`,
      fieldErrors: isDuplicate ? { email: "Email déjà utilisé." } : undefined,
    };
  }

  if (!updated) {
    return { success: false, error: "Collaborateur introuvable." };
  }

  revalidatePeoplePages();
  return { success: true, id: updated.id };
}

/**
 * Offboarding : anonymisation métier (pas de DELETE SQL).
 * Le compte Auth est conservé (FK RESTRICT) mais le middleware bloque
 * ensuite l'accès (`status = sorti`).
 */
export async function anonymizeCollaboratorAction(
  id: string,
): Promise<AnonymizeCollaboratorResult> {
  const auth = await requireManagerOrDirectionAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (!id) {
    return { success: false, error: "Identifiant collaborateur manquant." };
  }

  if (id === auth.collaborator.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas vous anonymiser vous-même.",
    };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("collaborator")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      error: `Impossible de lire le collaborateur : ${existingError.message}`,
    };
  }
  if (!existing) {
    return { success: false, error: "Collaborateur introuvable." };
  }
  if (existing.status === "sorti") {
    return {
      success: false,
      error: "Ce collaborateur est déjà anonymisé (sorti).",
    };
  }

  const { error } = await supabase.rpc("anonymize_collaborator", {
    p_id: id,
  });

  if (error) {
    console.error("anonymizeCollaboratorAction:", error);
    return {
      success: false,
      error: `Anonymisation impossible : ${error.message}`,
    };
  }

  revalidatePeoplePages();
  return { success: true };
}
