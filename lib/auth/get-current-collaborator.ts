import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CurrentCollaborator } from "@/lib/auth/collaborator-display";
import type { CollaboratorRole } from "@/lib/collaborators/types";
import { resolveVisualPublicUrl } from "@/lib/visuels/public-url";

export type { CurrentCollaborator } from "@/lib/auth/collaborator-display";

type DocumentVisualRow = {
  id: string;
  file_path: string | null;
  is_visual: boolean;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Collaborateur actif de la session.
 * Mis en cache request-scoped (`React.cache`) pour éviter les doubles
 * appels layout + page dans le même rendu RSC.
 */
export const getCurrentCollaborator = cache(
  async (): Promise<CurrentCollaborator | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("collaborator")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        role,
        profile_picture:profile_picture_id ( id, file_path, is_visual )
      `,
      )
      .eq("auth_user_id", user.id)
      .eq("status", "actif")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const picture = unwrapOne(
      data.profile_picture as
        | DocumentVisualRow
        | DocumentVisualRow[]
        | null,
    );

    return {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      role: data.role as CollaboratorRole,
      profile_picture_url: resolveVisualPublicUrl(picture),
    };
  },
);
