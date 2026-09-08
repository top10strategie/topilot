"use client";

import { useEffect, useMemo, useState } from "react";
import { StackPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { loadVisualDocumentPicker } from "@/actions/documents-visual";
import { DocumentFormDrawer } from "@/components/documents/document-form-drawer";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { ClientLogo } from "@/components/clients/client-logo";
import { IconActionButton } from "@/components/layout/icon-action-button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentTypeItem } from "@/lib/categories/types";
import type { VisualDocumentOption } from "@/lib/documents/types";

const NONE_VALUE = "__none__";

type VisualDocumentFieldProps = {
  label: string;
  /** Label `document_type` attendu (« Logo client » / « Photo de profil »). */
  expectedTypeLabel: string;
  value: string | null;
  onChange: (documentId: string | null) => void;
  /** Aperçu initial (édition) si le doc n’est pas encore dans les options. */
  initialSelection?: VisualDocumentOption | null;
  disabled?: boolean;
  error?: string;
};

/**
 * Sélecteur inline de document visuel + bouton créer + carte d’aperçu.
 */
export function VisualDocumentField({
  label,
  expectedTypeLabel,
  value,
  onChange,
  initialSelection = null,
  disabled = false,
  error,
}: VisualDocumentFieldProps) {
  const { pushDrawer } = useDrawerStack();
  const [options, setOptions] = useState<VisualDocumentOption[]>(() =>
    initialSelection ? [initialSelection] : [],
  );
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [lockedTypeId, setLockedTypeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadVisualDocumentPicker(expectedTypeLabel).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setDocumentTypes(result.documentTypes);
      setLockedTypeId(result.lockedTypeId);
      setOptions((prev) => {
        const byId = new Map(result.options.map((opt) => [opt.id, opt]));
        for (const opt of prev) {
          if (!byId.has(opt.id)) byId.set(opt.id, opt);
        }
        if (initialSelection && !byId.has(initialSelection.id)) {
          byId.set(initialSelection.id, initialSelection);
        }
        return [...byId.values()].sort((a, b) =>
          a.document_name.localeCompare(b.document_name, "fr"),
        );
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [expectedTypeLabel, initialSelection]);

  const selected = useMemo(
    () => (value ? (options.find((opt) => opt.id === value) ?? null) : null),
    [options, value],
  );

  const openCreateDocument = () => {
    if (!lockedTypeId) {
      toast.error(
        `Type documentaire « ${expectedTypeLabel} » introuvable. Créez-le dans Administration.`,
      );
      return;
    }
    void pushDrawer<{
      id: string;
      document_name: string;
      is_visual: boolean;
      preview_url: string | null;
    }>({
      title: "Nouveau document",
      content: (helpers) => (
        <DocumentFormDrawer
          mode="create"
          documentTypes={documentTypes}
          helpers={helpers}
          defaultDocumentTypeId={lockedTypeId}
          lockDocumentType
          forceIsVisual
        />
      ),
    }).then((created) => {
      if (!created) return;
      if (!created.is_visual) {
        toast.message(
          "Document créé, mais non sélectionné (il n’est pas marqué comme visuel).",
        );
        return;
      }
      const option: VisualDocumentOption = {
        id: created.id,
        document_name: created.document_name,
        preview_url: created.preview_url,
      };
      setOptions((prev) => {
        if (prev.some((item) => item.id === option.id)) return prev;
        return [...prev, option].sort((a, b) =>
          a.document_name.localeCompare(b.document_name, "fr"),
        );
      });
      onChange(created.id);
      toast.success("Document créé et sélectionné.");
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Select
            value={value ?? NONE_VALUE}
            onValueChange={(next) =>
              onChange(next === NONE_VALUE ? null : next)
            }
            disabled={disabled || loading}
          >
            <SelectTrigger className="min-w-0 flex-1">
              <SelectValue
                placeholder={
                  loading ? "Chargement…" : "Sélectionner un document"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Aucun</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.document_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <IconActionButton
            label="Créer un document"
            variant="outline"
            disabled={disabled || loading}
            onClick={openCreateDocument}
          >
            <StackPlus className="size-4" />
          </IconActionButton>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {selected ? (
        <Card className="flex w-full items-center gap-3 p-3">
          <ClientLogo
            src={selected.preview_url}
            name={selected.document_name}
            size="md"
          />
          <p className="min-w-0 flex-1 truncate font-medium">
            {selected.document_name}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
