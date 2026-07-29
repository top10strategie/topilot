import {
  getCurrentCollaborator,
  type CurrentCollaborator,
} from "@/lib/auth/get-current-collaborator";
import {
  canManageCollaboratorsAndTeams,
  isManagerOrDirection,
} from "@/lib/auth/roles";

export type AuthActionError = {
  success: false;
  error: string;
};

/**
 * Garantit un collaborateur actif authentifié pour une server action.
 */
export async function requireActiveCollaboratorAction(): Promise<
  | { success: true; collaborator: CurrentCollaborator }
  | AuthActionError
> {
  const collaborator = await getCurrentCollaborator();
  if (!collaborator) {
    return {
      success: false,
      error: "Session invalide ou collaborateur inactif.",
    };
  }
  return { success: true, collaborator };
}

/**
 * Réservé Manager / Direction (CRUD collabs & pôles).
 */
export async function requireManagerOrDirectionAction(): Promise<
  | { success: true; collaborator: CurrentCollaborator }
  | AuthActionError
> {
  const result = await requireActiveCollaboratorAction();
  if (!result.success) {
    return result;
  }
  if (!canManageCollaboratorsAndTeams(result.collaborator.role)) {
    return {
      success: false,
      error:
        "Action réservée aux rôles Manager et Direction.",
    };
  }
  return result;
}

export { isManagerOrDirection, canManageCollaboratorsAndTeams };
