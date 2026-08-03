"use server";

import { requireActiveCollaboratorAction } from "@/lib/auth/require-action";
import { listDocumentTypes } from "@/lib/categories/queries";
import type { DocumentTypeItem } from "@/lib/categories/types";
import {
  listDocumentLinkOptions,
  listDocumentsByClientId,
  listDocumentsByMissionId,
  listDocumentsByOpportunityId,
} from "@/lib/documents/queries";
import type {
  DocumentLinkEntity,
  DocumentLinkOption,
  LinkedDocumentItem,
} from "@/lib/documents/types";
import {
  listToolLinkOptions,
  listToolsByClientId,
  listToolsByMissionId,
  listToolsByOpportunityId,
} from "@/lib/tools/queries";
import type { LinkedToolItem } from "@/lib/tools/types";
import {
  listWikiLinkOptions,
  listWikisByClientId,
  listWikisByMissionId,
} from "@/lib/wiki/queries";
import type { LinkedWikiItem, WikiLinkOption } from "@/lib/wiki/types";
import { isUuid } from "@/lib/uuid";

export type EntityDocumentationLinksPayload = {
  linkedDocuments: LinkedDocumentItem[];
  documentLinkOptions: DocumentLinkOption[];
  documentTypes: DocumentTypeItem[];
  linkedTools: LinkedToolItem[];
  toolLinkOptions: Array<{ id: string; tool_name: string }>;
  linkedWikis: LinkedWikiItem[];
  wikiLinkOptions: WikiLinkOption[];
};

/**
 * Charge listes liées + options pour les sections Documentations d'un tiroir.
 */
export async function fetchEntityDocumentationLinks(input: {
  entity: DocumentLinkEntity;
  entityId: string;
  /** Inclure wikis (client / mission uniquement). */
  includeWikis?: boolean;
}): Promise<
  | { success: true; data: EntityDocumentationLinksPayload }
  | { success: false; error: string }
> {
  const auth = await requireActiveCollaboratorAction();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const entityId = input.entityId.trim();
  if (!isUuid(entityId)) {
    return { success: false, error: "Identifiant invalide." };
  }

  const includeWikis =
    input.includeWikis ??
    (input.entity === "client" || input.entity === "mission");

  try {
    const [
      linkedDocuments,
      documentLinkOptions,
      documentTypes,
      linkedTools,
      toolLinkOptions,
      linkedWikis,
      wikiLinkOptions,
    ] = await Promise.all([
      input.entity === "client"
        ? listDocumentsByClientId(entityId)
        : input.entity === "mission"
          ? listDocumentsByMissionId(entityId)
          : listDocumentsByOpportunityId(entityId),
      listDocumentLinkOptions(),
      listDocumentTypes(),
      input.entity === "client"
        ? listToolsByClientId(entityId)
        : input.entity === "mission"
          ? listToolsByMissionId(entityId)
          : listToolsByOpportunityId(entityId),
      listToolLinkOptions(),
      includeWikis
        ? input.entity === "client"
          ? listWikisByClientId(entityId)
          : input.entity === "mission"
            ? listWikisByMissionId(entityId)
            : Promise.resolve([] as LinkedWikiItem[])
        : Promise.resolve([] as LinkedWikiItem[]),
      includeWikis &&
      (input.entity === "client" || input.entity === "mission")
        ? listWikiLinkOptions()
        : Promise.resolve([] as WikiLinkOption[]),
    ]);

    return {
      success: true,
      data: {
        linkedDocuments,
        documentLinkOptions,
        documentTypes,
        linkedTools,
        toolLinkOptions,
        linkedWikis,
        wikiLinkOptions,
      },
    };
  } catch (error) {
    console.error("fetchEntityDocumentationLinks:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de charger les documentations.",
    };
  }
}
