import { getSupabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  DocumentLinkOption,
  DocumentLinkedEntity,
  DocumentListItem,
  DocumentStorageType,
  DocumentTypeRef,
  LinkedDocumentItem,
} from "./types";

const DOCUMENT_SELECT = `
  id,
  document_name,
  document_type_id,
  storage_type,
  file_path,
  url,
  is_visual,
  version_number,
  parent_document_id,
  created_at,
  updated_at,
  document_type ( id, label ),
  client_document ( client_id, client ( id, client_name ) ),
  opportunity_document ( opportunity_id, opportunity ( id, opportunity_name ) ),
  mission_document ( mission_id, mission ( id, mission_name ) ),
  logo_clients:client!logo_id ( id, client_name ),
  profile_collaborators:collaborator!profile_picture_id ( id, first_name, last_name ),
  profile_contacts:contact_client!profile_picture_id (
    id,
    first_name,
    last_name,
    client:client_id ( client_name )
  )
`;

type DocumentRow = {
  id: string;
  document_name: string;
  document_type_id: string;
  storage_type: DocumentStorageType;
  file_path: string | null;
  url: string | null;
  is_visual: boolean;
  version_number: number;
  parent_document_id: string | null;
  created_at: string;
  updated_at: string | null;
  document_type: DocumentTypeRef | DocumentTypeRef[] | null;
  client_document:
    | Array<{
        client_id: string;
        client:
          | { id: string; client_name: string }
          | { id: string; client_name: string }[]
          | null;
      }>
    | null;
  opportunity_document:
    | Array<{
        opportunity_id: string;
        opportunity:
          | { id: string; opportunity_name: string }
          | { id: string; opportunity_name: string }[]
          | null;
      }>
    | null;
  mission_document:
    | Array<{
        mission_id: string;
        mission:
          | { id: string; mission_name: string }
          | { id: string; mission_name: string }[]
          | null;
      }>
    | null;
  logo_clients:
    | Array<{ id: string; client_name: string }>
    | { id: string; client_name: string }
    | null;
  profile_collaborators:
    | Array<{ id: string; first_name: string; last_name: string }>
    | { id: string; first_name: string; last_name: string }
    | null;
  profile_contacts:
    | Array<{
        id: string;
        first_name: string;
        last_name: string;
        client:
          | { client_name: string }
          | { client_name: string }[]
          | null;
      }>
    | {
        id: string;
        first_name: string;
        last_name: string;
        client:
          | { client_name: string }
          | { client_name: string }[]
          | null;
      }
    | null;
};

function asSingle<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function resolvePreviewUrl(row: DocumentRow): string | null {
  if (!row.is_visual || !row.file_path || row.file_path === "pending") {
    return null;
  }
  const base = getSupabaseUrl().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/visuels/${row.file_path}`;
}

function mapType(row: DocumentRow): DocumentTypeRef {
  const type = asSingle(row.document_type);
  return {
    id: type?.id ?? row.document_type_id,
    label: type?.label ?? "—",
  };
}

function pushUnique(
  linked: DocumentLinkedEntity[],
  item: DocumentLinkedEntity,
) {
  if (linked.some((entry) => entry.kind === item.kind && entry.id === item.id)) {
    return;
  }
  linked.push(item);
}

function mapLinked(row: DocumentRow): DocumentLinkedEntity[] {
  const linked: DocumentLinkedEntity[] = [];

  for (const item of row.client_document ?? []) {
    const client = asSingle(item.client);
    if (client) {
      pushUnique(linked, {
        kind: "client",
        id: client.id,
        name: client.client_name,
      });
    }
  }
  for (const item of row.opportunity_document ?? []) {
    const opportunity = asSingle(item.opportunity);
    if (opportunity) {
      pushUnique(linked, {
        kind: "opportunity",
        id: opportunity.id,
        name: opportunity.opportunity_name,
      });
    }
  }
  for (const item of row.mission_document ?? []) {
    const mission = asSingle(item.mission);
    if (mission) {
      pushUnique(linked, {
        kind: "mission",
        id: mission.id,
        name: mission.mission_name,
      });
    }
  }
  for (const client of asArray(row.logo_clients)) {
    pushUnique(linked, {
      kind: "client",
      id: client.id,
      name: client.client_name,
    });
  }
  for (const collaborator of asArray(row.profile_collaborators)) {
    pushUnique(linked, {
      kind: "collaborator",
      id: collaborator.id,
      name: `${collaborator.first_name} ${collaborator.last_name}`.trim(),
    });
  }
  for (const contact of asArray(row.profile_contacts)) {
    const client = asSingle(contact.client);
    const contactName = `${contact.first_name} ${contact.last_name}`.trim();
    pushUnique(linked, {
      kind: "contact",
      id: contact.id,
      name: client?.client_name
        ? `${contactName} (${client.client_name})`
        : contactName,
    });
  }

  return linked;
}

function mapListItem(
  row: DocumentRow,
  latestVersionByRoot: Map<string, number>,
): DocumentListItem {
  const lineageRootId = row.parent_document_id ?? row.id;
  const maxVersion = latestVersionByRoot.get(lineageRootId) ?? row.version_number;
  return {
    id: row.id,
    document_name: row.document_name,
    document_type: mapType(row),
    storage_type: row.storage_type,
    file_path: row.file_path,
    url: row.url,
    is_visual: row.is_visual,
    preview_url: resolvePreviewUrl(row),
    version_number: row.version_number,
    parent_document_id: row.parent_document_id,
    lineage_root_id: lineageRootId,
    is_latest: row.version_number === maxVersion,
    created_at: row.created_at,
    updated_at: row.updated_at,
    linked: mapLinked(row),
  };
}

function mapLinkedItem(row: DocumentRow): LinkedDocumentItem {
  return {
    id: row.id,
    document_name: row.document_name,
    storage_type: row.storage_type,
    file_path: row.file_path,
    url: row.url,
    is_visual: row.is_visual,
    version_number: row.version_number,
    document_type: mapType(row),
  };
}

async function fetchLatestVersionMap(
  rows: DocumentRow[],
): Promise<Map<string, number>> {
  const roots = [
    ...new Set(rows.map((row) => row.parent_document_id ?? row.id)),
  ];
  const map = new Map<string, number>();
  if (roots.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document")
    .select("id, parent_document_id, version_number")
    .or(
      `id.in.(${roots.join(",")}),parent_document_id.in.(${roots.join(",")})`,
    );

  if (error) {
    console.error("fetchLatestVersionMap:", error);
    for (const row of rows) {
      const root = row.parent_document_id ?? row.id;
      const prev = map.get(root) ?? 0;
      if (row.version_number > prev) map.set(root, row.version_number);
    }
    return map;
  }

  for (const row of data ?? []) {
    const root = row.parent_document_id ?? row.id;
    const prev = map.get(root) ?? 0;
    if (row.version_number > prev) map.set(root, row.version_number);
  }
  return map;
}

/**
 * Liste tous les documents (toutes versions). Le filtrage « latest only »
 * se fait côté UI par défaut.
 */
export async function listDocuments(): Promise<DocumentListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document")
    .select(DOCUMENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listDocuments:", error);
    throw new Error(`Impossible de charger les documents : ${error.message}`);
  }

  const rows = (data ?? []) as unknown as DocumentRow[];
  const latestMap = await fetchLatestVersionMap(rows);
  return rows.map((row) => mapListItem(row, latestMap));
}

export async function getDocumentById(
  id: string,
): Promise<DocumentListItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document")
    .select(DOCUMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getDocumentById:", error);
    throw new Error(`Impossible de charger le document : ${error.message}`);
  }
  if (!data) return null;

  const row = data as unknown as DocumentRow;
  const latestMap = await fetchLatestVersionMap([row]);
  return mapListItem(row, latestMap);
}

/**
 * Toutes les versions d'une lignée (racine = parent ou self), triées par version desc.
 */
export async function listDocumentLineage(
  documentId: string,
): Promise<DocumentListItem[]> {
  const supabase = await createClient();
  const { data: seed, error: seedError } = await supabase
    .from("document")
    .select("id, parent_document_id")
    .eq("id", documentId)
    .maybeSingle();

  if (seedError) {
    console.error("listDocumentLineage:", seedError);
    throw new Error(
      `Impossible de charger la lignée : ${seedError.message}`,
    );
  }
  if (!seed) return [];

  const rootId = seed.parent_document_id ?? seed.id;
  const { data, error } = await supabase
    .from("document")
    .select(DOCUMENT_SELECT)
    .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("listDocumentLineage:", error);
    throw new Error(`Impossible de charger la lignée : ${error.message}`);
  }

  const rows = (data ?? []) as unknown as DocumentRow[];
  const latestMap = await fetchLatestVersionMap(rows);
  return rows.map((row) => mapListItem(row, latestMap));
}

async function listDocumentsByIds(ids: string[]): Promise<LinkedDocumentItem[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document")
    .select(DOCUMENT_SELECT)
    .in("id", unique)
    .order("document_name");

  if (error) {
    console.error("listDocumentsByIds:", error);
    throw new Error(`Impossible de charger les documents : ${error.message}`);
  }

  return ((data ?? []) as unknown as DocumentRow[]).map(mapLinkedItem);
}

export async function listDocumentsByClientId(
  clientId: string,
): Promise<LinkedDocumentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_document")
    .select("document_id")
    .eq("client_id", clientId);

  if (error) {
    console.error("listDocumentsByClientId:", error);
    throw new Error(`Impossible de charger les documents : ${error.message}`);
  }
  return listDocumentsByIds((data ?? []).map((row) => row.document_id));
}

export async function listDocumentsByMissionId(
  missionId: string,
): Promise<LinkedDocumentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission_document")
    .select("document_id")
    .eq("mission_id", missionId);

  if (error) {
    console.error("listDocumentsByMissionId:", error);
    throw new Error(`Impossible de charger les documents : ${error.message}`);
  }
  return listDocumentsByIds((data ?? []).map((row) => row.document_id));
}

export async function listDocumentsByOpportunityId(
  opportunityId: string,
): Promise<LinkedDocumentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_document")
    .select("document_id")
    .eq("opportunity_id", opportunityId);

  if (error) {
    console.error("listDocumentsByOpportunityId:", error);
    throw new Error(`Impossible de charger les documents : ${error.message}`);
  }
  return listDocumentsByIds((data ?? []).map((row) => row.document_id));
}

export async function listDocumentLinkOptions(): Promise<DocumentLinkOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_latest")
    .select("id, document_name")
    .order("document_name");

  if (error) {
    console.error("listDocumentLinkOptions:", error);
    throw new Error(`Impossible de charger les documents : ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    document_name: row.document_name as string,
  }));
}
