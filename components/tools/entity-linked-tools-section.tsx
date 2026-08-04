"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  fetchToolForConsultation,
  linkToolToEntity,
  unlinkToolFromEntity,
  type ToolLinkEntity,
} from "@/actions/tool-links";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { EntityDocumentationSection } from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { ToolConsultationDrawer } from "@/components/tools/tool-consultation-drawer";
import { ToolFormDrawer } from "@/components/tools/tool-form-drawer";
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
import type { CollaboratorListItem } from "@/lib/collaborators/types";
import type { LinkedToolItem } from "@/lib/tools/types";

type ToolLinkOption = { id: string; tool_name: string };

type EntityLinkedToolsSectionProps = {
  entity: ToolLinkEntity;
  entityId: string;
  tools: LinkedToolItem[];
  /** Catalogue pour lier un outil existant. */
  linkOptions: ToolLinkOption[];
  categories: CategoryItem[];
  collaborators?: CollaboratorListItem[];
  canManagePrivacy?: boolean;
  /** Si fourni (ex. tiroir), rafraîchit l'état local au lieu de `router.refresh()`. */
  onLinksChange?: () => void;
  /** Consultation : pas d'ajout/retrait ; section absente si liste vide. */
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
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [pendingUnlink, setPendingUnlink] = useState<LinkedToolItem | null>(
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
    const linked = new Set(tools.map((t) => t.id));
    return linkOptions.filter((opt) => !linked.has(opt.id));
  }, [linkOptions, tools]);

  const openConsultation = async (toolId: string) => {
    const result = await fetchToolForConsultation(toolId);
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
  };

  const openCreateAndLink = () => {
    setLinkOpen(false);
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
  };

  const handleLinkExisting = () => {
    if (!selectedToolId) {
      toast.error("Sélectionnez un outil.");
      return;
    }
    startTransition(async () => {
      const result = await linkToolToEntity({
        entity,
        entityId,
        toolId: selectedToolId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Outil lié.");
      setLinkOpen(false);
      setSelectedToolId("");
      notifyChange();
    });
  };

  const handleUnlink = () => {
    if (!pendingUnlink) return;
    startTransition(async () => {
      const result = await unlinkToolFromEntity({
        entity,
        entityId,
        toolId: pendingUnlink.id,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Outil retiré.");
      setPendingUnlink(null);
      notifyChange();
    });
  };

  if (readOnly && tools.length === 0) {
    return null;
  }

  return (
    <>
      <EntityDocumentationSection
        title="Outils"
        action={
          readOnly ? undefined : (
            <IconActionButton
              label="Ajouter un outil"
              variant="outline"
              onClick={() => setLinkOpen(true)}
            >
              <Plus className="size-4" />
            </IconActionButton>
          )
        }
      >
        {tools.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun outil lié.</p>
        ) : (
          <ul className="space-y-1">
            {tools.map((tool) => (
              <li
                key={tool.id}
                className="group flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void openConsultation(tool.id)}
                >
                  <span className="font-medium">{tool.tool_name}</span>
                  {tool.categories.length > 0 ? (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {tool.categories.slice(0, 2).map((category) => (
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
                {readOnly ? null : (
                  <IconActionButton
                    label="Retirer l'outil"
                    attention
                    onClick={() => setPendingUnlink(tool)}
                  >
                    <Trash className="size-3.5" />
                  </IconActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </EntityDocumentationSection>

      {readOnly ? null : (
        <>
          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lier un outil</DialogTitle>
                <DialogDescription>
                  Associez un outil existant, ou créez-en un nouveau (il sera
                  lié automatiquement).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>Outil existant</Label>
                  <Select
                    value={selectedToolId || "__unset__"}
                    onValueChange={(value) =>
                      setSelectedToolId(value === "__unset__" ? "" : value)
                    }
                    disabled={isPending || availableOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          availableOptions.length === 0
                            ? "Tous les outils sont déjà liés"
                            : "Sélectionner un outil"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset__" disabled>
                        Sélectionner un outil
                      </SelectItem>
                      {availableOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.tool_name}
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
                  Créer un nouvel outil
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
                    disabled={isPending || !selectedToolId}
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
                    Retirer l&apos;outil
                  </DialogTitle>
                  <DialogDescription>
                    Retirer <strong>{pendingUnlink.tool_name}</strong> de cette
                    fiche ? L&apos;outil reste dans le catalogue.
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
      )}
    </>
  );
}
