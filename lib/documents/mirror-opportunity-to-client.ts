import { revalidateCrmEntity } from "@/lib/revalidate-crm-entity";
import { looseClient } from "@/lib/supabase/loose";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Après liaison d'un document à une opportunité, crée aussi le lien
 * `client_document` pour le client de l'opportunité (si présent).
 */
export async function mirrorOpportunityDocumentToClient(
  supabase: SupabaseClient,
  opportunityId: string,
  documentId: string,
): Promise<{ clientId: string | null; error: string | null }> {
  const db = looseClient(supabase);
  const { data: opportunity, error: oppError } = await db
    .from("opportunity")
    .select("client_id")
    .eq("id", opportunityId)
    .maybeSingle();

  if (oppError) {
    return { clientId: null, error: oppError.message };
  }

  const clientId = opportunity?.client_id ?? null;
  if (!clientId) {
    return { clientId: null, error: null };
  }

  const { error: linkError } = await db.from("client_document").upsert(
    { client_id: clientId, document_id: documentId },
    { onConflict: "client_id,document_id", ignoreDuplicates: true },
  );

  if (linkError) {
    return { clientId, error: linkError.message };
  }

  revalidateCrmEntity("client", clientId);
  return { clientId, error: null };
}
