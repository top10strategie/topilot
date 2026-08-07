"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { File as FileIcon, StackPlus, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createDocumentType,
  updateDocumentType,
} from "@/actions/document-types";
import { createDocument, updateDocument } from "@/actions/documents";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { DocumentTypeItem } from "@/lib/categories/types";
import type {
  DocumentLinkEntity,
  DocumentListItem,
  DocumentStorageType,
} from "@/lib/documents/types";
import { DOCUMENT_MAX_BYTES } from "@/lib/documents/constants";
import { IMAGE_MAX_BYTES } from "@/lib/visuels/allowed-image-types";

type DocumentFormDrawerProps = {
  mode: "create" | "edit";
  document?: DocumentListItem;
  documentTypes: DocumentTypeItem[];
  /** Liaison auto à la création depuis une fiche entité. */
  linkEntity?: DocumentLinkEntity;
  linkEntityId?: string;
  helpers: DrawerHelpers<{ id: string; document_name: string }>;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Tiroir création / édition document — sauvegarde unique.
 */
export function DocumentFormDrawer({
  mode,
  document,
  documentTypes: initialTypes,
  linkEntity,
  linkEntityId,
  helpers,
}: DocumentFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [types, setTypes] = useState(initialTypes);
  const [documentName, setDocumentName] = useState(
    document?.document_name ?? "",
  );
  const [documentTypeId, setDocumentTypeId] = useState(
    document?.document_type.id ?? "",
  );
  const [storageType, setStorageType] = useState<DocumentStorageType>(
    document?.storage_type ?? "supabase",
  );
  const [url, setUrl] = useState(document?.url ?? "");
  const [isVisual, setIsVisual] = useState(document?.is_visual ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<
        "document_name" | "document_type_id" | "file" | "url" | "storage_type",
        string
      >
    >
  >({});
  const [isPending, startTransition] = useTransition();

  const isEdit = mode === "edit";
  const visualToggleEnabled = !isEdit || Boolean(file);
  const maxBytes = isVisual ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
  const maxLabel = isVisual ? "5 Mo" : "50 Mo";

  const openCreateType = () => {
    void pushDrawer<{ id: string; label: string }>({
      title: "Nouveau type",
      content: (nestedHelpers) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="document_type"
          helpers={nestedHelpers}
          onCreate={createDocumentType}
          onUpdate={updateDocumentType}
        />
      ),
    }).then((created) => {
      if (!created) return;
      setTypes((prev) =>
        [...prev, { id: created.id, label: created.label, is_active: true }].sort(
          (a, b) => a.label.localeCompare(b.label, "fr"),
        ),
      );
      setDocumentTypeId(created.id);
    });
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.set("document_name", documentName);
    formData.set("document_type_id", documentTypeId);
    formData.set("storage_type", storageType);
    formData.set("url", url);
    formData.set("is_visual", isVisual ? "true" : "false");
    if (file) formData.set("file", file);
    if (mode === "create" && linkEntity && linkEntityId) {
      formData.set("link_entity", linkEntity);
      formData.set("link_entity_id", linkEntityId);
    }
    return formData;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const formData = buildFormData();
      const result =
        mode === "create"
          ? await createDocument(formData)
          : await updateDocument(document!.id, formData);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Document créé." : "Document enregistré.",
      );
      helpers.resolve({
        id: result.id,
        document_name: documentName.trim(),
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="grid gap-2">
          <Label htmlFor="document_name">
            Titre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="document_name"
            value={documentName}
            onChange={(event) => setDocumentName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.document_name)}
            disabled={isPending}
          />
          {fieldErrors.document_name ? (
            <p className="text-xs text-destructive">
              {fieldErrors.document_name}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2"
              onClick={openCreateType}
              disabled={isPending}
            >
              <StackPlus className="size-3.5" />
              Type
            </Button>
          </div>
          <Select
            value={documentTypeId || "__unset__"}
            onValueChange={(value) =>
              setDocumentTypeId(value === "__unset__" ? "" : value)
            }
            disabled={isPending}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={Boolean(fieldErrors.document_type_id)}
            >
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unset__" disabled>
                Sélectionner un type
              </SelectItem>
              {types
                .filter((type) => type.is_active || type.id === documentTypeId)
                .map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {fieldErrors.document_type_id ? (
            <p className="text-xs text-destructive">
              {fieldErrors.document_type_id}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label>Source</Label>
          <Tabs
            value={storageType}
            onValueChange={(value) => {
              const next = value as DocumentStorageType;
              setStorageType(next);
              if (next === "url") setFile(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="supabase"
                disabled={
                  isPending ||
                  (isEdit && document?.storage_type === "url" && !file)
                }
              >
                Fichier
              </TabsTrigger>
              <TabsTrigger value="url" disabled={isPending}>
                Lien externe
              </TabsTrigger>
            </TabsList>
            <TabsContent value="supabase" className="mt-3 space-y-2">
              <Label>
                Fichier
                {mode === "create" ? (
                  <span className="text-destructive"> *</span>
                ) : (
                  <span className="text-muted-foreground">
                    {" "}
                    (nouveau fichier = nouvelle version)
                  </span>
                )}
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  if (next && next.size > maxBytes) {
                    toast.error(
                      isVisual
                        ? "L'image ne doit pas dépasser 5 Mo."
                        : "Le fichier ne doit pas dépasser 50 Mo.",
                    );
                    event.target.value = "";
                    return;
                  }
                  setFile(next);
                }}
              />
              {file ? (
                <Attachment state="done">
                  <AttachmentMedia>
                    <FileIcon className="size-4" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {formatBytes(file.size)}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      type="button"
                      aria-label="Retirer le fichier"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="size-3.5" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : (
                <Attachment state="idle" className="w-full max-w-none">
                  <AttachmentMedia>
                    <FileIcon className="size-4" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>
                      {isEdit
                        ? "Remplacer le fichier (nouvelle version)"
                        : "Déposer ou sélectionner un fichier"}
                    </AttachmentTitle>
                    <AttachmentDescription>
                      {maxLabel} max.
                      {isVisual ? " (visuel)" : " (document)"}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentTrigger
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                  />
                </Attachment>
              )}
              {fieldErrors.file ? (
                <p className="text-xs text-destructive">{fieldErrors.file}</p>
              ) : null}
            </TabsContent>
            <TabsContent value="url" className="mt-3 space-y-2">
              <Label htmlFor="document_url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="document_url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
                aria-invalid={Boolean(fieldErrors.url)}
                disabled={isPending}
              />
              {fieldErrors.url ? (
                <p className="text-xs text-destructive">{fieldErrors.url}</p>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        <div
          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
            visualToggleEnabled ? "" : "opacity-50"
          }`}
        >
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="is_visual_switch">Document image / visuel</Label>
            <p className="text-xs text-muted-foreground">
              {visualToggleEnabled
                ? "Oui = photo, logo, avatar (bucket visuels)."
                : "Sélectionnez un nouveau fichier pour modifier."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="text-muted-foreground">Non</span>
            <Switch
              id="is_visual_switch"
              checked={isVisual}
              onCheckedChange={(checked) => {
                if (
                  checked &&
                  file &&
                  file.size > IMAGE_MAX_BYTES
                ) {
                  toast.error(
                    "Ce fichier dépasse 5 Mo : retirez-le avant de passer en visuel.",
                  );
                  return;
                }
                setIsVisual(checked);
              }}
              disabled={isPending || !visualToggleEnabled}
            />
            <span className="text-muted-foreground">Oui</span>
          </div>
        </div>
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          variant="outline"
          onClick={() => helpers.dismiss()}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer"
              : "Enregistrer"}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
