import { createClient } from "@/lib/supabase/server";
import { resolveVisualPublicUrl } from "@/lib/visuels/public-url";
import type {
  ClientCategoryItem,
  ClientDetail,
  ClientDocumentItem,
  ClientListItem,
  ClientMainContactItem,
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

function mapResponsible(row: {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture: DocumentVisualRow | null;
}): ClientResponsibleItem {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    profile_picture_url: resolveVisualPublicUrl(row.profile_picture),
  };
}

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
    profile_picture_url: resolveVisualPublicUrl(row.profile_picture),
    created_at: row.created_at,
  };
}

const CLIENT_LIST_SELECT = `
  id,
  client_name,
  website,
  address_city,
  is_active,
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
    first_name,
    last_name,
    phone_number,
    email_address,
    is_main
  )
`;

type ClientListRow = {
  id: string;
  client_name: string;
  website: string;
  address_city: string | null;
  is_active: boolean;
  main_collaborator_id: string;
  logo: DocumentVisualRow | null;
  main_collaborator: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture: DocumentVisualRow | null;
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
};

function mapListItem(
  row: ClientListRow,
  missionCount = 0,
  opportunityCount = 0,
): ClientListItem {
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

  const responsible = row.main_collaborator
    ? mapResponsible(row.main_collaborator)
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
    logo_url: resolveVisualPublicUrl(row.logo),
    categories,
    responsible,
    main_contact,
    mission_count: missionCount,
    opportunity_count: opportunityCount,
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
 * Liste tous les clients (actifs et inactifs) pour la page /clients.
 */
export async function listClients(): Promise<ClientListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .select(CLIENT_LIST_SELECT)
    .order("client_name", { ascending: true });

  if (error) {
    console.error("listClients:", error);
    throw new Error(`Impossible de charger les clients : ${error.message}`);
  }

  const rows = (data ?? []) as unknown as ClientListRow[];
  const counts = await loadEntityCounts(rows.map((r) => r.id));

  return rows.map((row) =>
    mapListItem(
      row,
      counts.missions.get(row.id) ?? 0,
      counts.opportunities.get(row.id) ?? 0,
    ),
  );
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
  const base = mapListItem(
    row,
    counts.missions.get(row.id) ?? 0,
    counts.opportunities.get(row.id) ?? 0,
  );

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
