import { cache } from "react";
import { getAuthUser } from "@/lib/auth/get-auth-user";
import { getCurrentCollaborator } from "@/lib/auth/get-current-collaborator";
import { createClient } from "@/lib/supabase/server";
import { resolveVisualPublicUrl } from "@/lib/visuels/public-url";
import type { AppTheme, OwnProfile } from "./types";

type DocumentVisualRow = {
  id: string;
  file_path: string | null;
  is_visual: boolean;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseUuidArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .replace(/^{|}$/g, "")
      .split(",")
      .map((id) => id.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }
  return [];
}

/**
 * Préférences catégories missions du collaborateur connecté.
 * Request-scoped : réutilise `getCurrentCollaborator` (évite 2 RTT auth/collab).
 */
export const getPreferredMissionCategoryIds = cache(
  async (): Promise<string[]> => {
    const collaborator = await getCurrentCollaborator();
    if (!collaborator) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("setting")
      .select("preferred_mission_category_ids")
      .eq("collaborator_id", collaborator.id)
      .maybeSingle();

    if (error) {
      console.error("getPreferredMissionCategoryIds:", error);
      return [];
    }

    return parseUuidArray(data?.preferred_mission_category_ids);
  },
);

export const getOwnProfile = cache(async (): Promise<OwnProfile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

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
      profile_picture:profile_picture_id ( id, file_path, is_visual ),
      setting ( theme, home_widgets, preferred_mission_category_ids )
    `,
    )
    .eq("auth_user_id", user.id)
    .eq("status", "actif")
    .maybeSingle();

  if (error || !data) {
    console.error("getOwnProfile:", error?.message);
    return null;
  }

  const team = unwrapOne(
    data.team as { team_name: string } | { team_name: string }[] | null,
  );
  const picture = unwrapOne(
    data.profile_picture as
      | DocumentVisualRow
      | DocumentVisualRow[]
      | null,
  );
  const setting = unwrapOne(
    data.setting as
      | {
          theme: AppTheme;
          home_widgets: string[] | null;
          preferred_mission_category_ids: unknown;
        }
      | {
          theme: AppTheme;
          home_widgets: string[] | null;
          preferred_mission_category_ids: unknown;
        }[]
      | null,
  );

  return {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    role: data.role,
    status: data.status,
    job_title: data.job_title,
    team_id: data.team_id,
    team_name: team?.team_name ?? "—",
    profile_picture_id: data.profile_picture_id as string | null,
    profile_picture_url: resolveVisualPublicUrl(picture),
    theme: setting?.theme ?? "systeme",
    home_widgets: Array.isArray(setting?.home_widgets)
      ? setting.home_widgets
      : [],
    preferred_mission_category_ids: parseUuidArray(
      setting?.preferred_mission_category_ids,
    ),
  };
});
