export type DocumentStorageType = "supabase" | "url";

export type DocumentLinkedEntityKind =
  | "client"
  | "opportunity"
  | "mission"
  | "collaborator"
  | "contact";

export type DocumentLinkedEntity = {
  kind: DocumentLinkedEntityKind;
  id: string;
  name: string;
};

export type DocumentTypeRef = {
  id: string;
  label: string;
};

/** Document pour la liste `/documents` (dernière version ou historique filtré). */
export type DocumentListItem = {
  id: string;
  document_name: string;
  document_type: DocumentTypeRef;
  storage_type: DocumentStorageType;
  file_path: string | null;
  url: string | null;
  is_visual: boolean;
  /** URL publique vignette (bucket visuels) si applicable. */
  preview_url: string | null;
  version_number: number;
  parent_document_id: string | null;
  /** Racine de lignée (= parent ou self). */
  lineage_root_id: string;
  /** True si cette ligne est la version max de sa lignée. */
  is_latest: boolean;
  created_at: string;
  updated_at: string | null;
  linked: DocumentLinkedEntity[];
};

/** Résumé pour sections Documentation des fiches. */
export type LinkedDocumentItem = {
  id: string;
  document_name: string;
  storage_type: DocumentStorageType;
  file_path: string | null;
  url: string | null;
  is_visual: boolean;
  version_number: number;
  document_type: DocumentTypeRef;
};

export type DocumentLinkEntity = "client" | "mission" | "opportunity";

export type DocumentLinkOption = {
  id: string;
  document_name: string;
};
