"use client";

import { getDocumentFileFormat } from "@/lib/documents/format";
import type { DocumentListItem } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

function previewSrc(doc: DocumentListItem): string {
  if (doc.preview_url) return doc.preview_url;
  if (doc.storage_type === "url" && doc.url) return doc.url;
  return `/api/documents/${doc.id}/file`;
}

export function isDocumentPreviewable(doc: DocumentListItem): boolean {
  if (doc.is_visual || Boolean(doc.preview_url)) return true;
  const format = getDocumentFileFormat(doc);
  if (format === "pdf") return true;
  return /^(png|jpe?g|gif|webp|svg|avif)$/i.test(format);
}

function isImagePreview(doc: DocumentListItem): boolean {
  if (doc.is_visual || Boolean(doc.preview_url)) return true;
  const format = getDocumentFileFormat(doc);
  return /^(png|jpe?g|gif|webp|svg|avif)$/i.test(format);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type MetaRowProps = {
  label: string;
  left: string;
  right: string;
  differ?: boolean;
};

function MetaRow({ label, left, right, differ }: MetaRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[7rem_1fr_1fr] gap-2 border-b py-2 text-sm last:border-0",
        differ && "bg-muted/40",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium">{left}</span>
      <span className="min-w-0 break-words font-medium">{right}</span>
    </div>
  );
}

type DocumentVersionCompareProps = {
  left: DocumentListItem;
  right: DocumentListItem;
};

/**
 * Comparaison métadonnées + aperçu côte à côte (image/PDF si possible).
 */
export function DocumentVersionCompare({
  left,
  right,
}: DocumentVersionCompareProps) {
  const leftFormat = getDocumentFileFormat(left);
  const rightFormat = getDocumentFileFormat(right);
  const leftStorage =
    left.storage_type === "url" ? "URL externe" : "Fichier Storage";
  const rightStorage =
    right.storage_type === "url" ? "URL externe" : "Fichier Storage";

  return (
    <div className="space-y-4">
      <div>
        <div className="grid grid-cols-[7rem_1fr_1fr] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
          <span>Champ</span>
          <span>V{left.version_number}</span>
          <span>V{right.version_number}</span>
        </div>
        <MetaRow
          label="Titre"
          left={left.document_name}
          right={right.document_name}
          differ={left.document_name !== right.document_name}
        />
        <MetaRow
          label="Type"
          left={left.document_type.label}
          right={right.document_type.label}
          differ={left.document_type.id !== right.document_type.id}
        />
        <MetaRow
          label="Format"
          left={leftFormat}
          right={rightFormat}
          differ={leftFormat !== rightFormat}
        />
        <MetaRow
          label="Stockage"
          left={leftStorage}
          right={rightStorage}
          differ={left.storage_type !== right.storage_type}
        />
        <MetaRow
          label="Visuel"
          left={left.is_visual ? "Oui" : "Non"}
          right={right.is_visual ? "Oui" : "Non"}
          differ={left.is_visual !== right.is_visual}
        />
        <MetaRow
          label="Date"
          left={formatDate(left.created_at)}
          right={formatDate(right.created_at)}
        />
        {left.storage_type === "url" || right.storage_type === "url" ? (
          <MetaRow
            label="URL"
            left={left.url ?? "—"}
            right={right.url ?? "—"}
            differ={(left.url ?? "") !== (right.url ?? "")}
          />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ComparePreviewPane doc={left} />
        <ComparePreviewPane doc={right} />
      </div>
    </div>
  );
}

function ComparePreviewPane({ doc }: { doc: DocumentListItem }) {
  const src = previewSrc(doc);
  const previewable = isDocumentPreviewable(doc);
  const showImage = isImagePreview(doc);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">V{doc.version_number} — aperçu</p>
      <div className="overflow-hidden rounded-md border bg-muted/20">
        {previewable ? (
          showImage ? (
            <img
              src={src}
              alt={doc.document_name}
              className="mx-auto max-h-56 w-auto max-w-full object-contain p-2"
            />
          ) : (
            <iframe
              title={`Aperçu V${doc.version_number}`}
              src={src}
              className="h-56 w-full border-0"
            />
          )
        ) : (
          <div className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>Aperçu non disponible pour ce format.</p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Télécharger / ouvrir
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
