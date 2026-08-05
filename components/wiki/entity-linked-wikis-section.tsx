"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchWikiForConsultation,
  linkWikiToEntity,
  unlinkWikiFromEntity,
} from "@/actions/wiki-links";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityLinkedResourceSection } from "@/components/layout/entity-linked-resource-section";
import { WikiConsultationDrawer } from "@/components/wiki/wiki-consultation-drawer";
import { WikiFormDrawer } from "@/components/wiki/wiki-form-drawer";
import { Badge } from "@/components/ui/badge";
import type { CategoryItem } from "@/lib/categories/types";
import type {
  LinkedWikiItem,
  WikiLinkEntity,
  WikiLinkOption,
} from "@/lib/wiki/types";

type EntityLinkedWikisSectionProps = {
  entity: WikiLinkEntity;
  entityId: string;
  wikis: LinkedWikiItem[];
  linkOptions: WikiLinkOption[];
  categories: CategoryItem[];
  onLinksChange?: () => void;
  readOnly?: boolean;
};

/**
 * Section Documentation « Wiki » : liste, consultation, lien / création, retrait.
 */
export function EntityLinkedWikisSection({
  entity,
  entityId,
  wikis,
  linkOptions,
  categories,
  onLinksChange,
  readOnly = false,
}: EntityLinkedWikisSectionProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();

  const notifyChange = () => {
    if (onLinksChange) onLinksChange();
    else router.refresh();
  };

  return (
    <EntityLinkedResourceSection
      title="Wiki"
      items={wikis}
      linkOptions={linkOptions}
      readOnly={readOnly}
      onLinksChange={onLinksChange}
      getItemLabel={(wiki) => wiki.title}
      getOptionLabel={(opt) => opt.title}
      renderItemMeta={(wiki) =>
        wiki.categories.length > 0 ? (
          <>
            {wiki.categories.slice(0, 2).map((category) => (
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
      onItemClick={async (wiki) => {
        const result = await fetchWikiForConsultation(wiki.id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        void pushDrawer({
          title: result.wiki.title,
          content: (helpers) => (
            <WikiConsultationDrawer wiki={result.wiki} helpers={helpers} />
          ),
        });
      }}
      onCreateAndLink={() => {
        void pushDrawer<{ id: string; title: string }>({
          title: "Nouveau Wiki",
          content: (helpers) => (
            <WikiFormDrawer
              mode="create"
              categories={categories}
              linkEntity={entity}
              linkEntityId={entityId}
              helpers={helpers}
            />
          ),
        }).then((created) => {
          if (!created) return;
          toast.success("Wiki créé et lié.");
          notifyChange();
        });
      }}
      onLinkExisting={(wikiId) =>
        linkWikiToEntity({ entity, entityId, wikiId })
      }
      onUnlink={(wiki) =>
        unlinkWikiFromEntity({ entity, entityId, wikiId: wiki.id })
      }
      labels={{
        addAction: "Ajouter un wiki",
        empty: "Aucun wiki lié.",
        linkDialogTitle: "Lier un wiki",
        linkDialogDescription:
          "Associez un wiki existant, ou créez-en un nouveau (il sera lié automatiquement).",
        existingSelectLabel: "Wiki existant",
        selectPlaceholder: "Sélectionner un wiki",
        allLinkedPlaceholder: "Tous les wikis sont déjà liés",
        selectUnsetItem: "Sélectionner un wiki",
        createNew: "Créer un nouveau wiki",
        linkSelectError: "Sélectionnez un wiki.",
        linkedSuccess: "Wiki lié.",
        unlinkAction: "Retirer le wiki",
        unlinkDialogTitle: "Retirer le wiki",
        unlinkDialogDescription: (name) => (
          <>
            Retirer <strong>{name}</strong> de cette fiche ? Le wiki reste dans
            la bibliothèque.
          </>
        ),
        unlinkedSuccess: "Wiki retiré.",
      }}
    />
  );
}
