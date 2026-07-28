---
description: Stack technique, règles non négociables et variables d'environnement de Topilot. Toujours actif.
globs:
alwaysApply: true
---
# Stack technique — TOPilot

---

## Technologies

|Couche|Technologie|Notes|
|---|---|---|
|Framework|Next.js App Router, version stable actuelle||
|Langage|TypeScript strict|`strict: true` obligatoire|
|Style|Tailwind CSS||
|Composants UI|shadcn/ui|Base pour les composants réutilisables et structurants|
|Icônes|Phosphor Icons|Utilisées dans tous les boutons/icônes d'action (voir `07_ux_composants_reutilisable.mdc`, section 11)|
|Drawers|shadcn/ui Sheet (latéral droit)|Utilisés pour toutes les créations/éditions d'entités métier|
|MCP Shadcn|ShadCN MCP Server||
|Base de données|Supabase PostgreSQL|**Un seul projet Supabase**, utilisé à la fois en développement et en production|
|MCP Supabase|Supabase MCP Server|Cursor accède directement au schéma et aux migrations|
|Auth|Supabase Auth||
|Storage|Supabase Storage|Profils, documents|
|Secrets toolbox|Supabase Vault||
|Drag & drop|DnD Kit|Kanban mission et Kanban opportunité|
|Hébergement|Vercel||
|Gestionnaire paquets|npm|Lockfile unique `package-lock.json`|
|Tests|Vitest|Tests unitaires et fonctionnels (voir `00_cursor_rules.mdc`)|
|CI/CD|Vercel (déploiement auto) + GitHub Actions|Lint + types sur `dev` ; <br>Lint + types + build avant déploiement sur `main` (voir workflow Git dans `00_cursor_rules.mdc`)|
|Éditeur riche|Tiptap|Headless — utilisé pour le wiki|
|Recherche|Supabase Full-Text Search (tsvector)||
|IDE / IA|Cursor + Claude Sonnet||

---

## Règles techniques non négociables

- Les mots de passe toolbox ne sont **jamais** stockés en clair dans les tables standard.
- Les mots de passe toolbox ne sont **jamais** exposés côté client.
- Toute révélation d'un mot de passe passe **obligatoirement** par une route serveur Next.js sécurisée qui vérifie la session Supabase active avant d'interroger le Vault.
- Si la session est expirée : reconnexion obligatoire avant révélation.
- Seuls les utilisateurs authentifiés reliés à un `collaborator` dont `status = actif` peuvent accéder à l'application.
- RLS (Row Level Security) activé sur **toutes** les tables Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` est réservée aux server actions — jamais exposée côté client.
- `audit_log` est en écriture uniquement via triggers ou server actions — jamais depuis le client. Aucune suppression n'est jamais possible sur `audit_log`, pour aucun rôle.
- `must_change_password` ne doit jamais être exposé dans l'UI — mis à jour via server action + service role key uniquement.
- Les valeurs d'enum PostgreSQL sont en **snake_case sans accents** — les libellés lisibles sont gérés uniquement en UI.

---

## Variables d'environnement

```bash
NEXT_PUBLIC_SUPABASE_URL        # Public — accessible côté client
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Public — accessible côté client
SUPABASE_SERVICE_ROLE_KEY       # Serveur uniquement — accès Vault et opérations admin
```

> Ne jamais utiliser `SUPABASE_SERVICE_ROLE_KEY` dans un composant client ou une route publique. Un seul projet Supabase existe (dev = prod) : ces variables sont identiques en local et sur Vercel. Vigilance particulière requise lors de tests manuels en développement (pas d'environnement de test isolé).

---

## Architecture Next.js App Router

- Utiliser les **Server Components** par défaut — passer en Client Component uniquement si nécessaire (interactivité, hooks).
- Les appels Supabase sensibles (Vault, service role) passent **exclusivement** par des Server Actions ou des Route Handlers (`app/api/`).
- Les données publiques peuvent être lues via le client Supabase avec la clé anonyme, sous réserve des politiques RLS.
- Le middleware Next.js vérifie la session active et le `status = actif` du collaborateur avant d'autoriser l'accès aux pages métier.
- Si `must_change_password = true` : bloquer l'accès aux pages métier jusqu'au changement de mot de passe effectif.
- Les drawers de création/édition sont **sans URL dédiée** — leur état est géré localement en Client Component (via state ou context), pas via le routing.