export type CollaboratorRole = "direction" | "manager" | "collaborator";

export type CollaboratorStatus = "actif" | "inactif" | "sorti";

export type CollaboratorListItem = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  job_title: string;
  team_id: string;
  team_name: string;
  profile_picture_url: string | null;
};

export type TeamCategoryItem = {
  id: string;
  label: string;
};

export type TeamListItem = {
  id: string;
  team_name: string;
  notes: string | null;
  categories: TeamCategoryItem[];
  members: CollaboratorListItem[];
};
