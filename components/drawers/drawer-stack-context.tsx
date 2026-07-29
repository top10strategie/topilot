"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DrawerHelpers<T = unknown> = {
  /** Valide le tiroir et renvoie une valeur au demandeur (règle 3 empilement). */
  resolve: (value: T) => void;
  /** Annule / ferme sans valeur (règle 2 — état du tiroir inférieur conservé). */
  dismiss: () => void;
};

type DrawerEntry = {
  id: string;
  title: string;
  content: ReactNode;
  /** Clôture unique (évite de fermer le tiroir parent sur onOpenChange après resolve). */
  settle: (value: unknown) => void;
};

type PushDrawerOptions<T> = {
  title: string;
  content: (helpers: DrawerHelpers<T>) => ReactNode;
};

type DrawerStackContextValue = {
  stack: ReadonlyArray<Pick<DrawerEntry, "id" | "title" | "content">>;
  pushDrawer: <T>(options: PushDrawerOptions<T>) => Promise<T | null>;
  dismissTop: () => void;
  /** Ferme uniquement si `id` est encore au sommet (ignore les onOpenChange fantômes). */
  dismissEntry: (id: string) => void;
  clearStack: () => void;
  depth: number;
};

const DrawerStackContext = createContext<DrawerStackContextValue | null>(null);

function createDrawerId(): string {
  return `drawer-${crypto.randomUUID()}`;
}

export function DrawerStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrawerEntry[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const dismissTop = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1];
    top?.settle(null);
  }, []);

  const dismissEntry = useCallback((id: string) => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (!top || top.id !== id) {
      return;
    }
    top.settle(null);
  }, []);

  const clearStack = useCallback(() => {
    const current = stackRef.current;
    for (const entry of current) {
      entry.settle(null);
    }
  }, []);

  const pushDrawer = useCallback(<T,>(options: PushDrawerOptions<T>) => {
    return new Promise<T | null>((resolvePromise) => {
      const id = createDrawerId();
      let settled = false;

      const settle = (value: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        setStack((prev) => prev.filter((entry) => entry.id !== id));
        resolvePromise((value as T | null) ?? null);
      };

      const helpers: DrawerHelpers<T> = {
        resolve: (value) => settle(value),
        dismiss: () => settle(null),
      };

      const entry: DrawerEntry = {
        id,
        title: options.title,
        content: options.content(helpers),
        settle,
      };

      setStack((prev) => [...prev, entry]);
    });
  }, []);

  const value = useMemo<DrawerStackContextValue>(
    () => ({
      stack: stack.map(({ id, title, content }) => ({ id, title, content })),
      pushDrawer,
      dismissTop,
      dismissEntry,
      clearStack,
      depth: stack.length,
    }),
    [stack, pushDrawer, dismissTop, dismissEntry, clearStack],
  );

  return (
    <DrawerStackContext.Provider value={value}>
      {children}
    </DrawerStackContext.Provider>
  );
}

export function useDrawerStack(): DrawerStackContextValue {
  const context = useContext(DrawerStackContext);
  if (!context) {
    throw new Error(
      "useDrawerStack doit être utilisé dans un DrawerStackProvider.",
    );
  }
  return context;
}
