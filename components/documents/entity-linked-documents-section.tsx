"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  linkDocumentToEntity,
  unlinkDocumentFromEntity,
} from "@/actions/document-links";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { DocumentFormDrawer } from "@/components/documents/document-form-drawer";
import { EntityLinkedResourceSection } from "@/components/layout/entity-linked-resource-section";
import { Badge } from "@/components/ui/badge";
import type { DocumentTypeItem } from "@/lib/categories/types";
import type {
  DocumentLinkEntity,
  DocumentLinkOption,
  LinkedDocumentItem,
} from "@/lib/documents/types";

type EntityLinkedDocumentsSectionProps = {
  entity: DocumentLinkEntity;
  entityId: string;
  documents: LinkedDocumentItem[];
  linkOptions: DocumentLinkOption[];
  documentTypes: DocumentTypeItem[];
  onLinksChange?: () => void;
  readOnly?: boolean;
};

function documentHref(doc: LinkedDocumentItem): string {
  if (doc.storage_type === "url" && doc.url) return doc.url;
  return `/api/documents/${doc.id}/file`;
}

/**
 * Section Documentation « Documents » : liste, ouverture, lien / création, retrait.
 */
export function EntityLinkedDocumentsSection({
  entity,
  entityId,
  documents,
  linkOptions,
  documentTypes,
  onLinksChange,
  readOnly = false,
}: EntityLinkedDocumentsSectionProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();

  const notifyChange = () => {
    if (onLinksChange) onLinksChange();
    else router.refresh();
  };

  return (
    <EntityLinkedResourceSection
      title="Documents"
      items={documents}
      linkOptions={linkOptions}
      readOnly={readOnly}
      onLinksChange={onLinksChange}
      getItemLabel={(doc) => doc.document_name}
      getOptionLabel={(opt) => opt.document_name}
      renderItemMeta={(doc) => (
        <>
          <Badge variant="secondary" className="text-[10px]">
            {doc.document_type.label}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            V{doc.version_number}
          </Badge>
        </>
      )}
      onItemClick={(doc) => {
        window.open(documentHref(doc), "_blank", "noopener,noreferrer");
      }}
      onCreateAndLink={() => {
        void pushDrawer<{ id: string; document_name: string }>({
          title: "Nouveau document",
          content: (helpers) => (
            <DocumentFormDrawer
              mode="create"
              documentTypes={documentTypes}
              linkEntity={entity}
              linkEntityId={entityId}
              helpers={helpers}
            />
          ),
        }).then((created) => {
          if (!created) return;
          toast.success("Document créé et lié.");
          notifyChange();
        });
      }}
      onLinkExisting={(documentId) =>
        linkDocumentToEntity({ entity, entityId, documentId })
      }
      onUnlink={(doc) =>
        unlinkDocumentFromEntity({
          entity,
          entityId,
          documentId: doc.id,
        })
      }
      labels={{
        addAction: "Ajouter un document",
        empty: "Aucun document lié.",
        linkDialogTitle: "Lier un document",
        linkDialogDescription:
          "Associez un document existant, ou créez-en un nouveau (il sera lié automatiquement).",
        existingSelectLabel: "Document existant",
        selectPlaceholder: "Sélectionner un document",
        allLinkedPlaceholder: "Tous les documents sont déjà liés",
        selectUnsetItem: "Sélectionner un document",
        createNew: "Créer un nouveau document",
        linkSelectError: "Sélectionnez un document.",
        linkedSuccess: "Document lié.",
        unlinkAction: "Retirer le document",
        unlinkDialogTitle: "Retirer le document",
        unlinkDialogDescription: (name) => (
          <>
            Retirer <strong>{name}</strong> de cette fiche ? Le document reste
            dans la bibliothèque.
          </>
        ),
        unlinkedSuccess: "Document retiré.",
      }}
    />
  );
}
