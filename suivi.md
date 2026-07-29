# Suivi des actions — TOPilot

## **[2026-07-29] — Workflow push : GitHub Desktop (humain)**

**Type :** `docs`
**Fichiers concernés :** `.cursor/rules/00_cursor_rules.mdc.md`, `suivi.md`

### Description

Décision permanente : l’agent Cursor gère branches, commits et checks locaux ; les push vers GitHub sont faits manuellement via GitHub Desktop.

---

## **[2026-07-29] — CI/CD GitHub Actions (dev + main)**

**Type :** `config`
**Fichiers concernés :** `.github/workflows/ci-dev.yml`, `.github/workflows/ci-main.yml`, `package.json`, `eslint.config.mjs`, `components/layout/entity-detail-placeholder.tsx`, `suivi.md`

### Description

Mise en place de la CI selon les règles projet : lint + types sur `dev` ; lint + types + build sur `main`. Correction ESLint (ignore `.next`) pour rendre la CI utilisable.

### Détails techniques

- Script `npm run typecheck` (`tsc --noEmit`)
- Workflows : `CI (dev)` et `CI (main)` (Node 22, `npm ci`)
- Build `main` : variables Supabase factices (secrets réels côté Vercel)
- À configurer sur GitHub : Branch protection `main` → status check requis « Lint + types + build » pour bloquer le merge / déploiement si CI rouge

---

## **[2026-07-29] — ThemeToggle withLabel (sidebar mobile)**

**Type :** `fix`
**Fichiers concernés :** `components/layout/theme-toggle.tsx`, `components/layout/app-sidebar.tsx`, `suivi.md`

### Description

En mobile, icône + libellé « Thème » regroupés dans un seul bouton ghost (comme Recherche / Déconnexion).

---

## **[2026-07-29] — Correction effective header + Separator NavBar**

**Type :** `fix`
**Fichiers concernés :** `components/layout/app-sidebar.tsx`, `suivi.md`

### Description

Application réelle des corrections manquantes : header logo en `SidebarMenuButton` (hover/select), séparateurs via `Separator` ShadCN (`max-w-[80%]`).

### Détails techniques

- Remplacement de `SidebarSeparator` + `w-[80%]` (écrasé par `data-[orientation=horizontal]:w-full`) par `Separator` + `mx-auto max-w-[80%]`
- Logo conservé en `size-10`

---

## **[2026-07-29] — Separator ShadCN, header interactif, modale recherche**

**Type :** `fix`
**Fichiers concernés :** `components/layout/app-sidebar.tsx`, `components/search/global-search-dialog.tsx`, `.cursor/rules/07_ux_composants_reutilisable.mdc.md`, `suivi.md`

### Description

Remplacement de `SidebarSeparator` par le `Separator` ShadCN (`max-w-[80%]`), alignement hover/sélection du header logo sur les items de menu, suppression des `border-b` de la modale de recherche.

### Détails techniques

- Header : `SidebarMenuButton` + `isActive={pathname === "/"}`
- Séparateurs : `Separator` avec `mx-auto max-w-[80%]`
- Modale recherche : retrait des `border-b` sur header et zone input

---

## **[2026-07-29] — Ajustements présentation NavBar**

**Type :** `fix`
**Fichiers concernés :** `components/layout/app-sidebar.tsx`, `components/layout/app-sidebar-fallback.tsx`, `.cursor/rules/07_ux_composants_reutilisable.mdc.md`, `suivi.md`

### Description

Affinage de la NavBar : header logo sans état « sélectionné » ni border-bottom, séparateurs à ~80 % de largeur, footer utilisateur en lien direct vers `/settings`.

### Détails techniques

- Logo + nom : `Link` simple vers `/` (plus de ring/bouton type menu)
- `SidebarSeparator` : `mx-auto w-[80%]`
- Footer : `SidebarMenuButton` + `Link` `/settings` (suppression du `DropdownMenu`)

---

## **[2026-07-29] — NavBar flottante (variant sidebar-04)**

**Type :** `refactor`
**Fichiers concernés :** `components/layout/app-sidebar.tsx`, `components/layout/app-sidebar-fallback.tsx`, `app/(app)/layout.tsx`, `suivi.md`

### Description

Alignement visuel de la NavBar sur le block ShadCN sidebar-04 : barre flottante (coins arrondis, ombre, padding) sans modification des menus.

### Détails techniques

- `variant="floating"` + `collapsible="icon"` conservé
- `--sidebar-width: 19rem` sur `SidebarProvider` (comme le page.tsx officiel sidebar-04)

---

## **[2026-07-28] — Bouton Retour Header (tous viewports)**

**Type :** `feature`
**Fichiers concernés :** `lib/navigation/path.ts`, `components/layout/back-button.tsx`, `components/layout/app-header.tsx`, `suivi.md`

### Description

Remplace le Retour toujours visible par un affichage conditionnel (≥ 2 segments de pathname), sur tous les écrans, placé à droite du `SidebarTrigger`.

### Détails techniques

- `shouldShowBackButton` : `pathname.split("/").filter(Boolean).length >= 2`
- Clic : `router.back()` (historique navigateur)
- Label « Retour » masqué sous `sm` (icône seule) pour ne pas encombrer à côté du trigger mobile

---

## **[2026-07-28] — Point 2 phase B : drawers empilables + FTS**

**Type :** `feature`
**Fichiers concernés :** `components/drawers/*`, `components/search/*`, `components/layout/global-search-trigger.tsx`, `app/(app)/layout.tsx`, `actions/search.ts`, `lib/search/types.ts`, `supabase/migrations/20260728120014_fts_search_vector_immutable.sql`, pages `[id]` placeholder, `suivi.md`

### Description

Complément du point 2 : pile de tiroirs (`DrawerStackProvider` / `pushDrawer`) et recherche transverse FTS (colonnes `search_vector`, RPC `search_global`, modale + raccourci ⌘K).

### Détails techniques

- Drawers : Sheets empilés (60% / 75% / plein écran), état inférieur conservé, `resolve` / `dismiss` pour injection dans le tiroir parent.
- FTS : helpers IMMUTABLE `fts_french` / `fts_french_tags` (évite erreur 42P17) ; filtre `tool_access` privé côté serveur ; `audit_log` exclu.
- UI recherche : `GlobalSearchProvider` + Dialog ; navigation vers listes / fiches placeholder.
- Placeholders `/clients/[id]`, `/opportunities/[id]`, `/missions/[id]`, `/tools/[id]` pour les liens FTS.
- Build OK (Suspense fallback sidebar sans `usePathname`).

---

## **[2026-07-28] — Point 2 phase A : shell UI transverse**

**Type :** `feature`
**Fichiers concernés :** `app/(app)/layout.tsx`, `app/(app)/*/page.tsx`, `components/layout/*`, `lib/navigation/menu.ts`, `lib/auth/get-current-collaborator.ts`, `lib/auth/collaborator-display.ts`, `components/ui/avatar.tsx`, `suivi.md`

### Description

Mise en place du shell applicatif (NavBar, Header, Hero, thème, déconnexion) avec pages menu placeholder. Routes auth `/auth/*` hors shell. Drawers empilables et FTS reportés en phase B.

### Détails techniques

- Groupe de routes `app/(app)` + `SidebarProvider` / primitives shadcn sidebar (`collapsible="icon"`).
- Menus Phosphor selon spec ; Home sans item actif ; utilisateur bas (avatar + menu → `/settings`).
- Header : retour stub (`router.back`), recherche placeholder (Dialog), ThemeToggle (Sun / StarAndCrescent), LogoutDialog (bouton `--secondary`).
- Actions header reportées dans la sidebar en mobile.
- `getCurrentCollaborator` en Suspense (compat Cache Components Next 16).
- Build OK.

---

## **[2026-07-28] — Nettoyage du starter Next.js / Supabase**

**Type :** `chore`
**Fichiers concernés :** `app/page.tsx`, `app/layout.tsx`, `app/auth/error/page.tsx`, `components/forgot-password-form.tsx`, `public/logo_topilot.svg`, `tsconfig.json`, `suivi.md` ; suppression de `components/tutorial/`, `app/protected/`, `app/dashboard/`, composants démo starter, types Next.js obsolètes, images OG starter

### Description

Retrait du surplus du starter avant la phase « Structure UI transverse ». Home minimale (placeholder texte), auth utile conservée, logo déplacé dans `public/`.

### Détails techniques

- Conservé : `/auth/login`, `/auth/forgot-password`, `/auth/update-password`, `/auth/confirm`, `/auth/error`, `/auth/access-denied`, clients Supabase, proxy, UI shadcn, `theme-switcher`.
- Supprimé : tutorial, sign-up, `/protected`, `/dashboard`, logos Next/Supabase, deploy/auth buttons, types générés morts.
- `lang="fr"` + metadata TOPilot dans le layout racine.
- Build OK — routes restantes = `/` + auth uniquement.

---

## **[2026-07-28] — Correction des GRANT API PostgREST**

**Type :** `fix`
**Fichiers concernés :** `supabase/migrations/20260728120012_grant_public_api_privileges.sql`, `actions/auth.ts`, `suivi.md`

### Description

Après application des migrations via MCP, les tables `public` n'avaient pas les privilèges SELECT/INSERT/UPDATE/DELETE pour `anon`, `authenticated` et `service_role`. La RPC `get_auth_gate_state` (SECURITY DEFINER) fonctionnait, mais `clearMustChangePassword` via le client service role échouait (« Collaborateur actif introuvable » / 422).

### Détails techniques

- Migration `grant_public_api_privileges` appliquée via MCP + fichier local.
- Messages d'erreur de `clearMustChangePassword` plus explicites en cas d'échec PostgREST.

---

## **[2026-07-28] — Fondations env local, schéma Supabase MCP et gate Auth**

**Type :** `config`
**Fichiers concernés :** `lib/supabase/proxy.ts`, `lib/supabase/env.ts`, `lib/supabase/admin.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/utils.ts`, `lib/auth/constants.ts`, `lib/auth/types.ts`, `actions/auth.ts`, `app/auth/access-denied/page.tsx`, `components/login-form.tsx`, `components/update-password-form.tsx`, `components/logout-button.tsx`, `.env.example`, `tsconfig.json`, `supabase/migrations/20260728120011_auth_gate_state_function.sql`, `suivi.md`

### Description

Mise en place de l'environnement de fondations : schéma DB appliqué via MCP Supabase (projet TOPilot), middleware d'accès métier (collaborateur actif + changement de mot de passe forcé), alignement des variables d'environnement.

### Détails techniques

- Dépendances Tailwind v4 (`tw-animate-css`) déjà en place — plus de référence à `tailwindcss-animate` ; exclusion des types Next.js obsolètes dans `types/` qui bloquaient le build.
- Schéma complet (enums, tables, triggers, RLS) + `get_auth_gate_state()` appliqués via MCP `user-supabase-topilot` (pas de CLI `supabase db`).
- Proxy : session Auth → RPC `get_auth_gate_state` → refus si pas actif ; redirection `/auth/update-password` si `must_change_password` ; page `/auth/access-denied`.
- `clearMustChangePassword` via service role après `updateUser` (champ jamais exposé dans l'UI).
- `.env.example` : `ANON_KEY` / publishable + `SUPABASE_SERVICE_ROLE_KEY`.

---
