"use client";

import { Button } from "@/components/ui/button";
import { StarAndCrescent, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
  /** Affiche un bouton pleine largeur avec libellé (sidebar mobile). */
  withLabel?: boolean;
};

export function ThemeToggle({ withLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (withLabel) {
      return (
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2"
          disabled
        >
          <Sun className="size-5" />
          Thème
        </Button>
      );
    }

    return (
      <Button type="button" variant="ghost" size="icon" aria-label="Thème" disabled>
        <Sun className="size-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const ariaLabel = isDark ? "Passer en mode clair" : "Passer en mode sombre";
  const icon = isDark ? (
    <StarAndCrescent className="size-5" weight="regular" />
  ) : (
    <Sun className="size-5" weight="regular" />
  );

  if (withLabel) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2"
        aria-label={ariaLabel}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {icon}
        Thème
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={ariaLabel}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {icon}
    </Button>
  );
}
