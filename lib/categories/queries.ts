import { createClient } from "@/lib/supabase/server";
import type {
  BusinessCategoryItem,
  CategoryItem,
  DocumentTypeItem,
} from "./types";

/**
 * Catégories utilitaires (`category`) — outils et wikis.
 * RLS : collaborateurs actifs.
 */
export async function listCategories(): Promise<CategoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category")
    .select("id, label")
    .order("label", { ascending: true });

  if (error) {
    console.error("listCategories:", error);
    throw new Error(`Impossible de charger les catégories : ${error.message}`);
  }

  return (data ?? []) as CategoryItem[];
}

/**
 * Catégories métier (`category_business`) — pôles, clients, missions, opportunités.
 * RLS masque les privées aux non-managers.
 */
export async function listBusinessCategories(): Promise<BusinessCategoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_business")
    .select("id, label, is_private")
    .order("label", { ascending: true });

  if (error) {
    console.error("listBusinessCategories:", error);
    throw new Error(
      `Impossible de charger les catégories métier : ${error.message}`,
    );
  }

  return (data ?? []) as BusinessCategoryItem[];
}

export async function listDocumentTypes(): Promise<DocumentTypeItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_type")
    .select("id, label, is_active")
    .order("label", { ascending: true });

  if (error) {
    console.error("listDocumentTypes:", error);
    throw new Error(
      `Impossible de charger les types documentaires : ${error.message}`,
    );
  }

  return (data ?? []) as DocumentTypeItem[];
}
