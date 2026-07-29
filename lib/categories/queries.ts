import { createClient } from "@/lib/supabase/server";
import type { CategoryItem, DocumentTypeItem } from "./types";

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
