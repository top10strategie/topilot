"use client";

import { SignOut } from "@phosphor-icons/react";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { cn } from "@/lib/utils";

type LogoutDialogProps = {
  /** Affiche le libellé « Déconnexion » à côté de l'icône. */
  withLabel?: boolean;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
  /** Libellé du trigger (défaut : Déconnexion). */
  triggerLabel?: string;
};

/**
 * Bouton trigger + modale de confirmation de déconnexion.
 * Le trigger ouvre toujours la dialog ; la session n'est coupée qu'après confirmation.
 */
export function LogoutDialog({
  withLabel = false,
  triggerVariant = "ghost",
  triggerClassName,
  triggerLabel = "Déconnexion",
}: LogoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // redirect() Server Action — ne pas router.refresh() la page protégée
      // une fois la session coupée (permission denied helpers RLS en anon).
      await signOutAction();
    } catch (error) {
      const digest =
        error && typeof error === "object" && "digest" in error
          ? String((error as { digest?: unknown }).digest)
          : "";
      if (digest.startsWith("NEXT_REDIRECT")) {
        return;
      }
      console.error("signOutAction:", error);
      toast.error("Impossible de se déconnecter.");
      window.location.assign(LOGIN_PATH);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {withLabel ? (
          <Button
            type="button"
            variant={triggerVariant}
            className={cn("w-full justify-start gap-2", triggerClassName)}
          >
            <SignOut className="size-5" />
            {triggerLabel}
          </Button>
        ) : (
          <Button
            type="button"
            variant={triggerVariant}
            size="icon"
            aria-label={triggerLabel}
            title={triggerLabel}
            className={triggerClassName}
          >
            <SignOut className="size-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déconnexion</DialogTitle>
          <DialogDescription>
            Vous allez quitter TOPilot. Êtes-vous sûr de vouloir vous déconnecter
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? "Déconnexion…" : "Déconnexion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
