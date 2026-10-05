"use server";

import { cookies } from "next/headers";
import { isPasswordRecoveryOrInviteSession } from "@/lib/auth/password-recovery-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PURGE_REAUTH_COOKIE } from "@/lib/data-admin/purge";
import { createClient } from "@/lib/supabase/server";

/**
 * Coupe la session côté cookies serveur — évite d’embarquer
 * `@supabase/ssr` browser client dans le shell app (LogoutDialog).
 * La navigation vers login est faite côté client en dur (`location.assign`)
 * pour démonter la modale / le portail Radix et ne pas re-rendre la page
 * protégée en `anon`.
 */
export async function signOutAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const jar = await cookies();
  jar.delete(PURGE_REAUTH_COOKIE);

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("signOutAction:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Flux `/auth/update-password` : reset e-mail / invitation / must_change_password.
 * Interdit pour une session login normale (changement volontaire → /settings).
 */
export async function completeForcedPasswordChange(password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return {
      success: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Session invalide ou expirée." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const admin = createAdminClient();
  const { data: collaborator, error: collaboratorError } = await admin
    .from("collaborator")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("status", "actif")
    .maybeSingle();

  if (collaboratorError) {
    console.error(
      "completeForcedPasswordChange — lecture collaborator:",
      collaboratorError,
    );
    return { success: false, error: "Impossible de vérifier le compte." };
  }

  let mustChange = false;
  if (collaborator) {
    const { data: setting, error: settingReadError } = await admin
      .from("setting")
      .select("must_change_password")
      .eq("collaborator_id", collaborator.id)
      .maybeSingle();
    if (settingReadError) {
      console.error(
        "completeForcedPasswordChange — lecture setting:",
        settingReadError,
      );
      return { success: false, error: "Impossible de vérifier le compte." };
    }
    mustChange = Boolean(setting?.must_change_password);
  }

  const recovery = isPasswordRecoveryOrInviteSession(session);
  if (!mustChange && !recovery) {
    return {
      success: false,
      error:
        "Utilisez la page Paramètres pour un changement de mot de passe volontaire.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: trimmed,
  });
  if (updateError) {
    console.error("completeForcedPasswordChange — updateUser:", updateError);
    return {
      success: false,
      error: updateError.message || "Impossible de mettre à jour le mot de passe.",
    };
  }

  if (!mustChange || !collaborator) {
    return { success: true };
  }

  const { error: settingError } = await admin
    .from("setting")
    .update({ must_change_password: false })
    .eq("collaborator_id", collaborator.id);

  if (settingError) {
    console.error("completeForcedPasswordChange — update setting:", settingError);
    return {
      success: false,
      error: `Mot de passe mis à jour, mais la préférence n'a pas pu être synchronisée : ${settingError.message}`,
    };
  }

  return { success: true };
}
