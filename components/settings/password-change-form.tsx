"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { updateOwnPassword } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateOwnPassword({ password, confirm });
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setFieldErrors({});
      setPassword("");
      setConfirm("");
      toast.success("Mot de passe mis à jour.");
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Modifiez votre mot de passe de connexion
      </p>
      <div className="grid gap-2">
        <Label htmlFor="new_password">Nouveau mot de passe</Label>
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.password)}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm_password">Confirmation</Label>
        <Input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.confirm)}
        />
        {fieldErrors.confirm ? (
          <p className="text-sm text-destructive">{fieldErrors.confirm}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Modification…" : "Modifier le mot de passe"}
      </Button>
    </form>
  );
}
