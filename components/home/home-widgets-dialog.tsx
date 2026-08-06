"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateHomeWidgets } from "@/actions/settings";
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
  COLLABORATOR_HOME_WIDGET_IDS,
  HOME_WIDGET_GROUPS,
  HOME_WIDGET_LABELS,
  type HomeWidgetId,
} from "@/lib/analyses/types";

type HomeWidgetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelected: HomeWidgetId[];
  onSaved: (selected: HomeWidgetId[]) => void;
  role: string;
};

export function HomeWidgetsDialog({
  open,
  onOpenChange,
  initialSelected,
  onSaved,
  role,
}: HomeWidgetsDialogProps) {
  const [selected, setSelected] = useState<HomeWidgetId[]>(initialSelected);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    if (role !== "collaborator") return HOME_WIDGET_GROUPS;
    const allowed = new Set<string>(COLLABORATOR_HOME_WIDGET_IDS);
    return HOME_WIDGET_GROUPS.map((group) => ({
      ...group,
      ids: group.ids.filter((id) => allowed.has(id)),
    })).filter((group) => group.ids.length > 0);
  }, [role]);

  const toggle = (id: HomeWidgetId, checked: boolean) => {
    setSelected((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await updateHomeWidgets(selected);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Page d'accueil mise à jour.");
      onSaved(selected);
      onOpenChange(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSelected(initialSelected);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajout de widgets à votre page d&apos;accueil</DialogTitle>
          <DialogDescription>
            Sélectionner un ou plusieurs widgets :
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label} className="space-y-2">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <ul className="space-y-2">
                {group.ids.map((id) => {
                  const checked = selected.includes(id);
                  return (
                    <li
                      key={id}
                      className="flex items-start gap-3 rounded-md border p-2"
                    >
                      <input
                        id={`widget-${id}`}
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={checked}
                        disabled={isPending}
                        onChange={(event) =>
                          toggle(id, event.target.checked)
                        }
                      />
                      <Label
                        htmlFor={`widget-${id}`}
                        className="cursor-pointer text-sm font-normal leading-snug"
                      >
                        {HOME_WIDGET_LABELS[id]}
                      </Label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="button" disabled={isPending} onClick={confirm}>
            {isPending ? "Enregistrement…" : "Confirmation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
