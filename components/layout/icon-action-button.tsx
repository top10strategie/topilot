"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconActionButtonProps = {
  label: string;
  onClick: ComponentProps<typeof Button>["onClick"];
  children: ReactNode;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
  /**
   * Bouton de suppression (§11) : variant Basique (`outline`) au repos,
   * Attention (`destructive`) au survol / focus / clic.
   */
  attention?: boolean;
};

/**
 * Bouton d'action icon-only (spec §11 — pas de texte visible).
 * `aria-label` + `title` obligatoires pour l'accessibilité.
 */
export function IconActionButton({
  label,
  onClick,
  children,
  disabled,
  variant = "outline",
  className,
  attention = false,
}: IconActionButtonProps) {
  return (
    <Button
      type="button"
      variant={attention ? "outline" : variant}
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        attention &&
          "hover:border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:border-destructive focus-visible:bg-destructive focus-visible:text-destructive-foreground active:border-destructive active:bg-destructive active:text-destructive-foreground",
        className,
      )}
    >
      {children}
    </Button>
  );
}
