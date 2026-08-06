"use client";

import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { StackPlus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ConfirmStatusDialog } from "@/components/layout/confirm-status-dialog";
import { EntityDocumentationSection } from "@/components/layout/entity-documentation-columns";
import { IconActionButton } from "@/components/layout/icon-action-button";
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

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export type EntityLinkedResourceLabels = {
  addAction: string;
  empty: string;
  linkDialogTitle: string;
  linkDialogDescription: string;
  existingSelectLabel: string;
  selectPlaceholder: string;
  allLinkedPlaceholder: string;
  selectUnsetItem: string;
  createNew: string;
  linkSelectError: string;
  linkedSuccess: string;
  unlinkAction: string;
  unlinkDialogTitle: string;
  unlinkDialogDescription: (itemLabel: string) => ReactNode;
  unlinkedSuccess: string;
};

type EntityLinkedResourceSectionProps<
  TItem extends { id: string },
  TOption extends { id: string },
> = {
  title: string;
  items: TItem[];
  linkOptions: TOption[];
  readOnly?: boolean;
  onLinksChange?: () => void;
  getItemLabel: (item: TItem) => string;
  getOptionLabel: (option: TOption) => string;
  renderItemMeta?: (item: TItem) => ReactNode;
  onItemClick: (item: TItem) => void | Promise<void>;
  /** Le shell ferme déjà le dialog de liaison avant l'appel. */
  onCreateAndLink: () => void | Promise<void>;
  onLinkExisting: (resourceId: string) => Promise<ActionResult>;
  onUnlink: (item: TItem) => Promise<ActionResult>;
  labels: EntityLinkedResourceLabels;
};

/**
 * Shell partagé Documents / Outils / Wiki liés à une entité CRM.
 * Les wrappers domaine fournissent labels, méta, create/link/unlink.
 */
export function EntityLinkedResourceSection<
  TItem extends { id: string },
  TOption extends { id: string },
>({
  title,
  items,
  linkOptions,
  readOnly = false,
  onLinksChange,
  getItemLabel,
  getOptionLabel,
  renderItemMeta,
  onItemClick,
  onCreateAndLink,
  onLinkExisting,
  onUnlink,
  labels,
}: EntityLinkedResourceSectionProps<TItem, TOption>) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [pendingUnlink, setPendingUnlink] = useState<TItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const notifyChange = () => {
    if (onLinksChange) {
      onLinksChange();
    } else {
      router.refresh();
    }
  };

  const availableOptions = useMemo(() => {
    const linked = new Set(items.map((item) => item.id));
    return linkOptions.filter((opt) => !linked.has(opt.id));
  }, [linkOptions, items]);

  const handleCreateAndLink = () => {
    setLinkOpen(false);
    void onCreateAndLink();
  };

  const handleLinkExisting = () => {
    if (!selectedId) {
      toast.error(labels.linkSelectError);
      return;
    }
    startTransition(async () => {
      const result = await onLinkExisting(selectedId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(labels.linkedSuccess);
      setLinkOpen(false);
      setSelectedId("");
      notifyChange();
    });
  };

  if (readOnly && items.length === 0) {
    return null;
  }

  return (
    <>
      <EntityDocumentationSection
        title={title}
        action={
          readOnly ? undefined : (
            <IconActionButton
              label={labels.addAction}
              variant="outline"
              onClick={() => setLinkOpen(true)}
            >
              <StackPlus className="size-4" />
            </IconActionButton>
          )
        }
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const meta = renderItemMeta?.(item);
              return (
                <li
                  key={item.id}
                  className="group flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void onItemClick(item)}
                  >
                    <span className="font-medium">{getItemLabel(item)}</span>
                    {meta ? (
                      <span className="mt-0.5 flex flex-wrap gap-1">{meta}</span>
                    ) : null}
                  </button>
                  {readOnly ? null : (
                    <IconActionButton
                      label={labels.unlinkAction}
                      attention
                      onClick={() => setPendingUnlink(item)}
                    >
                      <Trash className="size-3.5" />
                    </IconActionButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </EntityDocumentationSection>

      {readOnly ? null : (
        <>
          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{labels.linkDialogTitle}</DialogTitle>
                <DialogDescription>
                  {labels.linkDialogDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>{labels.existingSelectLabel}</Label>
                  <Select
                    value={selectedId || "__unset__"}
                    onValueChange={(value) =>
                      setSelectedId(value === "__unset__" ? "" : value)
                    }
                    disabled={isPending || availableOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          availableOptions.length === 0
                            ? labels.allLinkedPlaceholder
                            : labels.selectPlaceholder
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset__" disabled>
                        {labels.selectUnsetItem}
                      </SelectItem>
                      {availableOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {getOptionLabel(opt)}
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
                  onClick={handleCreateAndLink}
                >
                  {labels.createNew}
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
                    disabled={isPending || !selectedId}
                    onClick={handleLinkExisting}
                  >
                    {isPending ? "Liaison…" : "Lier"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {pendingUnlink ? (
            <ConfirmStatusDialog
              open
              onOpenChange={(open) => {
                if (!open) setPendingUnlink(null);
              }}
              title={labels.unlinkDialogTitle}
              description={labels.unlinkDialogDescription(
                getItemLabel(pendingUnlink),
              )}
              confirmLabel="Retirer"
              pendingLabel="Retrait…"
              successMessage={labels.unlinkedSuccess}
              onConfirm={() => onUnlink(pendingUnlink)}
              onSuccess={notifyChange}
            />
          ) : null}
        </>
      )}
    </>
  );
}
