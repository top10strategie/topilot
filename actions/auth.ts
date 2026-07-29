"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Remet must_change_password à false après un changement de mot de passe réussi.
 * Utilise le service role (champ jamais exposé / modifiable côté client).
 */
export async function clearMustChangePassword(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Session invalide ou expirée." };
  }

  const admin = createAdminClient();

  const { data: collaborator, error: collaboratorError } = await admin
    .from("collaborator")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("status", "actif")
    .maybeSingle();

  if (collaboratorError) {
    console.error("clearMustChangePassword — lecture collaborator:", collaboratorError);
    return {
      success: false,
      error: `Impossible de vérifier le collaborateur : ${collaboratorError.message}`,
    };
  }

  if (!collaborator) {
    return {
      success: false,
      error: "Collaborateur actif introuvable pour cette session.",
    };
  }

  const { error: updateError } = await admin
    .from("setting")
    .update({ must_change_password: false })
    .eq("collaborator_id", collaborator.id);

  if (updateError) {
    console.error("clearMustChangePassword — update setting:", updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
