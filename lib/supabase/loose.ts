import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Échappatoire pour accès dynamiques (nom de table variable)
 * ou schémas hors `public` (Vault) non couverts par Database.
 */
export type LooseSupabaseClient = SupabaseClient;

export function looseClient(
  client: SupabaseClient<Database> | SupabaseClient,
): LooseSupabaseClient {
  return client as LooseSupabaseClient;
}
