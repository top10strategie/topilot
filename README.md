# TOPilot

Outil interne de gestion d’agence : centraliser clients, opportunités, missions, outils et documents pour limiter la dispersion du quotidien.

## Pour qui

Collaborateurs de l’entreprise uniquement (~11 utilisateurs). Interface entièrement en français.

## Périmètre V1

- Pipe commercial (prospection → clôture d’opportunité) et kanban associé
- CRM clients / contacts
- Pipe production (missions, affectation, clôture) et kanban associé
- Toolbox et accès outils (identifiants chiffrés via Supabase Vault)
- Wiki interne (Tiptap) et gestion documentaire (versionning léger)
- Recherche transverse, historique automatique, dashboards (CA, budget, coûts outils)
- Administration : collaborateurs, équipes, catégories, profil / préférences

## Principes

- Les **opportunités** et les **missions** sont le cœur du produit.
- Navigation rapide : l’essentiel accessible en quelques clics.
- Création et édition via des **drawers** latéraux droits, réutilisables.
- Logique métier claire, permissions simples, UI professionnelle et amicale.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Supabase (Auth, Postgres, RLS, Storage, Vault)
- Tailwind CSS 4 + shadcn/ui + Phosphor Icons

## Prérequis

- Node.js 20+
- Projet Supabase configuré (voir [`.env.example`](.env.example))

## Démarrage

```bash
cp .env.example .env.local
# renseigner les clés Supabase
npm install
npm run dev
```

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Aller plus loin

- Documentation technique (wiki / reprise de main) : [`docs/wiki/documentation-technique.html`](docs/wiki/documentation-technique.html)
- Suivi des livraisons : [`suivi.md`](suivi.md)
- Règles et contexte projet : [`.cursor/rules/`](.cursor/rules/)
- Migrations SQL : [`supabase/migrations/`](supabase/migrations/)
