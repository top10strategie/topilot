"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchEntityDocumentationLinks } from "@/actions/entity-documentation-links";
import { EntityLinkedDocumentsSection } from "@/components/documents/entity-linked-documents-section";
import { EntityLinkedToolsSection } from "@/components/tools/entity-linked-tools-section";
import { EntityLinkedWikisSection } from "@/components/wiki/entity-linked-wikis-section";
import type { CategoryItem, DocumentTypeItem } from "@/lib/categories/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type {
  DocumentLinkEntity,
  DocumentLinkOption,
  LinkedDocumentItem,
} from "@/lib/documents/types";
import type { LinkedToolItem } from "@/lib/tools/types";
import type { LinkedWikiItem, WikiLinkOption } from "@/lib/wiki/types";
import { cn } from "@/lib/utils";

type ToolLinkOption = { id: string; tool_name: string };

type EntityFormDocumentationBlockProps = {
  entity: DocumentLinkEntity;
  entityId: string;
  /** Client / mission : true. Opportunité : false. */
  includeWikis?: boolean;
  categories: CategoryItem[];
  collaborators?: CollaboratorListItem[];
  canManagePrivacy?: boolean;
};

/**
 * Sections Documentations (docs / outils / wiki) pour un tiroir création/édition.
 * Charge et recharge les listes liées localement (pas de `router.refresh`).
 */
export function EntityFormDocumentationBlock({
  entity,
  entityId,
  includeWikis = entity === "client" || entity === "mission",
  categories,
  collaborators = [],
  canManagePrivacy = false,
}: EntityFormDocumentationBlockProps) {
  const [loading, setLoading] = useState(true);
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocumentItem[]>(
    [],
  );
  const [documentLinkOptions, setDocumentLinkOptions] = useState<
    DocumentLinkOption[]
  >([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [linkedTools, setLinkedTools] = useState<LinkedToolItem[]>([]);
  const [toolLinkOptions, setToolLinkOptions] = useState<ToolLinkOption[]>([]);
  const [linkedWikis, setLinkedWikis] = useState<LinkedWikiItem[]>([]);
  const [wikiLinkOptions, setWikiLinkOptions] = useState<WikiLinkOption[]>([]);

  const reloadLinks = useCallback(() => {
    if (!entityId) return;
    void (async () => {
      const result = await fetchEntityDocumentationLinks({
        entity,
        entityId,
        includeWikis,
      });
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setLinkedDocuments(result.data.linkedDocuments);
      setDocumentLinkOptions(result.data.documentLinkOptions);
      setDocumentTypes(result.data.documentTypes);
      setLinkedTools(result.data.linkedTools);
      setToolLinkOptions(result.data.toolLinkOptions);
      setLinkedWikis(result.data.linkedWikis);
      setWikiLinkOptions(result.data.wikiLinkOptions);
      setLoading(false);
    })();
  }, [entity, entityId, includeWikis]);

  useEffect(() => {
    setLoading(true);
    reloadLinks();
  }, [reloadLinks]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des documentations…
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-6",
        includeWikis ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      <EntityLinkedDocumentsSection
        entity={entity}
        entityId={entityId}
        documents={linkedDocuments}
        linkOptions={documentLinkOptions}
        documentTypes={documentTypes}
        onLinksChange={reloadLinks}
      />
      <EntityLinkedToolsSection
        entity={entity}
        entityId={entityId}
        tools={linkedTools}
        linkOptions={toolLinkOptions}
        categories={categories}
        collaborators={collaborators}
        canManagePrivacy={canManagePrivacy}
        onLinksChange={reloadLinks}
      />
      {includeWikis && (entity === "client" || entity === "mission") ? (
        <EntityLinkedWikisSection
          entity={entity}
          entityId={entityId}
          wikis={linkedWikis}
          linkOptions={wikiLinkOptions}
          categories={categories}
          onLinksChange={reloadLinks}
        />
      ) : null}
    </div>
  );
}
