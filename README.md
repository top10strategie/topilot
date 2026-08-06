# TOPilot

Outil interne de gestion d’agence (CRM, pipe commercial, missions, toolbox, wiki, documents).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Supabase (Auth, Postgres, RLS, Storage, Vault)
- Tailwind CSS 4 + shadcn/ui (new-york) + Phosphor Icons

## Prérequis

- Node.js 20+
- Projet Supabase configuré (voir `.env.example`)

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

## Documentation projet

- Suivi livraisons : [`suivi.md`](suivi.md)
- Règles Cursor : [`.cursor/rules/`](.cursor/rules/)

## Migrations

Les migrations SQL vivent dans `supabase/migrations/`. Appliquer via le workflow Supabase du projet (MCP / CLI).
