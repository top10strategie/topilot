"use client";

import { LogoutDialog } from "@/components/layout/logout-dialog";

/**
 * Point d'entrée « bouton de déconnexion » : ouvre la modale de confirmation
 * (`LogoutDialog`). Utilisé hors shell (ex. page accès refusé).
 */
export function LogoutButton() {
  return (
    <LogoutDialog
      withLabel
      triggerVariant="outline"
      triggerLabel="Se déconnecter"
    />
  );
}
