/**
 * Couleur unifiée pour la date de clôture (`end_at`) — cf. 06_ui_design.mdc.
 * Retourne une classe Tailwind (ou style inline pour les hex hors tokens).
 */
export function getEndDateToneClass(
  endAt: string | null | undefined,
  options?: { muted?: boolean },
): string {
  if (options?.muted) {
    return "text-muted-foreground";
  }
  if (!endAt) {
    return "text-secondary-foreground";
  }

  const today = startOfLocalDay(new Date());
  const end = startOfLocalDay(new Date(`${endAt}T00:00:00`));
  if (Number.isNaN(end.getTime())) {
    return "text-secondary-foreground";
  }

  const diffDays = Math.round(
    (end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays < 0) return "text-destructive";
  if (diffDays === 0) return "text-[#EB9449]";
  if (diffDays <= 3) return "text-[#EAF081]";
  return "text-secondary-foreground";
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
