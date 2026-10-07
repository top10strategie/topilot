/** Création d’accès : mot de passe obligatoire (même sémantique que `if (!password)`). */
export function hasToolAccessPassword(password: string): boolean {
  return Boolean(password);
}

/** Édition : vide / espaces = ne pas toucher au Vault. */
export function shouldUpdateVaultPassword(password?: string): boolean {
  return Boolean(password?.trim());
}
