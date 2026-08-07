"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowsLeftRight,
  ArrowUUpLeft,
  DownloadSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { restoreDocumentVersion } from "@/actions/documents";
import {
  DrawerBody,
  DrawerFooterActions,
} from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { DocumentVersionCompare } from "@/components/documents/document-version-compare";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDocumentFileFormat } from "@/lib/documents/format";
import type { DocumentListItem } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

type DocumentVersionHistoryDrawerProps = {
  versions: DocumentListItem[];
  helpers: DrawerHelpers<boolean>;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Tiroir historique d'une lignée document : liste, comparaison, restauration.
 */
export function DocumentVersionHistoryDrawer({
  versions,
  helpers,
}: DocumentVersionHistoryDrawerProps) {
  const sorted = useMemo(
    () =>
      [...versions].sort((a, b) => b.version_number - a.version_number),
    [versions],
  );
  const maxVersion = sorted[0]?.version_number ?? 0;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<DocumentListItem | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const selectedVersions = useMemo(
    () =>
      selectedIds
        .map((id) => sorted.find((v) => v.id === id))
        .filter((v): v is DocumentListItem => Boolean(v))
        .sort((a, b) => a.version_number - b.version_number),
    [selectedIds, sorted],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  };

  const downloadVersion = async (item: DocumentListItem) => {
    try {
      const response = await fetch(
        `/api/documents/${item.id}/file?download=1`,
      );
      if (!response.ok) {
        toast.error("Téléchargement impossible.");
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = item.document_name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Téléchargement impossible.");
    }
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    startTransition(async () => {
      const result = await restoreDocumentVersion(restoreTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Version V${maxVersion + 1} créée à partir de V${restoreTarget.version_number}.`,
      );
      setRestoreTarget(null);
      helpers.resolve(true);
    });
  };

  if (compareMode && selectedVersions.length === 2) {
    return (
      <>
        <DrawerBody>
          <DocumentVersionCompare
            left={selectedVersions[0]!}
            right={selectedVersions[1]!}
          />
        </DrawerBody>
        <DrawerFooterActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCompareMode(false)}
          >
            Retour à l&apos;historique
          </Button>
        </DrawerFooterActions>
      </>
    );
  }

  return (
    <>
      <DrawerBody>
        <p className="text-sm text-muted-foreground">
          Sélectionnez jusqu&apos;à deux versions pour les comparer, ou
          restaurez une version antérieure (crée une nouvelle version).
        </p>
        <ul className="space-y-2">
          {sorted.map((version) => {
            const selected = selectedIds.includes(version.id);
            const format = getDocumentFileFormat(version);
            return (
              <li
                key={version.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3",
                  selected && "border-primary/60 bg-muted/30",
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleSelect(version.id)}
                  aria-label={`Sélectionner V${version.version_number}`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">V{version.version_number}</Badge>
                    {version.is_latest ? (
                      <Badge variant="outline">Actuelle</Badge>
                    ) : null}
                    <span className="truncate text-sm font-medium">
                      {version.document_name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {version.document_type.label} · {format} ·{" "}
                    {formatDate(version.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Télécharger"
                    onClick={() => void downloadVersion(version)}
                  >
                    <DownloadSimple className="size-4" />
                    <span className="sr-only">Télécharger</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Restaurer"
                    disabled={version.is_latest || isPending}
                    onClick={() => setRestoreTarget(version)}
                  >
                    <ArrowUUpLeft className="size-4" />
                    <span className="sr-only">Restaurer</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </DrawerBody>
      <DrawerFooterActions className="justify-between">
        <Button type="button" variant="outline" onClick={() => helpers.dismiss()}>
          Fermer
        </Button>
        <Button
          type="button"
          disabled={selectedVersions.length !== 2}
          onClick={() => setCompareMode(true)}
        >
          <ArrowsLeftRight className="size-4" />
          Comparer
        </Button>
      </DrawerFooterActions>

      <Dialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer cette version ?</DialogTitle>
            <DialogDescription>
              {restoreTarget ? (
                <>
                  Cela créera la version{" "}
                  <strong>V{maxVersion + 1}</strong> à partir de{" "}
                  <strong>V{restoreTarget.version_number}</strong>. La version
                  actuelle ne sera pas écrasée.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={confirmRestore}
              disabled={isPending}
            >
              {isPending ? "Restauration…" : "Restaurer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
