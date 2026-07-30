import { getSupabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  OpportunityCategoryItem,
  OpportunityContactOption,
  OpportunityDetail,
  OpportunityKanbanStatus,
  OpportunityListItem,
  OpportunityPriority,
  OpportunityResponsibleItem,
} from "./types";

type DocumentVisualRow = {
  id: string;
  file_path: string | null;
  is_visual: boolean;
};

function resolveVisualPublicUrl(
  document: DocumentVisualRow | null | undefined,
): string | null {
  if (!document?.is_visual || !document.file_path) {
    return null;
  }
  const base = getSupabaseUrl().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/visuels/${document.file_path}`;
}

function mapResponsible(row: {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture: DocumentVisualRow | null;
}): OpportunityResponsibleItem {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    profile_picture_url: resolveVisualPublicUrl(row.profile_picture),
  };
}

const OPPORTUNITY_LIST_SELECT = `
  id,
  opportunity_name,
  client_id,
  contact_client_id,
  collaborator_id,
  price,
  probability_confirmation,
  average_price,
  kanban_status,
  kanban_order,
  is_active,
  priority,
  due_date_at,
  end_at,
  client:client_id ( id, client_name ),
  contact_client:contact_client_id ( id, first_name, last_name ),
  collaborator:collaborator_id (
    id,
    first_name,
    last_name,
    profile_picture:profile_picture_id ( id, file_path, is_visual )
  ),
  opportunity_category (
    category:category_id ( id, label )
  )
`;

type OpportunityListRow = {
  id: string;
  opportunity_name: string;
  client_id: string;
  contact_client_id: string | null;
  collaborator_id: string;
  price: number | string | null;
  probability_confirmation: number | string;
  average_price: number | string | null;
  kanban_status: OpportunityKanbanStatus;
  kanban_order: number | null;
  is_active: boolean;
  priority: OpportunityPriority;
  due_date_at: string | null;
  end_at: string | null;
  client: { id: string; client_name: string } | null;
  contact_client: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  collaborator: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture: DocumentVisualRow | null;
  } | null;
  opportunity_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapListItem(row: OpportunityListRow): OpportunityListItem {
  const categories: OpportunityCategoryItem[] = (row.opportunity_category ?? [])
    .map((link) => link.category)
    .filter((c): c is { id: string; label: string } => Boolean(c))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const responsible = row.collaborator
    ? mapResponsible(row.collaborator)
    : {
        id: row.collaborator_id,
        first_name: "?",
        last_name: "?",
        profile_picture_url: null,
      };

  return {
    id: row.id,
    opportunity_name: row.opportunity_name,
    client_id: row.client_id,
    contact_client_id: row.contact_client_id,
    collaborator_id: row.collaborator_id,
    price: toNumber(row.price),
    probability_confirmation: toNumber(row.probability_confirmation) ?? 0,
    average_price: toNumber(row.average_price),
    kanban_status: row.kanban_status,
    kanban_order: row.kanban_order,
    is_active: row.is_active,
    priority: row.priority,
    due_date_at: row.due_date_at,
    end_at: row.end_at,
    client: row.client ?? {
      id: row.client_id,
      client_name: "?",
    },
    contact: row.contact_client
      ? {
          id: row.contact_client.id,
          first_name: row.contact_client.first_name,
          last_name: row.contact_client.last_name,
        }
      : null,
    responsible,
    categories,
  };
}

/**
 * Liste toutes les opportunités pour /opportunities.
 */
export async function listOpportunities(): Promise<OpportunityListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity")
    .select(OPPORTUNITY_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listOpportunities:", error);
    throw new Error(
      `Impossible de charger les opportunités : ${error.message}`,
    );
  }

  const rows = (data ?? []) as unknown as OpportunityListRow[];
  return rows.map(mapListItem);
}

/**
 * Fiche opportunité complète.
 */
export async function getOpportunityById(
  id: string,
): Promise<OpportunityDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity")
    .select(
      `
      ${OPPORTUNITY_LIST_SELECT},
      action,
      source,
      notes,
      last_meeting_at
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getOpportunityById:", error);
    throw new Error(
      `Impossible de charger l'opportunité : ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as OpportunityListRow & {
    action: string | null;
    source: string | null;
    notes: string | null;
    last_meeting_at: string | null;
  };

  return {
    ...mapListItem(row),
    action: row.action,
    source: row.source,
    notes: row.notes,
    last_meeting_at: row.last_meeting_at,
  };
}

/**
 * Contacts clients pour les sélecteurs du tiroir opportunité.
 */
export async function listOpportunityContactOptions(): Promise<
  OpportunityContactOption[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_client")
    .select("id, client_id, first_name, last_name, is_main")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("listOpportunityContactOptions:", error);
    throw new Error(
      `Impossible de charger les contacts : ${error.message}`,
    );
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    client_id: row.client_id as string,
    first_name: row.first_name as string,
    last_name: row.last_name as string,
    is_main: Boolean(row.is_main),
  }));
}
