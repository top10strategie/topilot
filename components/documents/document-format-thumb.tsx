"use client";

import {
  File as FileIcon,
  FileCsv,
  FilePdf,
  FilePpt,
  FileXls,
  FileZip,
} from "@phosphor-icons/react";
import { getDocumentFileFormat } from "@/lib/documents/format";
import type { DocumentListItem } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

type DocumentFormatThumbProps = {
  item: DocumentListItem;
  className?: string;
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
 * Vignette carte document : preview image si disponible, sinon icône + extension.
 */
export function DocumentFormatThumb({
  item,
  className,
}: DocumentFormatThumbProps) {
  const format = getDocumentFileFormat(item);
  const showPreview = Boolean(item.preview_url);

  return (
    <div
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground",
        className,
      )}
    >
      {showPreview ? (
        <img
          src={item.preview_url!}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <>
          <FormatIcon format={format} className="size-6" />
          <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-medium uppercase leading-none">
            {format === "—" ? "fichier" : format}
          </span>
        </>
      )}
    </div>
  );
}
