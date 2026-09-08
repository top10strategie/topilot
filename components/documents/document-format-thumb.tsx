"use client";

import {
  File as FileIcon,
  FileCsv,
  FilePdf,
  FilePpt,
  FileXls,
  FileZip,
} from "@phosphor-icons/react";
import { ClientLogo } from "@/components/clients/client-logo";
import { getDocumentFileFormat } from "@/lib/documents/format";
import type { DocumentListItem } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

type DocumentThumbItem = Pick<
  DocumentListItem,
  | "document_name"
  | "file_path"
  | "storage_type"
  | "url"
  | "preview_url"
>;

type DocumentFormatThumbProps = {
  item: DocumentThumbItem;
  className?: string;
  /** Taille du slot (défaut size-16 pour les cartes `/documents`). */
  sizeClassName?: string;
};

function FormatIcon({
  format,
  className,
}: {
  format: string;
  className?: string;
}) {
  const props = { className, "aria-hidden": true as const };
  switch (format) {
    case "pdf":
      return <FilePdf {...props} />;
    case "ppt":
    case "pptx":
      return <FilePpt {...props} />;
    case "csv":
      return <FileCsv {...props} />;
    case "xls":
    case "xlsx":
      return <FileXls {...props} />;
    case "zip":
    case "rar":
    case "7z":
      return <FileZip {...props} />;
    default:
      return <FileIcon {...props} />;
  }
}

/**
 * Vignette carte document : preview image via ClientLogo si disponible,
 * sinon icône + extension (même slot size-16).
 */
export function DocumentFormatThumb({
  item,
  className,
  sizeClassName = "size-16",
}: DocumentFormatThumbProps) {
  const format = getDocumentFileFormat(item);
  const isCompact = sizeClassName.includes("size-10") || sizeClassName.includes("size-8");

  if (item.preview_url) {
    return (
      <ClientLogo
        src={item.preview_url}
        name={item.document_name}
        size={isCompact ? "sm" : "md"}
        className={cn(sizeClassName, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-[8px] border bg-muted text-muted-foreground",
        sizeClassName,
        className,
      )}
    >
      <FormatIcon
        format={format}
        className={isCompact ? "size-4" : "size-6"}
      />
      {isCompact ? null : (
        <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-medium uppercase leading-none">
          {format === "—" ? "fichier" : format}
        </span>
      )}
    </div>
  );
}
