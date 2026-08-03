"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { updateOwnTheme } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import type { AppTheme } from "@/lib/settings/types";
import { nextToTheme, themeToNext } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AppTheme; label: string }[] = [
  { value: "clair", label: "Clair" },
  { value: "sombre", label: "Sombre" },
  { value: "systeme", label: "Système" },
];

type ThemePreferenceButtonsProps = {
  initialTheme: AppTheme;
  disabled?: boolean;
  /** Si false, ne persiste pas en base (ex. tiroir — le parent soumet le thème). */
  persistImmediate?: boolean;
  onThemeChange?: (theme: AppTheme) => void;
};

export function ThemePreferenceButtons({
  initialTheme,
  disabled,
  persistImmediate = true,
  onThemeChange,
}: ThemePreferenceButtonsProps) {
  const { setTheme, theme } = useTheme();
  const [selected, setSelected] = useState<AppTheme>(initialTheme);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelected(initialTheme);
    setTheme(themeToNext(initialTheme));
  }, [initialTheme, setTheme]);

  const current = mounted && theme ? nextToTheme(theme) : selected;

  const apply = (value: AppTheme) => {
    setSelected(value);
    setTheme(themeToNext(value));
    onThemeChange?.(value);
    if (!persistImmediate) return;
    startTransition(async () => {
      const result = await updateOwnTheme(value);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Thème mis à jour.");
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={current === option.value ? "default" : "outline"}
          size="sm"
          disabled={disabled || isPending}
          className={cn(current === option.value && "pointer-events-none")}
          onClick={() => apply(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
