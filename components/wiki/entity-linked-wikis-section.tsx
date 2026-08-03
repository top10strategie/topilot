"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  fetchWikiForConsultation,
  linkWikiToEntity,
  unlinkWikiFromEntity,
} from "@/actions/wiki-links";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityDocumentationSection } from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { WikiConsultationDrawer } from "@/components/wiki/wiki-consultation-drawer";
import { WikiFormDrawer } from "@/components/wiki/wiki-form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  /** Si fourni (ex. tiroir), rafraîchit l'état local au lieu de `router.refresh()`. */
  onLinksChange?: () => void;
};

export function EntityLinkedWikisSection({
  entity,
  entityId,
  wikis,
  linkOptions,
  categories,
  onLinksChange,
}: EntityLinkedWikisSectionProps) {
  const router = useRouter();
  const { pushDrawer } = useDrawerStack();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedWikiId, setSelectedWikiId] = useState("");
  const [pendingUnlink, setPendingUnlink] = useState<LinkedWikiItem | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const notifyChange = () => {
    if (onLinksChange) {
      onLinksChange();
    } else {
      router.refresh();
    }
  };

  const availableOptions = useMemo(() => {
    const linked = new Set(wikis.map((wiki) => wiki.id));
    return linkOptions.filter((opt) => !linked.has(opt.id));
  }, [linkOptions, wikis]);

  const openConsultation = async (wikiId: string) => {
    const result = await fetchWikiForConsultation(wikiId);
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
  };

  const openCreateAndLink = () => {
    setLinkOpen(false);
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
  };

  const handleLinkExisting = () => {
    if (!selectedWikiId) {
      toast.error("Sélectionnez un wiki.");
      return;
    }
    startTransition(async () => {
      const result = await linkWikiToEntity({
        entity,
        entityId,
        wikiId: selectedWikiId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Wiki lié.");
      setLinkOpen(false);
      setSelectedWikiId("");
      notifyChange();
    });
  };

  const handleUnlink = () => {
    if (!pendingUnlink) return;
    startTransition(async () => {
      const result = await unlinkWikiFromEntity({
        entity,
        entityId,
        wikiId: pendingUnlink.id,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Wiki retiré.");
      setPendingUnlink(null);
      notifyChange();
    });
  };

  return (
    <>
      <EntityDocumentationSection
        title="Wiki"
        action={
          <IconActionButton
            label="Ajouter un wiki"
            variant="outline"
            onClick={() => setLinkOpen(true)}
          >
            <Plus className="size-4" />
          </IconActionButton>
        }
      >
        {wikis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun wiki lié.</p>
        ) : (
          <ul className="space-y-1">
            {wikis.map((wiki) => (
              <li
                key={wiki.id}
                className="group flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void openConsultation(wiki.id)}
                >
                  <span className="font-medium">{wiki.title}</span>
                  {wiki.categories.length > 0 ? (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {wiki.categories.slice(0, 2).map((category) => (
                        <Badge
                          key={category.id}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {category.label}
                        </Badge>
                      ))}
                    </span>
                  ) : null}
                </button>
                <IconActionButton
                  label="Retirer le wiki"
                  attention
                  onClick={() => setPendingUnlink(wiki)}
                >
                  <Trash className="size-3.5" />
                </IconActionButton>
              </li>
            ))}
          </ul>
        )}
      </EntityDocumentationSection>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lier un wiki</DialogTitle>
            <DialogDescription>
              Associez un wiki existant, ou créez-en un nouveau (il sera lié
              automatiquement).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2">
              <Label>Wiki existant</Label>
              <Select
                value={selectedWikiId || "__unset__"}
                onValueChange={(value) =>
                  setSelectedWikiId(value === "__unset__" ? "" : value)
                }
                disabled={isPending || availableOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      availableOptions.length === 0
                        ? "Tous les wikis sont déjà liés"
                        : "Sélectionner un wiki"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__" disabled>
                    Sélectionner un wiki
                  </SelectItem>
                  {availableOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={openCreateAndLink}
            >
              Créer un nouveau wiki
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setLinkOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={isPending || !selectedWikiId}
                onClick={handleLinkExisting}
              >
                {isPending ? "Liaison…" : "Lier"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingUnlink ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingUnlink(null);
          }}
        >
          <DialogContent className="border-destructive">
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Retirer le wiki
              </DialogTitle>
              <DialogDescription>
                Retirer <strong>{pendingUnlink.title}</strong> de cette fiche ?
                Le wiki reste dans la bibliothèque.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setPendingUnlink(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleUnlink}
              >
                {isPending ? "Retrait…" : "Retirer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
