"use server";

import { createClient } from "@/lib/supabase/server";
import type { GlobalSearchResult, SearchEntityType } from "@/lib/search/types";

const MIN_QUERY_LENGTH = 2;

export async function searchGlobalAction(
  query: string,
): Promise<{ results: GlobalSearchResult[]; error?: string }> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { results: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_global", {
    p_query: trimmed,
    p_limit: 25,
  });

  if (error) {
    console.error("search_global:", error.message);
    return { results: [], error: error.message };
  }

  const results: GlobalSearchResult[] = (data ?? []).map(
    (row: {
      entity_type: string;
      entity_id: string;
      title: string;
      subtitle: string | null;
      rank: number;
    }) => ({
      entity_type: row.entity_type as SearchEntityType,
      entity_id: row.entity_id,
      title: row.title,
      subtitle: row.subtitle,
      rank: Number(row.rank),
    }),
  );

  return { results };
}
