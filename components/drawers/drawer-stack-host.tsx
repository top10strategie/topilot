"use client";

import { DrawerPortalContainerProvider } from "@/components/drawers/drawer-portal-container";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Largeurs spec §7 : desktop 60%, tablette 75%, mobile plein écran. */
const DRAWER_WIDTH_CLASS =
  "w-full sm:w-[75vw] sm:max-w-none lg:w-[60vw] lg:max-w-none";

/** Sous les contenus de tiroirs (z ≥ 50), au-dessus de la page. */
const STACK_OVERLAY_Z = 49;

/** Marge (px) : un clic trop près du bord du Sheet est traité comme un miss, pas un dismiss. */
const OVERLAY_EDGE_SLACK_PX = 24;

function hasOpenPortaledPicker(): boolean {
  return Boolean(
    document.querySelector(
      [
        '[data-slot="select-content"][data-state="open"]',
        '[data-slot="combobox-content"]',
        '[data-slot="combobox-content"][data-open]',
      ].join(", "),
    ),
  );
}

function isPointerNearOpenSheet(clientX: number, clientY: number): boolean {
  const sheets = document.querySelectorAll<HTMLElement>(
    '[data-slot="sheet-content"][data-state="open"]',
  );
  for (const sheet of sheets) {
    const rect = sheet.getBoundingClientRect();
    if (
      clientX >= rect.left - OVERLAY_EDGE_SLACK_PX &&
      clientX <= rect.right + OVERLAY_EDGE_SLACK_PX &&
      clientY >= rect.top - OVERLAY_EDGE_SLACK_PX &&
      clientY <= rect.bottom + OVERLAY_EDGE_SLACK_PX
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Rend la pile de tiroirs. Chaque entrée reste montée pour conserver l'état
 * du formulaire inférieur pendant l'empilement (règle 1).
 *
 * `modal` reste toujours `true` pour éviter un remount Radix (perte du state
 * local) quand un tiroir repasse au sommet après fermeture d'un empilé.
 *
 * Un seul overlay est géré par la pile (pas l'overlay Radix du Sheet) : ainsi
 * il ne peut pas se remonter au-dessus du contenu du tiroir parent après
 * fermeture d'un empilé.
 *
 * Les interactions « outside » du Sheet sont toujours ignorées : sinon un clic
 * pour fermer un Select/Combobox ferme aussi le tiroir. Seuls l'overlay de
 * pile (hors picker ouvert / miss près du bord), le bouton fermer et Escape
 * ferment le tiroir.
 */
export function DrawerStackHost() {
  const { stack, dismissTop, dismissEntry } = useDrawerStack();
  const hasDrawer = stack.length > 0;

  return (
    <>
      {hasDrawer ? (
        <div
          data-slot="drawer-stack-overlay"
          aria-hidden
          className="fixed inset-0 bg-black/50 pointer-events-auto"
          style={{ zIndex: STACK_OVERLAY_Z }}
          onPointerDown={(event) => {
            // Select/Combobox ouverts : ne pas preventDefault ni dismiss —
            // laisser Radix fermer uniquement le picker (souvent au-dessus
            // de l'overlay).
            if (hasOpenPortaledPicker()) {
              return;
            }
            event.preventDefault();
            // Miss près du bord du Sheet (ex. sélecteur Client à gauche).
            if (isPointerNearOpenSheet(event.clientX, event.clientY)) {
              return;
            }
            dismissTop();
          }}
        />
      ) : null}

      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        const zIndex = 50 + index;

        const ignoreSheetOutside = (event: {
          preventDefault: () => void;
        }) => {
          event.preventDefault();
        };

        return (
          <Sheet
            key={entry.id}
            open={entry.open}
            onOpenChange={(open) => {
              if (!open) {
                dismissEntry(entry.id);
              }
            }}
            modal
          >
            <SheetContent
              side="right"
              showCloseButton={isTop && entry.open}
              showOverlay={false}
              style={{ zIndex }}
              className={cn(
                DRAWER_WIDTH_CLASS,
                "gap-0 overflow-visible p-0",
                isTop
                  ? "pointer-events-auto"
                  : "pointer-events-none invisible",
              )}
              onInteractOutside={ignoreSheetOutside}
              onPointerDownOutside={ignoreSheetOutside}
              onFocusOutside={ignoreSheetOutside}
              onEscapeKeyDown={(event) => {
                if (!isTop || !entry.open) {
                  event.preventDefault();
                }
              }}
            >
              <DrawerPortalContainerProvider>
                {(portalRef) => (
                  <>
                    <SheetHeader className="border-b px-4 py-4 text-left">
                      <SheetTitle>{entry.title}</SheetTitle>
                      <SheetDescription className="sr-only">
                        Tiroir {entry.title}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                      {entry.content}
                    </div>
                    {/* Portal host hors zone scroll : popovers cliquables dans le Sheet. */}
                    <div
                      ref={portalRef}
                      data-slot="drawer-portal-container"
                      className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
                    />
                  </>
                )}
              </DrawerPortalContainerProvider>
            </SheetContent>
          </Sheet>
        );
      })}
    </>
  );
}
