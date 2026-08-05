---
description: Vision produit, périmètre V1 et phases de développement de TOPilot. Toujours actif.
globs:
alwaysApply: true
---
# Contexte projet — TOPilot

## Présentation générale

**Nom du projet :** TOPilot
**Type :** outil interne de gestion d'agence
**Utilisateurs :** collaborateurs de l'entreprise uniquement (~11 utilisateurs)
**Langue de l'interface :** français

### Objectif V1

Centraliser l'information client, opportunité, missions et réduire la dispersion des outils, accès et documents.

### Principes produit

- Les **opportunités et missions** sont les axes centrals du produit.
- Les missions peuvent être internes, pour un besoin qui ne concerne aucun client enregistré en base : `mission_scope = interne` et `client_id` nul, sans référentiel "entreprise" séparé.
- La navigation doit être rapide depuis toutes les pages.
- Les données importantes doivent être accessibles en quelques clics maximum.
- Le produit doit être utile au quotidien, simple à comprendre et rapide à utiliser.
- Le projet privilégie une logique métier claire avec des permissions simples.
- L'interface est professionnelle et amicale, avec des couleurs vives cohérentes avec la charte graphique.
- Les formulaires de création et d'édition se font exclusivement via des drawers latéraux droits, modulaires et réutilisables.
- Le pipe commercial est pris en charge dès l'identification d'un client (suspect) et finis par soit la cloture d'une opportunité (fermé), soit par la validation de l'opportunité (gagné) et la création de missions en réponses aux besoins de cette opportunité.

---

## Périmètre V1 — inclus

1. Pipe commercial : de la prospection à la cloture de l'opportunité.
2. CRM clients / contacts : gestion des clients
3. Pipe production : de la création d'une mission à sa cloture en passant par son affectation.
4. Kanban mission + Kanban opportunité
5. Toolbox et accès outils (chiffrés via Supabase Vault)
6. Wiki interne éditable (Tiptap, tous les rôles)
7. Gestion documentaire + versionning numéroté léger
8. Drawers latéraux droits pour création/édition de toutes les entités métier principales
9. Dashboards d'analyse et étude : concernant les opportunités, les missions et les coûts des outils
10. Gestion des catégories et des utilisateurs
11. Recherche transverse (Supabase FTS)
12. Historique automatique
13. Préférences utilisateur et page profil
14. Analyse CA par catégorie de mission et par équipe sur période définie (basée sur `opportunity.price` / `average_price`)
15. Analyse du budget client mensuel (basée sur `opportunity.price` / `average_price`)
16. Missions récurrentes, répétitives et dupliquées
17. Versionning documentaire avancé (diff, restauration)
18. Ré-authentification avant changement de mot de passe

> `client.is_active` (booléen) est le seul indicateur de statut client, géré manuellement.

---

## Roadmap de développement

1. **Fondations** — projet Next.js/Supabase, schéma DB complet + RLS + triggers, Auth + middleware + rôles, `suivi.md`.
2. **Structure UI transverse** — NavBar/Header/Hero, drawers empilables, thème/dark-mode, recherche globale (FTS backend).
3. **Gestion Collaborateurs & Équipes** — admin utilisateurs, rôles, teams.
4. **CRM Clients** — client, contact_client, catégories, documents/logo, notes.
5. **Pipe commercial** — opportunité (kanban + vues), liaison client/contact_client.
6. **Pipe production** — mission (kanban + vues), clôture opportunité → création mission(s).
7. **Toolbox** — tool, tool_access (+ Vault), tool_subscription, exchange_rate, abonnements.
8. **Wiki & Documents** — wiki (Tiptap), documents + versionning.
9. **Transverse avancé** — audit_log/historique (`/history` + modales fiches), dashboards & analyses (CA, budget), page profil/préférences.
10. **Transverse à délibérer** - missions récurrentes et ré-authentification avant changement de mot de passe (règles à préciser à ce moment).

Cet ordre reflète les dépendances techniques (fondations avant tout) et fonctionnelles (les collaborateurs/équipes sont référencés par toutes les autres entités).