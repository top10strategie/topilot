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

/** Popovers encore portailés hors du Sheet (Select Radix, etc.). */
const PORTALED_UI_SELECTOR = [
  '[data-slot="combobox-content"]',
  '[data-slot="select-content"]',
].join(", ");

function isPortaledUiEvent(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(PORTALED_UI_SELECTOR));
}

/**
 * Rend la pile de tiroirs. Chaque entrée reste montée pour conserver l'état
 * du formulaire inférieur pendant l'empilement (règle 1).
 *
 * `modal` reste toujours `true` pour éviter un remount Radix (perte du state
 * local) quand un tiroir repasse au sommet après fermeture d'un empilé.
 */
export function DrawerStackHost() {
  const { stack, dismissEntry } = useDrawerStack();

  return (
    <>
      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        const zIndex = 50 + index;

        const preventOutsideIfNeeded = (event: {
          target: EventTarget | null;
          preventDefault: () => void;
        }) => {
          if (!isTop || isPortaledUiEvent(event.target)) {
            event.preventDefault();
          }
        };

        return (
          <Sheet
            key={entry.id}
            open
            onOpenChange={(open) => {
              if (!open) {
                dismissEntry(entry.id);
              }
            }}
            modal
          >
            <SheetContent
              side="right"
              showCloseButton={isTop}
              showOverlay={isTop}
              style={{ zIndex }}
              className={cn(
                DRAWER_WIDTH_CLASS,
                "gap-0 overflow-visible p-0",
                !isTop && "pointer-events-none invisible",
              )}
              onInteractOutside={preventOutsideIfNeeded}
              onPointerDownOutside={preventOutsideIfNeeded}
              onFocusOutside={preventOutsideIfNeeded}
              onEscapeKeyDown={(event) => {
                if (!isTop) {
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
