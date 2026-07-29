"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  resolve: (value: unknown) => void;
};

type PushDrawerOptions<T> = {
  title: string;
  content: (helpers: DrawerHelpers<T>) => ReactNode;
};

type DrawerStackContextValue = {
  stack: ReadonlyArray<Pick<DrawerEntry, "id" | "title" | "content">>;
  pushDrawer: <T>(options: PushDrawerOptions<T>) => Promise<T | null>;
  dismissTop: () => void;
  clearStack: () => void;
  depth: number;
};

const DrawerStackContext = createContext<DrawerStackContextValue | null>(null);

function createDrawerId(): string {
  return `drawer-${crypto.randomUUID()}`;
}

export function DrawerStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrawerEntry[]>([]);

  const dismissTop = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const top = prev[prev.length - 1];
      top.resolve(null);
      return prev.slice(0, -1);
    });
  }, []);

  const clearStack = useCallback(() => {
    setStack((prev) => {
      for (const entry of prev) {
        entry.resolve(null);
      }
      return [];
    });
  }, []);

  const pushDrawer = useCallback(<T,>(options: PushDrawerOptions<T>) => {
    return new Promise<T | null>((resolvePromise) => {
      const id = createDrawerId();

      const settle = (value: unknown) => {
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
        resolve: settle,
      };

      setStack((prev) => [...prev, entry]);
    });
  }, []);

  const value = useMemo<DrawerStackContextValue>(
    () => ({
      stack: stack.map(({ id, title, content }) => ({ id, title, content })),
      pushDrawer,
      dismissTop,
      clearStack,
      depth: stack.length,
    }),
    [stack, pushDrawer, dismissTop, clearStack],
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
