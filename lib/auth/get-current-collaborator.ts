import { createClient } from "@/lib/supabase/server";
import type { CurrentCollaborator } from "@/lib/auth/collaborator-display";

export type { CurrentCollaborator } from "@/lib/auth/collaborator-display";

export async function getCurrentCollaborator(): Promise<CurrentCollaborator | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("collaborator")
    .select("id, first_name, last_name, email, role")
    .eq("auth_user_id", user.id)
    .eq("status", "actif")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
