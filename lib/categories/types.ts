/** Catégorie utilitaire (outils, wikis) — table `category`. */
export type CategoryItem = {
  id: string;
  label: string;
};

/** Catégorie métier (pôles, clients, missions, opportunités) — table `category_business`. */
export type BusinessCategoryItem = {
  id: string;
  label: string;
  is_private: boolean;
};

export type DocumentTypeItem = {
  id: string;
  label: string;
  is_active: boolean;
};
