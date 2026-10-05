"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  updateEntityNotes,
  type NotesEntity,
} from "@/actions/entity-notes";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EntityNotesEditorProps = {
  entity: NotesEntity;
  entityId: string;
  initialNotes: string | null;
  className?: string;
  rows?: number;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Notes texte libre : enregistrement à Entrée ou au blur.
 * Maj+Entrée insère une nouvelle ligne.
 */
export function EntityNotesEditor({
  entity,
  entityId,
  initialNotes,
  className,
  rows = 6,
}: EntityNotesEditorProps) {
  const [value, setValue] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const lastSavedRef = useRef(initialNotes ?? "");

  useEffect(() => {
    setValue(initialNotes ?? "");
    lastSavedRef.current = initialNotes ?? "";
    setStatus("idle");
  }, [entityId, initialNotes]);

  const persist = (next: string) => {
    if (next === lastSavedRef.current) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    setError(null);
    startTransition(async () => {
      const result = await updateEntityNotes({
        entity,
        entityId,
        notes: next,
      });
      if (!result.success) {
        setStatus("error");
        setError(result.error);
        return;
      }
      lastSavedRef.current = next;
      setStatus("saved");
    });
  };

  const statusLabel =
    status === "saving"
      ? "Enregistrement…"
      : status === "saved"
        ? "Enregistré"
        : status === "dirty"
          ? "Modifications non enregistrées"
          : status === "error"
            ? error ?? "Erreur d'enregistrement"
            : null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Textarea
        value={value}
        rows={rows}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("dirty");
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          if (event.nativeEvent.isComposing) return;
          event.preventDefault();
          persist(value);
        }}
        onBlur={() => {
          persist(value);
        }}
        placeholder="Saisir une note…"
        className="min-h-[8rem] resize-y text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Entrée pour enregistrer, Maj+Entrée pour une nouvelle ligne.
      </p>
      {statusLabel ? (
        <p
          className={cn(
            "text-xs",
            status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {statusLabel}
        </p>
      ) : null}
    </div>
  );
}
