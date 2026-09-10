import { createClient } from "@/lib/supabase/server";
import { resolveVisualPublicUrl } from "@/lib/visuels/public-url";
import {
  CLIENTS_PAGE_SIZE,
  type ClientsListFilters,
} from "./list-filters";
import type {
  ClientCategoryItem,
  ClientDetail,
  ClientDocumentItem,
  ClientListItem,
  ClientMainContactItem,
  ClientOption,
  ClientResponsibleItem,
  ContactClientItem,
} from "./types";

type DocumentVisualRow = {
  id: string;
  file_path: string | null;
  is_visual: boolean;
  document_name?: string;
  storage_type?: string;
  url?: string | null;
};

function mapContact(row: {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  is_main: boolean;
  notes: string | null;
  phone_number: string | null;
  email_address: string | null;
  profile_picture_id: string | null;
  profile_picture: DocumentVisualRow | null;
  created_at: string;
}): ContactClientItem {
  return {
    id: row.id,
    client_id: row.client_id,
    first_name: row.first_name,
    last_name: row.last_name,
    job_title: row.job_title,
    is_main: row.is_main,
    notes: row.notes,
    phone_number: row.phone_number,
    email_address: row.email_address,
    profile_picture_id: row.profile_picture_id,
    profile_picture_url: resolveVisualPublicUrl(row.profile_picture),
    created_at: row.created_at,
  };
}

type ClientListRow = {
  id: string;
  client_name: string;
  website: string;
  address_city: string | null;
  is_active: boolean;
  facilitator: boolean;
  main_collaborator_id: string;
  logo: DocumentVisualRow | null;
  main_collaborator: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: DocumentVisualRow | null;
  } | null;
  client_category: Array<{
    category: { id: string; label: string } | null;
  }> | null;
  contact_client: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    email_address: string | null;
    is_main: boolean;
  }> | null;
  mission: Array<{ count: number }> | null;
  opportunity: Array<{ count: number }> | null;
};

function mapListItem(row: ClientListRow): ClientListItem {
  const categories: ClientCategoryItem[] = (row.client_category ?? [])
    .map((link) => link.category)
    .filter((c): c is { id: string; label: string } => Boolean(c))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const mainContactRow =
    (row.contact_client ?? []).find((c) => c.is_main) ??
    (row.contact_client ?? [])[0] ??
    null;

  const main_contact: ClientMainContactItem | null = mainContactRow
    ? {
        id: mainContactRow.id,
        first_name: mainContactRow.first_name,
        last_name: mainContactRow.last_name,
        phone_number: mainContactRow.phone_number,
        email_address: mainContactRow.email_address,
      }
    : null;

  const responsible: ClientResponsibleItem = row.main_collaborator
    ? {
        id: row.main_collaborator.id,
        first_name: row.main_collaborator.first_name,
        last_name: row.main_collaborator.last_name,
        profile_picture_url: resolveVisualPublicUrl(
          row.main_collaborator.profile_picture ?? null,
        ),
      }
    : {
        id: row.main_collaborator_id,
        first_name: "?",
        last_name: "?",
        profile_picture_url: null,
      };

  return {
    id: row.id,
    client_name: row.client_name,
    website: row.website,
    address_city: row.address_city,
    is_active: row.is_active,
    facilitator: row.facilitator,
    logo_url: resolveVisualPublicUrl(row.logo),
    categories,
    responsible,
    main_contact,
    mission_count: row.mission?.[0]?.count ?? 0,
    opportunity_count: row.opportunity?.[0]?.count ?? 0,
  };
}

async function loadEntityCounts(
  clientIds: string[],
): Promise<{
  missions: Map<string, number>;
  opportunities: Map<string, number>;
}> {
  const missions = new Map<string, number>();
  const opportunities = new Map<string, number>();
  if (clientIds.length === 0) {
    return { missions, opportunities };
  }

  const supabase = await createClient();

  const [missionRes, opportunityRes] = await Promise.all([
    supabase.from("mission").select("client_id").in("client_id", clientIds),
    supabase
      .from("opportunity")
      .select("client_id")
      .in("client_id", clientIds),
  ]);

  for (const row of missionRes.data ?? []) {
    const id = row.client_id as string | null;
    if (!id) continue;
    missions.set(id, (missions.get(id) ?? 0) + 1);
  }
  for (const row of opportunityRes.data ?? []) {
    const id = row.client_id as string;
    opportunities.set(id, (opportunities.get(id) ?? 0) + 1);
  }

  return { missions, opportunities };
}

/**
 * Options légères id + nom (filtres / selects hors page /clients).
 */
export async function listClientOptions(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .select("id, client_name")
    .order("client_name", { ascending: true });

  if (error) {
    console.error("listClientOptions:", error);
    throw new Error(`Impossible de charger les clients : ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    client_name: row.client_name as string,
  }));
}

/** Villes distinctes pour le filtre /clients. */
export async function listClientCities(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .select("address_city")
    .not("address_city", "is", null)
    .order("address_city", { ascending: true });

  if (error) {
    console.error("listClientCities:", error);
    throw new Error(`Impossible de charger les villes : ${error.message}`);
  }

  const cities = new Set<string>();
  for (const row of data ?? []) {
    const city = (row.address_city as string | null)?.trim();
    if (city) cities.add(city);
  }
  return [...cities].sort((a, b) => a.localeCompare(b, "fr"));
}

type ClientsPageRpcRow = {
  id: string;
  client_name: string;
  website: string;
  address_city: string | null;
  is_active: boolean;
  facilitator: boolean;
  logo_file_path: string | null;
  logo_is_visual: boolean | null;
  responsible_id: string | null;
  responsible_first_name: string | null;
  responsible_last_name: string | null;
  main_contact_id: string | null;
  main_contact_first_name: string | null;
  main_contact_last_name: string | null;
  main_contact_phone: string | null;
  main_contact_email: string | null;
  categories: unknown;
  mission_count: number;
  opportunity_count: number;
  total_count: number;
};

function mapPageRpcRow(row: ClientsPageRpcRow): ClientListItem {
  const rawCategories = row.categories;
  const categories: ClientCategoryItem[] = Array.isArray(rawCategories)
    ? rawCategories
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as { id?: unknown; label?: unknown };
          const id = typeof record.id === "string" ? record.id : "";
          const label = typeof record.label === "string" ? record.label : "";
          if (!id || !label) return null;
          return { id, label };
        })
        .filter((item): item is ClientCategoryItem => Boolean(item))
        .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    : [];

  const responsible: ClientResponsibleItem = row.responsible_id
    ? {
        id: row.responsible_id,
        first_name: row.responsible_first_name ?? "?",
        last_name: row.responsible_last_name ?? "?",
        profile_picture_url: null,
      }
    : {
        id: "",
        first_name: "?",
        last_name: "?",
        profile_picture_url: null,
      };

  const main_contact: ClientMainContactItem | null = row.main_contact_id
    ? {
        id: row.main_contact_id,
        first_name: row.main_contact_first_name ?? "",
        last_name: row.main_contact_last_name ?? "",
        phone_number: row.main_contact_phone,
        email_address: row.main_contact_email,
      }
    : null;

  return {
    id: row.id,
    client_name: row.client_name,
    website: row.website,
    address_city: row.address_city,
    is_active: row.is_active,
    facilitator: row.facilitator,
    logo_url: resolveVisualPublicUrl(
      row.logo_file_path
        ? {
            file_path: row.logo_file_path,
            is_visual: Boolean(row.logo_is_visual),
          }
        : null,
    ),
    categories,
    responsible,
    main_contact,
    mission_count: Number(row.mission_count) || 0,
    opportunity_count: Number(row.opportunity_count) || 0,
  };
}

export type ClientsPageResult = {
  clients: ClientListItem[];
  totalCount: number;
};

/**
 * Page /clients filtrée + paginée (RPC `list_clients_page`).
 */
export async function listClientsPage(
  filters: ClientsListFilters,
): Promise<ClientsPageResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_clients_page", {
    p_page: filters.page,
    p_page_size: CLIENTS_PAGE_SIZE,
    p_status: filters.status,
    p_responsible_id: filters.responsibleId || null,
    p_team_id: filters.teamId || null,
    p_city: filters.city || null,
    p_category_ids:
      filters.categoryIds.length > 0 ? filters.categoryIds : null,
    p_mission_bucket: filters.missionBucket,
    p_query: filters.q || null,
  });

  if (error) {
    console.error("listClientsPage:", error);
    throw new Error(`Impossible de charger les clients : ${error.message}`);
  }

  const rows = (data ?? []) as ClientsPageRpcRow[];
  const totalCount =
    rows.length > 0 ? Number(rows[0].total_count) || 0 : 0;

  return {
    clients: rows.map(mapPageRpcRow),
    totalCount,
  };
}

/**
 * Fiche client complète (contacts + documents).
 */
export async function getClientById(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .select(
      `
      id,
      client_name,
      website,
      address_street,
      address_city,
      address_zip,
      address_country,
      drive_link,
      is_active,
      facilitator,
      notes,
      logo_id,
      main_collaborator_id,
      logo:logo_id ( id, file_path, is_visual ),
      main_collaborator:main_collaborator_id (
        id,
        first_name,
        last_name,
        profile_picture:profile_picture_id ( id, file_path, is_visual )
      ),
      client_category (
        category:category_business!category_id ( id, label, is_private )
      ),
      contact_client (
        id,
        client_id,
        first_name,
        last_name,
        job_title,
        is_main,
        notes,
        phone_number,
        email_address,
        created_at,
        profile_picture_id,
        profile_picture:profile_picture_id ( id, file_path, is_visual )
      ),
      client_document (
        document:document_id (
          id,
          document_name,
          file_path,
          storage_type,
          is_visual,
          url
        )
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getClientById:", error);
    throw new Error(`Impossible de charger le client : ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as ClientListRow & {
    address_street: string | null;
    address_zip: string | null;
    address_country: string;
    drive_link: string | null;
    notes: string | null;
    logo_id: string | null;
    contact_client: Array<{
      id: string;
      client_id: string;
      first_name: string;
      last_name: string;
      job_title: string | null;
      is_main: boolean;
      notes: string | null;
      phone_number: string | null;
      email_address: string | null;
      created_at: string;
      profile_picture_id: string | null;
      profile_picture: DocumentVisualRow | null;
    }> | null;
    client_document: Array<{
      document: DocumentVisualRow & {
        document_name: string;
        storage_type: string;
        url: string | null;
      } | null;
    }> | null;
  };

  const counts = await loadEntityCounts([row.id]);
  const base = mapListItem({
    ...row,
    mission: [{ count: counts.missions.get(row.id) ?? 0 }],
    opportunity: [{ count: counts.opportunities.get(row.id) ?? 0 }],
  });

  const contacts = (row.contact_client ?? [])
    .map(mapContact)
    .sort((a, b) => {
      if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
      return `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`,
        "fr",
      );
    });

  const documents: ClientDocumentItem[] = (row.client_document ?? [])
    .map((link) => link.document)
    .filter(
      (
        doc,
      ): doc is DocumentVisualRow & {
        document_name: string;
        storage_type: string;
        url: string | null;
      } => Boolean(doc),
    )
    .map((doc) => ({
      id: doc.id,
      document_name: doc.document_name,
      file_path: doc.file_path,
      storage_type: doc.storage_type,
      is_visual: doc.is_visual,
      url: doc.url,
    }))
    .sort((a, b) => a.document_name.localeCompare(b.document_name, "fr"));

  return {
    ...base,
    address_street: row.address_street,
    address_zip: row.address_zip,
    address_country: row.address_country,
    drive_link: row.drive_link,
    notes: row.notes,
    logo_id: row.logo_id,
    main_collaborator_id: row.main_collaborator_id,
    contacts,
    documents,
  };
}
