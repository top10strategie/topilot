/**
 * Segments de chemin non vides (sans slash initial/final).
 */
export function getPathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/**
 * Affiche le bouton Retour dès qu'on est sur une route « profonde »
 * (≥ 2 segments, ex. /clients/[id]).
 */
export function shouldShowBackButton(pathname: string): boolean {
  return getPathSegments(pathname).length >= 2;
}
