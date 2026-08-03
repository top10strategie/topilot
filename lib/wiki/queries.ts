import { createClient } from "@/lib/supabase/server";
import type {
  LinkedWikiItem,
  WikiCategoryItem,
  WikiLinkOption,
  WikiListItem,
} from "./types";

const WIKI_SELECT = `
  id,
  title,
  content_html,
  content_text,
  tags,
  created_at,
  updated_at,
  wiki_category (
    category_id,
    category ( id, label )
  )
`;

type WikiRow = {
  id: string;
  title: string;
  content_html: string;
  content_text: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
  wiki_category:
    | Array<{
        category_id: string;
        category:
          | { id: string; label: string }
          | { id: string; label: string }[]
          | null;
      }>
    | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapCategories(row: WikiRow): WikiCategoryItem[] {
  const items: WikiCategoryItem[] = [];
  for (const link of row.wiki_category ?? []) {
    const category = asSingle(link.category);
    if (category) {
      items.push({ id: category.id, label: category.label });
    }
  }
  return items.sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

function mapListItem(row: WikiRow): WikiListItem {
  return {
    id: row.id,
    title: row.title,
    content_html: row.content_html,
    content_text: row.content_text,
    tags: row.tags ?? [],
    categories: mapCategories(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapLinkedItem(row: WikiRow): LinkedWikiItem {
  return {
    id: row.id,
    title: row.title,
    tags: row.tags ?? [],
    categories: mapCategories(row),
    updated_at: row.updated_at,
  };
}

export async function listWikis(): Promise<WikiListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select(WIKI_SELECT)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listWikis:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }

  return ((data ?? []) as unknown as WikiRow[]).map(mapListItem);
}

export async function getWikiById(id: string): Promise<WikiListItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select(WIKI_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getWikiById:", error);
    throw new Error(`Impossible de charger le wiki : ${error.message}`);
  }
  if (!data) return null;
  return mapListItem(data as unknown as WikiRow);
}

async function listWikisByIds(ids: string[]): Promise<LinkedWikiItem[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select(WIKI_SELECT)
    .in("id", unique)
    .order("title");

  if (error) {
    console.error("listWikisByIds:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }

  return ((data ?? []) as unknown as WikiRow[]).map(mapLinkedItem);
}

export async function listWikisByClientId(
  clientId: string,
): Promise<LinkedWikiItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_wiki")
    .select("wiki_id")
    .eq("client_id", clientId);

  if (error) {
    console.error("listWikisByClientId:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }
  return listWikisByIds((data ?? []).map((row) => row.wiki_id));
}

export async function listWikisByMissionId(
  missionId: string,
): Promise<LinkedWikiItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission_wiki")
    .select("wiki_id")
    .eq("mission_id", missionId);

  if (error) {
    console.error("listWikisByMissionId:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }
  return listWikisByIds((data ?? []).map((row) => row.wiki_id));
}

export async function listWikiLinkOptions(): Promise<WikiLinkOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select("id, title")
    .order("title");

  if (error) {
    console.error("listWikiLinkOptions:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
  }));
}
