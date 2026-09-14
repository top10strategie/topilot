import { createClient } from "@/lib/supabase/server";
import type {
  LinkedWikiItem,
  WikiCategoryItem,
  WikiDetail,
  WikiLinkOption,
  WikiListItem,
} from "./types";

const WIKI_LIST_SELECT = `
  id,
  title,
  tags,
  created_at,
  updated_at,
  wiki_category (
    category_id,
    category ( id, label )
  )
`;

const WIKI_DETAIL_SELECT = `
  ${WIKI_LIST_SELECT},
  content_html,
  content_text
`;

type WikiCategoryLink = {
  category_id: string;
  category:
    | { id: string; label: string }
    | { id: string; label: string }[]
    | null;
};

type WikiListRow = {
  id: string;
  title: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
  wiki_category: WikiCategoryLink[] | null;
};

type WikiDetailRow = WikiListRow & {
  content_html: string;
  content_text: string;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapCategories(row: WikiListRow): WikiCategoryItem[] {
  const items: WikiCategoryItem[] = [];
  for (const link of row.wiki_category ?? []) {
    const category = asSingle(link.category);
    if (category) {
      items.push({ id: category.id, label: category.label });
    }
  }
  return items.sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

function mapListItem(row: WikiListRow): WikiListItem {
  return {
    id: row.id,
    title: row.title,
    tags: row.tags ?? [],
    categories: mapCategories(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapDetail(row: WikiDetailRow): WikiDetail {
  return {
    ...mapListItem(row),
    content_html: row.content_html,
    content_text: row.content_text,
  };
}

function mapLinkedItem(row: WikiListRow): LinkedWikiItem {
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
    .select(WIKI_LIST_SELECT)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listWikis:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }

  return ((data ?? []) as unknown as WikiListRow[]).map(mapListItem);
}

export async function getWikiById(id: string): Promise<WikiDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select(WIKI_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getWikiById:", error);
    throw new Error(`Impossible de charger le wiki : ${error.message}`);
  }
  if (!data) return null;
  return mapDetail(data as unknown as WikiDetailRow);
}

async function listWikisByIds(ids: string[]): Promise<LinkedWikiItem[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select(WIKI_LIST_SELECT)
    .in("id", unique)
    .order("title");

  if (error) {
    console.error("listWikisByIds:", error);
    throw new Error(`Impossible de charger les wikis : ${error.message}`);
  }

  return ((data ?? []) as unknown as WikiListRow[]).map(mapLinkedItem);
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
