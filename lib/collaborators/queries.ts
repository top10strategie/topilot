import { createClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";
import type {
  CollaboratorListItem,
  CollaboratorRole,
  CollaboratorStatus,
  TeamCategoryItem,
  TeamListItem,
} from "./types";

type DocumentVisualRow = {
  id: string;
  file_path: string | null;
  is_visual: boolean;
};

type CollaboratorRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  job_title: string;
  team_id: string;
  profile_picture_id: string | null;
  team: { team_name: string } | null;
  profile_picture: DocumentVisualRow | null;
};

type TeamRow = {
  id: string;
  team_name: string;
  notes: string | null;
  team_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
};

function resolveVisualPublicUrl(
  document: DocumentVisualRow | null,
): string | null {
  if (!document?.is_visual || !document.file_path) {
    return null;
  }
  const base = getSupabaseUrl().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/visuels/${document.file_path}`;
}

function mapCollaborator(row: CollaboratorRow): CollaboratorListItem {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role,
    status: row.status,
    job_title: row.job_title,
    team_id: row.team_id,
    team_name: row.team?.team_name ?? "—",
    profile_picture_url: resolveVisualPublicUrl(row.profile_picture),
  };
}

/**
 * Liste tous les collaborateurs (tous statuts) avec pôle et avatar.
 * Filtrage UI éventuel (actifs vs sortis) côté page.
 */
export async function listCollaborators(): Promise<CollaboratorListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collaborator")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      role,
      status,
      job_title,
      team_id,
      profile_picture_id,
      team:team_id ( team_name ),
      profile_picture:profile_picture_id ( id, file_path, is_visual )
    `,
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("listCollaborators:", error);
    throw new Error(`Impossible de charger les collaborateurs : ${error.message}`);
  }

  return ((data ?? []) as unknown as CollaboratorRow[]).map(mapCollaborator);
}

function buildTeamsWithMembers(
  teams: TeamRow[],
  collaborators: CollaboratorListItem[],
): TeamListItem[] {
  const membersByTeam = new Map<string, CollaboratorListItem[]>();

  for (const member of collaborators) {
    const list = membersByTeam.get(member.team_id) ?? [];
    list.push(member);
    membersByTeam.set(member.team_id, list);
  }

  return teams.map((team) => {
    const categories: TeamCategoryItem[] = (team.team_category ?? [])
      .map((link) => link.category)
      .filter((category): category is TeamCategoryItem => category !== null);

    return {
      id: team.id,
      team_name: team.team_name,
      notes: team.notes,
      categories,
      members: membersByTeam.get(team.id) ?? [],
    };
  });
}

/**
 * Charge pôles + collaborateurs en un seul aller-retour applicatif.
 */
export async function loadPeopleDirectory(): Promise<{
  teams: TeamListItem[];
  collaborators: CollaboratorListItem[];
}> {
  const supabase = await createClient();

  const [teamsResult, collaborators] = await Promise.all([
    supabase
      .from("team")
      .select(
        `
        id,
        team_name,
        notes,
        team_category (
          category:category_id ( id, label )
        )
      `,
      )
      .order("team_name", { ascending: true }),
    listCollaborators(),
  ]);

  if (teamsResult.error) {
    console.error("loadPeopleDirectory:", teamsResult.error);
    throw new Error(
      `Impossible de charger les pôles : ${teamsResult.error.message}`,
    );
  }

  const teams = buildTeamsWithMembers(
    (teamsResult.data ?? []) as unknown as TeamRow[],
    collaborators,
  );

  return { teams, collaborators };
}
