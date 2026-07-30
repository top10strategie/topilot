"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Image as ImageIcon, Trash, UploadSimple } from "@phosphor-icons/react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  IMAGE_FILE_ACCEPT,
  IMAGE_FILE_HELP,
  IMAGE_UNSUPPORTED_MESSAGE,
  resolveAllowedImageMime,
} from "@/lib/visuels/allowed-image-types";

type VisualFileFieldProps = {
  id?: string;
  label: string;
  value: File | null;
  /** URL déjà enregistrée (édition). */
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Champ fichier image avec aperçu Attachment (logo / avatar).
 */
export function VisualFileField({
  id: idProp,
  label,
  value,
  existingUrl = null,
  onChange,
  disabled = false,
  error,
}: VisualFileFieldProps) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dismissedExisting, setDismissedExisting] = useState(false);

  useEffect(() => {
    if (!value) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [value]);

  const previewUrl = objectUrl ?? (dismissedExisting ? null : existingUrl);
  const hasPreview = Boolean(previewUrl);
  const title = value?.name ?? (previewUrl ? "Image actuelle" : "Aucune image");
  const description = value
    ? `${value.type || "image"} · ${formatFileSize(value.size)}`
    : previewUrl
      ? "Fichier enregistré"
      : IMAGE_FILE_HELP;

  const displayError = error ?? localError;

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0] ?? null;
    setLocalError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (!resolveAllowedImageMime(file)) {
      setLocalError(IMAGE_UNSUPPORTED_MESSAGE);
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setDismissedExisting(false);
    onChange(file);
  };

  const clear = () => {
    setLocalError(null);
    setDismissedExisting(true);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />

      {hasPreview ? (
        <Attachment
          state={displayError ? "error" : "done"}
          className="w-full max-w-md"
        >
          <AttachmentMedia variant="image" className="size-14 w-14">
            <img src={previewUrl!} alt="" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{title}</AttachmentTitle>
            <AttachmentDescription>{description}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              type="button"
              aria-label="Changer l'image"
              title="Changer"
              disabled={disabled}
              onClick={openPicker}
            >
              <UploadSimple className="size-3.5" />
            </AttachmentAction>
            <AttachmentAction
              type="button"
              aria-label="Retirer l'image"
              title="Retirer"
              disabled={disabled}
              onClick={clear}
            >
              <Trash className="size-3.5" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <Attachment state="idle" className="w-full max-w-md">
          <AttachmentMedia variant="icon">
            <ImageIcon className="size-4" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>Aucune image</AttachmentTitle>
            <AttachmentDescription>{IMAGE_FILE_HELP}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={openPicker}
            >
              Choisir une image
            </Button>
          </AttachmentActions>
        </Attachment>
      )}

      {displayError ? (
        <p className="text-sm text-destructive">{displayError}</p>
      ) : null}
    </div>
  );
}
