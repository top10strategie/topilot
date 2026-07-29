"use client";

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

/**
 * Rend la pile de tiroirs. Chaque entrée reste montée pour conserver l'état
 * du formulaire inférieur pendant l'empilement (règle 1).
 */
export function DrawerStackHost() {
  const { stack, dismissTop } = useDrawerStack();

  return (
    <>
      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        const zIndex = 50 + index;

        return (
          <Sheet
            key={entry.id}
            open
            onOpenChange={(open) => {
              if (!open && isTop) {
                dismissTop();
              }
            }}
            modal={isTop}
          >
            <SheetContent
              side="right"
              showCloseButton={isTop}
              style={{ zIndex }}
              className={cn(
                DRAWER_WIDTH_CLASS,
                "gap-0 p-0",
                !isTop && "pointer-events-none opacity-0",
              )}
              onInteractOutside={(event) => {
                if (!isTop) {
                  event.preventDefault();
                }
              }}
              onEscapeKeyDown={(event) => {
                if (!isTop) {
                  event.preventDefault();
                }
              }}
            >
              <SheetHeader className="border-b px-4 py-4 text-left">
                <SheetTitle>{entry.title}</SheetTitle>
                <SheetDescription className="sr-only">
                  Tiroir {entry.title}
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                {entry.content}
              </div>
            </SheetContent>
          </Sheet>
        );
      })}
    </>
  );
}
