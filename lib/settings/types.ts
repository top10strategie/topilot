export type AppTheme = "clair" | "sombre" | "systeme";

export type OwnProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  job_title: string;
  team_id: string;
  team_name: string;
  profile_picture_url: string | null;
  theme: AppTheme;
  home_widgets: string[];
  preferred_mission_category_ids: string[];
};

export function themeToNext(theme: AppTheme): "light" | "dark" | "system" {
  if (theme === "clair") return "light";
  if (theme === "sombre") return "dark";
  return "system";
}

export function nextToTheme(
  value: string,
): AppTheme {
  if (value === "light") return "clair";
  if (value === "dark") return "sombre";
  return "systeme";
}
