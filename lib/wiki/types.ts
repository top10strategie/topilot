export type WikiCategoryItem = {
  id: string;
  label: string;
};

/** Ligne de liste /wikis — sans corps HTML (chargé à l’ouverture du tiroir). */
export type WikiListItem = {
  id: string;
  title: string;
  tags: string[];
  categories: WikiCategoryItem[];
  created_at: string;
  updated_at: string | null;
};

/** Fiche complète pour édition / consultation. */
export type WikiDetail = WikiListItem & {
  content_html: string;
  content_text: string;
};

export type LinkedWikiItem = {
  id: string;
  title: string;
  tags: string[];
  categories: WikiCategoryItem[];
  updated_at: string | null;
};

export type WikiLinkEntity = "client" | "mission";

export type WikiLinkOption = {
  id: string;
  title: string;
};
