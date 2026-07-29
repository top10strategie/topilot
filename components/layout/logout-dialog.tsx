"use client";

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
import { createClient } from "@/lib/supabase/client";
import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutDialogProps = {
  /** Affiche un bouton pleine largeur avec libellé (sidebar mobile). */
  withLabel?: boolean;
};

export function LogoutDialog({ withLabel = false }: LogoutDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {withLabel ? (
          <Button type="button" variant="ghost" className="w-full justify-start gap-2">
            <SignOut className="size-5" />
            Déconnexion
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Déconnexion"
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
        <DialogFooter className="gap-2 sm:gap-0">
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
