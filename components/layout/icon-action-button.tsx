"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type IconActionButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
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
}: IconActionButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
