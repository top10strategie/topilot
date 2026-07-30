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

/** Durée alignée sur `data-[state=closed]:duration-300` du Sheet. */
const DRAWER_CLOSE_MS = 300;

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
  /** `false` = animation de sortie en cours (évite un unmount brutal / overlay zombie). */
  open: boolean;
  /** Clôture unique (évite de fermer le tiroir parent sur onOpenChange après resolve). */
  settle: (value: unknown) => void;
};

type PushDrawerOptions<T> = {
  title: string;
  content: (helpers: DrawerHelpers<T>) => ReactNode;
};

type DrawerStackContextValue = {
  stack: ReadonlyArray<
    Pick<DrawerEntry, "id" | "title" | "content" | "open">
  >;
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

/** Nettoie un `pointer-events: none` résiduel sur body (bug Radix modals empilés). */
function restoreBodyPointerEventsIfSafe() {
  const openDialog = document.querySelector(
    '[data-slot="sheet-content"][data-state="open"], [data-slot="dialog-content"][data-state="open"]',
  );
  if (!openDialog && document.body.style.pointerEvents === "none") {
    document.body.style.pointerEvents = "";
  }
}

export function DrawerStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrawerEntry[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const closeTimersRef = useRef<Map<string, number>>(new Map());

  const removeEntry = useCallback((id: string) => {
    const timer = closeTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      closeTimersRef.current.delete(id);
    }
    setStack((prev) => prev.filter((entry) => entry.id !== id));
    queueMicrotask(restoreBodyPointerEventsIfSafe);
  }, []);

  const dismissTop = useCallback(() => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (!top || !top.open) {
      return;
    }
    top.settle(null);
  }, []);

  const dismissEntry = useCallback((id: string) => {
    const top = stackRef.current[stackRef.current.length - 1];
    if (!top || top.id !== id || !top.open) {
      return;
    }
    top.settle(null);
  }, []);

  const clearStack = useCallback(() => {
    const current = [...stackRef.current];
    for (const entry of current) {
      if (entry.open) {
        entry.settle(null);
      }
    }
  }, []);

  const pushDrawer = useCallback(
    <T,>(options: PushDrawerOptions<T>) => {
      return new Promise<T | null>((resolvePromise) => {
        const id = createDrawerId();
        let settled = false;

        const settle = (value: unknown) => {
          if (settled) {
            return;
          }
          settled = true;
          resolvePromise((value as T | null) ?? null);
          setStack((prev) =>
            prev.map((entry) =>
              entry.id === id ? { ...entry, open: false } : entry,
            ),
          );
          const existing = closeTimersRef.current.get(id);
          if (existing !== undefined) {
            window.clearTimeout(existing);
          }
          const timer = window.setTimeout(() => {
            removeEntry(id);
          }, DRAWER_CLOSE_MS);
          closeTimersRef.current.set(id, timer);
        };

        const helpers: DrawerHelpers<T> = {
          resolve: (value) => settle(value),
          dismiss: () => settle(null),
        };

        const entry: DrawerEntry = {
          id,
          title: options.title,
          content: options.content(helpers),
          open: true,
          settle,
        };

        setStack((prev) => [...prev, entry]);
      });
    },
    [removeEntry],
  );

  const value = useMemo<DrawerStackContextValue>(
    () => ({
      stack: stack.map(({ id, title, content, open }) => ({
        id,
        title,
        content,
        open,
      })),
      pushDrawer,
      dismissTop,
      dismissEntry,
      clearStack,
      depth: stack.filter((entry) => entry.open).length,
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
