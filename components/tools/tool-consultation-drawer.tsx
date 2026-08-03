"use client";

import { useRouter } from "next/navigation";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolDetail } from "@/lib/tools/types";

type ToolConsultationDrawerProps = {
  tool: ToolDetail;
  helpers: DrawerHelpers<null>;
};

/**
 * Tiroir de consultation outil (lecture seule) — footer « Aller à l'outil ».
 */
export function ToolConsultationDrawer({
  tool,
  helpers,
}: ToolConsultationDrawerProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBody className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Identification</h3>

          <div className="grid gap-4 text-sm">
            <div className="grid gap-1">
              <p className="text-muted-foreground">Titre</p>
              <p className="font-medium">{tool.tool_name}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">URL</p>
              <a
                href={tool.url}
                target="_blank"
                rel="noreferrer"
                className="break-all font-medium text-primary-foreground underline-offset-4 hover:underline"
              >
                {tool.url}
              </a>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Catégories</p>
              <div className="flex flex-wrap gap-1">
                {tool.categories.length === 0 ? (
                  <span>—</span>
                ) : (
                  tool.categories.map((category) => (
                    <Badge key={category.id} variant="secondary">
                      {category.label}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="grid gap-1">
              <p className="text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {tool.description?.trim() || "Aucune description."}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2 border-t pt-4 text-sm">
          <p className="text-muted-foreground">
            Accès ({tool.accesses.length}) · Abonnements (
            {tool.subscriptions.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Consultez la fiche outil pour gérer les accès et abonnements.
          </p>
        </section>
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          onClick={() => {
            helpers.dismiss();
            router.push(`/tools/${tool.id}`);
          }}
        >
          Aller à l&apos;outil
        </Button>
      </DrawerFooterActions>
    </div>
  );
}
