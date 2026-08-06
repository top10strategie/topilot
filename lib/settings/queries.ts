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

export async function getOwnProfile(): Promise<OwnProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
          preferred_mission_category_ids: string[] | null;
        }
      | {
          theme: AppTheme;
          home_widgets: string[] | null;
          preferred_mission_category_ids: string[] | null;
        }[]
      | null,
  );

  const preferredIds = Array.isArray(setting?.preferred_mission_category_ids)
    ? setting.preferred_mission_category_ids.filter(
        (id): id is string => typeof id === "string",
      )
    : [];

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
    profile_picture_url: resolveVisualPublicUrl(picture),
    theme: setting?.theme ?? "systeme",
    home_widgets: Array.isArray(setting?.home_widgets)
      ? setting.home_widgets
      : [],
    preferred_mission_category_ids: preferredIds,
  };
}
