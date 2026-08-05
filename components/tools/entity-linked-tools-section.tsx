"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchToolForConsultation,
  linkToolToEntity,
  unlinkToolFromEntity,
  type ToolLinkEntity,
} from "@/actions/tool-links";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityLinkedResourceSection } from "@/components/layout/entity-linked-resource-section";
import { ToolConsultationDrawer } from "@/components/tools/tool-consultation-drawer";
import { ToolFormDrawer } from "@/components/tools/tool-form-drawer";
import { Badge } from "@/components/ui/badge";
import type { CategoryItem } from "@/lib/categories/types";
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type { LinkedToolItem } from "@/lib/tools/types";

type ToolLinkOption = { id: string; tool_name: string };

type EntityLinkedToolsSectionProps = {
  entity: ToolLinkEntity;
  entityId: string;
  tools: LinkedToolItem[];
  linkOptions: ToolLinkOption[];
  categories: CategoryItem[];
  collaborators?: CollaboratorListItem[];
  canManagePrivacy?: boolean;
  onLinksChange?: () => void;
  readOnly?: boolean;
};

/**
 * Section Documentation « Outils » : liste, consultation, lien / création, retrait.
 */
export function EntityLinkedToolsSection({
  entity,
  entityId,
  tools,
  linkOptions,
  categories,
  collaborators = [],
  canManagePrivacy = false,
  onLinksChange,
  readOnly = false,
}: EntityLinkedToolsSectionProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [, startTransition] = useTransition();

  const notifyChange = () => {
    if (onLinksChange) onLinksChange();
    else router.refresh();
  };

  return (
    <EntityLinkedResourceSection
      title="Outils"
      items={tools}
      linkOptions={linkOptions}
      readOnly={readOnly}
      onLinksChange={onLinksChange}
      getItemLabel={(tool) => tool.tool_name}
      getOptionLabel={(opt) => opt.tool_name}
      renderItemMeta={(tool) =>
        tool.categories.length > 0 ? (
          <>
            {tool.categories.slice(0, 2).map((category) => (
              <Badge
                key={category.id}
                variant="secondary"
                className="text-[10px]"
              >
                {category.label}
              </Badge>
            ))}
          </>
        ) : null
      }
      onItemClick={async (tool) => {
        const result = await fetchToolForConsultation(tool.id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        void pushDrawer({
          title: result.tool.tool_name,
          content: (helpers) => (
            <ToolConsultationDrawer tool={result.tool} helpers={helpers} />
          ),
        });
      }}
      onCreateAndLink={() => {
        void pushDrawer<{ id: string; tool_name: string }>({
          title: "Nouvel outil",
          content: (helpers) => (
            <ToolFormDrawer
              mode="create"
              availableCategories={categories}
              collaborators={collaborators}
              canManagePrivacy={canManagePrivacy}
              helpers={helpers}
            />
          ),
        }).then((created) => {
          if (!created) return;
          startTransition(async () => {
            const result = await linkToolToEntity({
              entity,
              entityId,
              toolId: created.id,
            });
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            toast.success("Outil créé et lié.");
            notifyChange();
          });
        });
      }}
      onLinkExisting={(toolId) =>
        linkToolToEntity({ entity, entityId, toolId })
      }
      onUnlink={(tool) =>
        unlinkToolFromEntity({ entity, entityId, toolId: tool.id })
      }
      labels={{
        addAction: "Ajouter un outil",
        empty: "Aucun outil lié.",
        linkDialogTitle: "Lier un outil",
        linkDialogDescription:
          "Associez un outil existant, ou créez-en un nouveau (il sera lié automatiquement).",
        existingSelectLabel: "Outil existant",
        selectPlaceholder: "Sélectionner un outil",
        allLinkedPlaceholder: "Tous les outils sont déjà liés",
        selectUnsetItem: "Sélectionner un outil",
        createNew: "Créer un nouvel outil",
        linkSelectError: "Sélectionnez un outil.",
        linkedSuccess: "Outil lié.",
        unlinkAction: "Retirer l'outil",
        unlinkDialogTitle: "Retirer l'outil",
        unlinkDialogDescription: (name) => (
          <>
            Retirer <strong>{name}</strong> de cette fiche ? L&apos;outil reste
            dans le catalogue.
          </>
        ),
        unlinkedSuccess: "Outil retiré.",
      }}
    />
  );
}
