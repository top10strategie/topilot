import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Zone Hero d'une page métier : identification à gauche, actions à droite
 * (empilées sur mobile).
 */
export function PageHero({ title, actions, className }: PageHeroProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-4 border-b border-border/60 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5",
        className,
      )}
    >
      <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
        {title}
      </h1>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
