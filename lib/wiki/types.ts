export type WikiCategoryItem = {
  id: string;
  label: string;
};

export type WikiListItem = {
  id: string;
  title: string;
  content_html: string;
  content_text: string;
  tags: string[];
  categories: WikiCategoryItem[];
  created_at: string;
  updated_at: string | null;
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
