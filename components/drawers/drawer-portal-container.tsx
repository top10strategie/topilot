"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type RefCallback,
} from "react";

const DrawerPortalContainerContext = createContext<HTMLElement | null>(null);

/**
 * Conteneur de portal à l'intérieur du Sheet : les popovers (Combobox, etc.)
 * restent dans le DOM du tiroir modal et restent cliquables.
 */
export function DrawerPortalContainerProvider({
  children,
}: {
  children: (portalRef: RefCallback<HTMLDivElement>) => ReactNode;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <DrawerPortalContainerContext.Provider value={container}>
      {children(setContainer)}
    </DrawerPortalContainerContext.Provider>
  );
}

export function useDrawerPortalContainer(): HTMLElement | null {
  return useContext(DrawerPortalContainerContext);
}
