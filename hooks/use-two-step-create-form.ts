"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";

type ActionResult =
  | { success: true; id: string }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

type UseTwoStepCreateFormOptions = {
  mode: "create" | "edit";
  initialEntityId?: string;
  buildIdentificationFormData: () => FormData;
  buildFullFormData: () => FormData;
  createRecord: (formData: FormData) => Promise<ActionResult>;
  updateRecord: (
    id: string,
    formData: FormData,
  ) => Promise<ActionResult>;
  /** Après update réussi, avant toast final (ex. récurrence). `false` = erreur déjà toastée. */
  afterUpdate?: (id: string) => Promise<boolean>;
  messages?: {
    identificationSaved?: string;
    created?: string;
    updated?: string;
  };
  onResolved?: (id: string) => void;
};

/**
 * Flux création 2 temps : identification → complément (update).
 */
export function useTwoStepCreateForm({
  mode,
  initialEntityId = "",
  buildIdentificationFormData,
  buildFullFormData,
  createRecord,
  updateRecord,
  afterUpdate,
  messages,
  onResolved,
}: UseTwoStepCreateFormOptions) {
  const [isPending, startTransition] = useTransition();
  const [entityId, setEntityId] = useState(initialEntityId);
  const [identificationSaved, setIdentificationSaved] = useState(
    mode === "edit",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const showComplement = mode === "edit" || identificationSaved;

  const handleSaveIdentification = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      if (mode === "create" && !identificationSaved) {
        const result = await createRecord(buildIdentificationFormData());
        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
          return;
        }
        setEntityId(result.id);
        setIdentificationSaved(true);
        toast.success(
          messages?.identificationSaved ??
            "Identification enregistrée. Complétez les informations.",
        );
        return;
      }

      toast.message("Utilisez Enregistrer en bas du formulaire.");
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "create" && !identificationSaved) {
      void handleSaveIdentification(event);
      return;
    }
    setFieldErrors({});
    startTransition(async () => {
      const id = entityId || initialEntityId;
      const result = await updateRecord(id, buildFullFormData());
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      if (afterUpdate) {
        const ok = await afterUpdate(result.id);
        if (!ok) return;
      }
      toast.success(
        mode === "create"
          ? (messages?.created ?? "Créé avec succès.")
          : (messages?.updated ?? "Enregistré."),
      );
      onResolved?.(result.id);
    });
  };

  return {
    isPending,
    entityId,
    setEntityId,
    identificationSaved,
    showComplement,
    fieldErrors,
    setFieldErrors,
    handleSaveIdentification,
    handleSubmit,
  };
}
