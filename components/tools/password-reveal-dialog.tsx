"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleNotch, Copy } from "@phosphor-icons/react";
import { readVaultSecret } from "@/actions/vault";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PasswordRevealDialogProps = {
  open: boolean;
  onClose: () => void;
  vaultSecretId: string;
  accessLabel: string;
  accessIdentifier: string;
};

/**
 * Affichage ponctuel d’un mot de passe (Vault) — state local uniquement,
 * effacé à la fermeture (cf. `05_security_rls.mdc` / `10_ux_architecture.mdc`).
 */
export function PasswordRevealDialog({
  open,
  onClose,
  vaultSecretId,
  accessLabel,
  accessIdentifier,
}: PasswordRevealDialogProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    setPassword(null);
    setError(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setIsLoading(true);
      setPassword(null);
      setError(null);
      setCopied(false);

      const result = await readVaultSecret(vaultSecretId);
      if (cancelled) return;
      if (result.success) {
        setPassword(result.data.password);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, vaultSecretId]);

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mot de passe — {accessLabel}</DialogTitle>
          <DialogDescription>
            Ce mot de passe est affiché temporairement. Il sera effacé à la
            fermeture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Identifiant</p>
            <p className="font-mono text-sm">{accessIdentifier}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Mot de passe</p>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleNotch className="size-4 animate-spin" aria-hidden />
                Chargement…
              </div>
            ) : null}

            {error && !isLoading ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            {password && !isLoading && !error ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                  {password}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void handleCopy()}
                >
                  {copied ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
