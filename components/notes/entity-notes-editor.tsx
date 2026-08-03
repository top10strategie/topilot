"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  updateEntityNotes,
  type NotesEntity,
} from "@/actions/entity-notes";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 1800;

type EntityNotesEditorProps = {
  entity: NotesEntity;
  entityId: string;
  initialNotes: string | null;
  className?: string;
  rows?: number;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Notes texte libre avec autosave (debounce + blur).
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialNotes ?? "");
    lastSavedRef.current = initialNotes ?? "";
    setStatus("idle");
  }, [entityId, initialNotes]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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

  const scheduleSave = (next: string) => {
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      persist(next);
    }, DEBOUNCE_MS);
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
          const next = event.target.value;
          setValue(next);
          scheduleSave(next);
        }}
        onBlur={() => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          persist(value);
        }}
        placeholder="Saisir une note…"
        className="min-h-[8rem] resize-y text-sm"
      />
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
