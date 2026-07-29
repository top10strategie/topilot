export type CollaboratorStatus = "actif" | "inactif" | "sorti";

export type AuthGateState = {
  collaborator_id: string;
  status: CollaboratorStatus;
  must_change_password: boolean;
};
