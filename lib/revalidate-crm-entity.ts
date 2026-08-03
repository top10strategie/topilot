import { revalidatePath } from "next/cache";

/** Entités CRM liables via tables de jonction (docs / outils). */
export type CrmLinkEntity = "client" | "mission" | "opportunity";

/**
 * Invalide la fiche + liste de l'entité CRM, plus des chemins optionnels
 * (ex. `/documents`, `/tools`).
 */
export function revalidateCrmEntity(
  entity: CrmLinkEntity,
  entityId: string,
  extraPaths: string[] = [],
): void {
  if (entity === "client") {
    revalidatePath(`/clients/${entityId}`);
    revalidatePath("/clients");
  } else if (entity === "mission") {
    revalidatePath(`/missions/${entityId}`);
    revalidatePath("/missions");
  } else {
    revalidatePath(`/opportunities/${entityId}`);
    revalidatePath("/opportunities");
  }
  for (const path of extraPaths) {
    revalidatePath(path);
  }
}

export function documentJunctionTable(entity: CrmLinkEntity): string {
  if (entity === "client") return "client_document";
  if (entity === "mission") return "mission_document";
  return "opportunity_document";
}

export function toolJunctionTable(entity: CrmLinkEntity): string {
  if (entity === "client") return "client_tool";
  if (entity === "mission") return "mission_tool";
  return "opportunity_tool";
}

export function crmEntityFk(entity: CrmLinkEntity): string {
  if (entity === "client") return "client_id";
  if (entity === "mission") return "mission_id";
  return "opportunity_id";
}
