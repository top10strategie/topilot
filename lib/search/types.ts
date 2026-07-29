export type SearchEntityType =
  | "client"
  | "contact_client"
  | "collaborator"
  | "team"
  | "opportunity"
  | "mission"
  | "tool"
  | "tool_access"
  | "document"
  | "wiki";

export type GlobalSearchResult = {
  entity_type: SearchEntityType;
  entity_id: string;
  title: string;
  subtitle: string | null;
  rank: number;
};

const ENTITY_LABELS: Record<SearchEntityType, string> = {
  client: "Clients",
  contact_client: "Contacts",
  collaborator: "Collaborateurs",
  team: "Pôles",
  opportunity: "Opportunités",
  mission: "Missions",
  tool: "Outils",
  tool_access: "Accès outils",
  document: "Documents",
  wiki: "Wikis",
};

export function getSearchEntityLabel(type: SearchEntityType): string {
  return ENTITY_LABELS[type] ?? type;
}

/** Cible de navigation tant que les fiches [id] ne sont pas toutes livrées. */
export function getSearchResultHref(result: GlobalSearchResult): string {
  switch (result.entity_type) {
    case "client":
      return `/clients/${result.entity_id}`;
    case "contact_client":
      return "/clients";
    case "collaborator":
    case "team":
      return "/top10";
    case "opportunity":
      return `/opportunities/${result.entity_id}`;
    case "mission":
      return `/missions/${result.entity_id}`;
    case "tool":
    case "tool_access":
      return result.entity_type === "tool"
        ? `/tools/${result.entity_id}`
        : "/tools";
    case "document":
      return "/documents";
    case "wiki":
      return "/wikis";
    default:
      return "/";
  }
}
