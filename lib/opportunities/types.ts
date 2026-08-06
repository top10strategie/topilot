export type OpportunityKanbanStatus =
  | "suspect"
  | "prospect"
  | "besoin_specifie"
  | "proposition_envoyee"
  | "gagne"
  | "perdue";

export type OpportunityPriority =
  | "faible"
  | "normal"
  | "urgente"
  | "prioritaire";

export type OpportunityCategoryItem = {
  id: string;
  label: string;
};

export type OpportunityResponsibleItem = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
};

export type OpportunityClientRef = {
  id: string;
  client_name: string;
};

export type OpportunityContactRef = {
  id: string;
  first_name: string;
  last_name: string;
};

/** Contact léger pour sélecteurs (filtrable par client_id). */
export type OpportunityContactOption = {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  is_main: boolean;
};

export type OpportunityListItem = {
  id: string;
  opportunity_name: string;
  client_id: string;
  contact_client_id: string | null;
  collaborator_id: string;
  price: number | null;
  probability_confirmation: number;
  average_price: number | null;
  entry_average_price: number | null;
  kanban_status: OpportunityKanbanStatus;
  kanban_order: number | null;
  is_active: boolean;
  priority: OpportunityPriority;
  due_date_at: string | null;
  end_at: string | null;
  closed_at: string | null;
  client: OpportunityClientRef;
  contact: OpportunityContactRef | null;
  responsible: OpportunityResponsibleItem;
  categories: OpportunityCategoryItem[];
};

export type OpportunityDetail = OpportunityListItem & {
  action: string | null;
  source: string | null;
  notes: string | null;
  last_meeting_at: string | null;
};
