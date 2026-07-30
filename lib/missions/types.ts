export type MissionKanbanStatus =
  | "a_faire"
  | "en_cours"
  | "terminee"
  | "archivee";

export type MissionScope = "client" | "interne";

export type MissionCategoryItem = {
  id: string;
  label: string;
};

export type MissionResponsibleItem = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
};

export type MissionClientRef = {
  id: string;
  client_name: string;
};

export type MissionOpportunityRef = {
  id: string;
  opportunity_name: string;
};

export type MissionListItem = {
  id: string;
  mission_name: string;
  mission_scope: MissionScope;
  client_id: string | null;
  collaborator_id: string;
  opportunity_id: string | null;
  kanban_status: MissionKanbanStatus;
  kanban_order: number | null;
  archived_at: string | null;
  completed_at: string | null;
  estimated_charge: number | null;
  start_at: string | null;
  end_at: string | null;
  client: MissionClientRef | null;
  opportunity: MissionOpportunityRef | null;
  responsible: MissionResponsibleItem;
  categories: MissionCategoryItem[];
};

export type MissionDetail = MissionListItem & {
  notes: string | null;
};

/** Options légères pour sélecteurs (création / édition). */
export type MissionOpportunityOption = {
  id: string;
  opportunity_name: string;
  client_id: string;
};
