/**
 * Couleur unifiée pour une date d'échéance / fin — cf. 06_ui_design.mdc.
 * Missions : `end_at` ; opportunités : `due_date_at`.
 */
export function getEndDateToneClass(
  endAt: string | null | undefined,
  options?: { muted?: boolean },
): string {
  if (options?.muted) {
    return "text-muted-foreground";
  }
  if (!endAt) {
    return "text-secondary-foreground dark:text-sidebar-accent font-semibold";
  }

  const today = startOfLocalDay(new Date());
  const end = startOfLocalDay(new Date(`${endAt}T00:00:00`));
  if (Number.isNaN(end.getTime())) {
    return "text-secondary-foreground dark:text-sidebar-accent font-semibold";
  }

  const diffDays = Math.round(
    (end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays < 0) return "text-destructive";
  if (diffDays === 0) return "text-[#ff8f2e]";
  if (diffDays <= 3) return "text-[#eed13f]";
  return "text-secondary-foreground dark:text-sidebar-accent font-semibold";
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
