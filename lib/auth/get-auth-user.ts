import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Utilisateur Auth de la requête.
 * `React.cache` déduplique layout (`getCurrentCollaborator`) et page
 * (`getOwnProfile`) : un seul appel réseau `getUser` par rendu.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
