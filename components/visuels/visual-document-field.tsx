"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import type {
  DocumentLinkEntity,
  VisualDocumentOption,
} from "@/lib/documents/types";

const NONE_VALUE = "__none__";

type CreatedVisualDocument = {
  id: string;
  document_name: string;
  is_visual: boolean;
  preview_url: string | null;
};

type VisualDocumentFieldProps = {
  label: string;
  /** Label `document_type` attendu (« Logo client » / « Photo de profil »). */
  expectedTypeLabel: string;
  value: string | null;
  onChange: (documentId: string | null) => void;
  /** Aperçu initial (édition) si le doc n’est pas encore dans les options. */
  initialSelection?: VisualDocumentOption | null;
  /** Liaison optionnelle à l’entité parente (onglet Documentation). */
  linkEntity?: DocumentLinkEntity;
  linkEntityId?: string;
  disabled?: boolean;
  error?: string;
};

/** Fusionne une base (souvent serveur) avec des options locales ; la base gagne si elle a déjà les champs. */
function mergeVisualOptions(
  base: VisualDocumentOption[],
  extras: Array<VisualDocumentOption | null | undefined>,
): VisualDocumentOption[] {
  const byId = new Map(base.map((opt) => [opt.id, opt]));
  for (const extra of extras) {
    if (!extra) continue;
    const existing = byId.get(extra.id);
    if (!existing) {
      byId.set(extra.id, extra);
      continue;
    }
    byId.set(extra.id, {
      id: existing.id,
      document_name: existing.document_name || extra.document_name,
      preview_url: existing.preview_url ?? extra.preview_url,
    });
  }
  return [...byId.values()].sort((a, b) =>
    a.document_name.localeCompare(b.document_name, "fr"),
  );
}

/**
 * Sélecteur inline de document visuel + bouton créer + carte d’aperçu.
 */
export function VisualDocumentField({
  label,
  expectedTypeLabel,
  value,
  onChange,
  initialSelection = null,
  linkEntity,
  linkEntityId,
  disabled = false,
  error,
}: VisualDocumentFieldProps) {
  const { pushDrawer } = useDrawerStack();
  const [options, setOptions] = useState<VisualDocumentOption[]>(() =>
    initialSelection ? [initialSelection] : [],
  );
  /**
   * Miroir local de la sélection : source d’affichage fiable.
   * Le parent (`value` / `onChange`) reste la source pour la sauvegarde.
   */
  const [selectedId, setSelectedId] = useState<string | null>(value);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [lockedTypeId, setLockedTypeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Remonte le Select Radix après création (ItemText souvent hors DOM si fermé). */
  const [selectEpoch, setSelectEpoch] = useState(0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const applyCreatedRef = useRef<(created: CreatedVisualDocument) => void>(
    () => {},
  );

  const initialSelectionId = initialSelection?.id ?? null;
  const initialSelectionName = initialSelection?.document_name ?? null;
  const initialSelectionPreview = initialSelection?.preview_url ?? null;
  const initialSelectionSeed = useMemo<VisualDocumentOption | null>(() => {
    if (!initialSelectionId || !initialSelectionName) return null;
    return {
      id: initialSelectionId,
      document_name: initialSelectionName,
      preview_url: initialSelectionPreview,
    };
  }, [initialSelectionId, initialSelectionName, initialSelectionPreview]);

  const initialSelectionSeedRef = useRef(initialSelectionSeed);
  initialSelectionSeedRef.current = initialSelectionSeed;

  const expectedTypeLabelRef = useRef(expectedTypeLabel);
  expectedTypeLabelRef.current = expectedTypeLabel;

  // Sync depuis le parent (édition initiale, clear externe).
  useEffect(() => {
    setSelectedId(value);
  }, [value]);

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
      setOptions((prev) =>
        mergeVisualOptions(result.options, [...prev, initialSelectionSeed]),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [expectedTypeLabel, initialSelectionSeed]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return options.find((opt) => opt.id === selectedId) ?? null;
  }, [options, selectedId]);

  applyCreatedRef.current = (created: CreatedVisualDocument) => {
    if (!created.id) {
      toast.error("Document créé sans identifiant — sélection impossible.");
      return;
    }

    const option: VisualDocumentOption = {
      id: created.id,
      document_name: created.document_name,
      preview_url: created.preview_url,
    };

    // flushSync : commit immédiat avant fermeture du tiroir empilé.
    flushSync(() => {
      setOptions((prev) => mergeVisualOptions(prev, [option]));
      setSelectedId(created.id);
      onChangeRef.current(created.id);
      setSelectEpoch((n) => n + 1);
    });

    toast.success("Document créé et sélectionné.");
    if (!created.is_visual) {
      toast.message(
        "Attention : le document n’est pas marqué comme visuel. L’enregistrement du formulaire pourra échouer.",
      );
    }

    void loadVisualDocumentPicker(expectedTypeLabelRef.current).then(
      (refresh) => {
        if (!refresh.success) return;
        setDocumentTypes(refresh.documentTypes);
        setLockedTypeId(refresh.lockedTypeId);
        setOptions((prev) =>
          mergeVisualOptions(refresh.options, [
            ...prev,
            option,
            initialSelectionSeedRef.current,
          ]),
        );
      },
    );
  };

  const openCreateDocument = () => {
    if (!lockedTypeId) {
      toast.error(
        `Type documentaire « ${expectedTypeLabel} » introuvable. Créez-le dans Administration.`,
      );
      return;
    }
    void pushDrawer<CreatedVisualDocument>({
      title: "Nouveau document",
      content: (helpers) => (
        <DocumentFormDrawer
          mode="create"
          documentTypes={documentTypes}
          helpers={{
            dismiss: helpers.dismiss,
            resolve: (created) => {
              // Comme injectCategory : muter l’état parent AVANT de fermer.
              applyCreatedRef.current(created);
              helpers.resolve(created);
            },
          }}
          defaultDocumentTypeId={lockedTypeId}
          lockDocumentType
          forceIsVisual
          linkEntity={linkEntity}
          linkEntityId={linkEntityId}
        />
      ),
    });
  };

  const handleSelectChange = (next: string) => {
    const id = next === NONE_VALUE ? null : next;
    setSelectedId(id);
    onChange(id);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Select
            key={selectEpoch}
            value={selectedId ?? NONE_VALUE}
            onValueChange={handleSelectChange}
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
