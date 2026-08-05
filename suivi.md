# Suivi des actions — TOPilot

## **[2026-08-05] — Kanban générique missions/opportunités**

**Type :** `refactor`
**Fichiers concernés :** `components/layout/entity-kanban.tsx`, `components/missions/missions-kanban.tsx`, `components/opportunities/opportunities-kanban.tsx`, `.cursor/rules/07_ux_composants_reutilisable.mdc.md`, `suivi.md`

### Description

Branche `refactor/kanban-generique`. Shell DnD partagé `EntityKanban` (colonnes, drag, persist optimiste, overlay) ; wrappers domaine pour cartes, `buildBoard` (filtre archive missions ≤ 3 mois), totaux prix opportunités.

---

## **[2026-08-05] — Avatar sidebar + footer consultation wiki**

**Type :** `fix`
**Fichiers concernés :** `lib/auth/get-current-collaborator.ts`, `lib/auth/collaborator-display.ts`, `components/layout/app-sidebar.tsx`, `components/wiki/wiki-consultation-drawer.tsx`, `suivi.md`

### Description

Photo de profil chargée via `getCurrentCollaborator` et affichée dans le footer sidebar. Bouton « Aller aux wikis » masqué sur `/wikis`.

---

## **[2026-08-05] — Refactor sections liées + dialogs delete**

**Type :** `refactor`
**Fichiers concernés :** `components/layout/entity-linked-resource-section.tsx`, `components/{documents,tools,wiki}/entity-linked-*-section.tsx`, `components/{wiki,tools,categories,collaborators}/delete-*-dialog.tsx`, `components/collaborators/anonymize-collaborator-dialog.tsx`, `components/clients/client-detail-page-client.tsx`, `suivi.md`

### Description

Shell générique `EntityLinkedResourceSection` (docs/outils/wiki) ; dialogs delete near-duplicates en façades `ConfirmStatusDialog` (wiki, outil, accès, abo, label, anonymisation collab, contact client). Conservés séparés : document (2 actions), équipe (garde membres).

---

## **[2026-08-05] — Quick wins refactor (auth cache, lazy charts/éditeur, URLs visuels)**

**Type :** `refactor`
**Fichiers concernés :** `lib/auth/get-current-collaborator.ts`, `lib/visuels/public-url.ts`, `lib/{clients,missions,opportunities,collaborators,settings}/queries.ts`, `components/analyses/analysis-bar-chart-lazy.tsx`, panels analyses + `home-widget-renderer.tsx`, `components/wiki/wiki-form-drawer.tsx`, `suivi.md`

### Description

Branche `feature/refactor-quick-wins`. `React.cache` sur `getCurrentCollaborator` ; Recharts et TipTap en `next/dynamic` ; `resolveVisualPublicUrl` centralisé (réutilise `publicVisuelUrl`).

---

## **[2026-08-05] — Footer pagination admin catégories/types**

**Type :** `fix`
**Fichiers concernés :** `components/categories/label-entity-grid.tsx`, `components/collaborators/administration-page-client.tsx`, `suivi.md`

### Description

Onglets Catégories / Types de `/administration` : compteur et pagination via `ListPaginationFooter` (même footer fixe que les listes CRM).

---

## **[2026-08-04] — Historique CRM (`audit_log`)**

**Type :** `feature`
**Fichiers concernés :** `supabase/migrations/20260804180000_audit_log_mission_series.sql`, `lib/audit/*`, `actions/audit-logs.ts`, `components/audit/*`, `app/(app)/history/page.tsx`, `lib/navigation/menu.ts`, `components/layout/app-sidebar.tsx`, Heroes client/opportunité/mission/outil/documents/wikis, `.cursor/rules/{01,03,04,07}_*.mdc.md`, `suivi.md`

### Description

Branche `feature/audit-history`. Page `/history` (Manager/Direction) + modales lecture seule INSERT/DELETE. `mission_series` ajouté au CHECK `audit_log` + trigger. Bouton Hero `clock-counter-clockwise` séparé des autres actions.

---

## **[2026-08-04] — Consultation client/mission + fiche opportunité**

**Type :** `fix`
**Fichiers concernés :** `components/opportunities/opportunity-detail-page-client.tsx`, `components/clients/client-consultation-drawer.tsx`, `components/missions/mission-consultation-drawer.tsx`, `components/layout/entity-form-documentation-block.tsx`, `components/documents/entity-linked-documents-section.tsx`, `components/tools/entity-linked-tools-section.tsx`, `components/wiki/entity-linked-wikis-section.tsx`, `lib/clients/types.ts`, `lib/clients/queries.ts`, `.cursor/rules/10_ux_architecture.mdc.md`, `suivi.md`

### Description

Retrait du Contact sur `/opportunities/[id]`. Tiroir consultation client : tél./email par contact, Notes masquées si vides, docs/outils en lecture seule. Tiroir mission : même pattern docs/outils/wiki. Sections liées : prop `readOnly` (pas de Plus/Trash, sections vides absentes).

---

## **[2026-08-04] — Notes dans tiroirs création uniquement**

**Type :** `fix`
**Fichiers concernés :** `components/clients/client-form-drawer.tsx`, `components/opportunities/opportunity-form-drawer.tsx`, `components/missions/mission-form-drawer.tsx`, `actions/missions.ts`, `suivi.md`

### Description

Champ Notes rétabli en création (client / opportunité / mission) ; absent en édition (édition sur fiche). `updateMissionRecord` n’écrit les notes que si présentes dans le FormData.

---

## **[2026-08-04] — Fix duplication : flux 2 étapes + sync statut/proba**

**Type :** `fix`
**Fichiers concernés :** `components/missions/mission-form-drawer.tsx`, `components/opportunities/opportunity-form-drawer.tsx`, `actions/opportunities.ts`, `suivi.md`

### Description

La duplication reprend le flux création en 2 étapes (complément masqué jusqu’au 1er Enregistrer). `createOpportunityRecord` renvoie `kanban_status` / `probability_confirmation` du trigger pour éviter d’écraser `besoin_specifie` / 50 % au 2ᵉ save.

---

## **[2026-08-04] — Duplication missions/opportunités + récurrence missions**

**Type :** `feature`
**Fichiers concernés :** `supabase/migrations/20260804120000_mission_series.sql`, `actions/mission-series.ts`, `lib/missions/*`, `lib/crm/duplicate-prefill.ts`, `components/missions/*`, `components/opportunities/*`, `components/clients/*`, `components/layout/duplicate-confirm-dialog.tsx`, `app/api/cron/mission-recurrence/route.ts`, `vercel.json`, `.env.example`, `suivi.md`

### Description

Branche `feature/duplication-recurrence`. Duplication B1 (modale + tiroir création prérempli, sans docs/outils/wikis) sur listes, fiches, tableaux embarqués et consultation mission. Récurrence missions via `mission_series` + cron J−10 (`/api/cron/mission-recurrence`). Notes retirées des tiroirs client/opportunité (édition sur fiche).

---

## **[2026-08-03] — Notes autosave, archivage fiches, extensions docs, tiroirs /top10**

**Type :** `feature`
**Fichiers concernés :** `actions/entity-notes.ts`, `actions/clients.ts`, `actions/opportunities.ts`, `actions/missions.ts`, `components/notes/entity-notes-editor.tsx`, `components/layout/confirm-status-dialog.tsx`, `components/*-detail-page-client.tsx`, `lib/documents/format.ts`, `components/documents/*`, `components/collaborators/consultation-drawers.tsx`, `components/collaborators/top10-page-client.tsx`, `components/collaborators/administration-page-client.tsx`, `lib/missions/queries.ts`, `app/(app)/top10/page.tsx`, `app/(app)/missions/page.tsx`, `suivi.md`

### Description

Éditeur de notes texte avec autosave (debounce + blur) sur fiches client / opportunité / mission et notes de pôle. Boutons poubelle Hero : client → inactif, mission → archivée, opportunité → perdue (modale « perte »). `/documents` : icônes d’extension sur cartes + colonne Format. Tiroirs consultation `/top10` (et admin) : `DrawerBody`, missions récentes, avatar +20 % `object-cover`.

---

## **[2026-08-03] — Point 9 : Transverse avancé (analyses, profil, Home)**

**Type :** `feature`
**Fichiers concernés :** `lib/analyses/*`, `components/analyses/*`, `app/(app)/analyses/page.tsx`, `lib/settings/*`, `actions/settings.ts`, `components/settings/*`, `app/(app)/settings/page.tsx`, `components/home/*`, `app/(app)/page.tsx`, `supabase/migrations/20260803120000_setting_home_widgets.sql`, `package.json` (recharts), `suivi.md`

### Description

Branche `feature/transverse-avance`. Page `/analyses` (KPI + graphiques Recharts Opportunités / Missions / Abonnements). Page `/settings` (profil, thème immédiat, MDP, tiroir édition). Home configurable via 13 widgets (`setting.home_widgets`). Audit_log déjà alimenté par triggers (336+ lignes) — UI historique reportée au point 10.

---

## **[2026-08-03] — Cleanup audit : FormData, liens CRM, code mort**

**Type :** `refactor`
**Fichiers concernés :** `lib/form-data.ts`, `lib/revalidate-crm-entity.ts`, `actions/{clients,contact-clients,documents,missions,opportunities,tools,wikis,document-links,tool-links,wiki-links}.ts`, suppression `components/tutorial/`, `entity-detail-placeholder.tsx`, `suivi.md`

### Description

Passe cleanup post-audit : helpers FormData unifiés, revalidation / tables de jonction CRM partagées pour docs & outils, suppression du scaffold tutorial et du placeholder orphelin. Lint, typecheck et build OK (warnings eslint-disable inutiles retirés).

---

## **[2026-08-03] — Fix recherche globale (fonction SQL manquante)**

**Type :** `fix`
**Fichiers concernés :** `supabase/migrations/20260803102000_is_manager_or_direction.sql`, `suivi.md`

### Description

La RPC `search_global` appelait `public.is_manager_or_direction()` sans que la fonction existe → erreur « Impossible d'effectuer la recherche » depuis la modale Header. Création du helper (équivalent de `current_collaborator_role() IN ('manager', 'direction')`) pour le filtrage des `tool_access` privés.

---

## **[2026-08-03] — Documentations dans les tiroirs client / opportunité / mission**

**Type :** `feature`
**Fichiers concernés :** `components/documents/entity-linked-documents-section.tsx`, `components/tools/entity-linked-tools-section.tsx`, `components/wiki/entity-linked-wikis-section.tsx`, `components/layout/entity-form-documentation-block.tsx`, `actions/entity-documentation-links.ts`, `components/clients/client-form-drawer.tsx`, `components/opportunities/opportunity-form-drawer.tsx`, `components/missions/mission-form-drawer.tsx`, `suivi.md`

### Description

Sections Documentations (Documents / Outils / Wiki) dans les tiroirs création/édition, visibles après enregistrement de l’identification. Callback `onLinksChange` pour rafraîchir l’état local du tiroir (les fiches gardent `router.refresh`). Matrice : client et mission = docs+outils+wiki ; opportunité = docs+outils. Onglet Documentations des fiches inchangé.

---

## **[2026-07-31] — Correctifs UX `/documents`**

**Type :** `ux`
**Fichiers concernés :** `lib/documents/*`, `app/api/documents/[id]/file/route.ts`, `components/documents/*`, `components/ui/switch.tsx`, `suivi.md`

### Description

« Lié à » enrichi via FK inverses (logo client, photos profil). Bouton Ouvrir → modale d’aperçu ; Télécharger via `?download=1` (Content-Disposition). Vignette sur cartes visuelles, Actions tableau plus étroites, filtres Type/Client en 2 colonnes. Tiroir : Source en tabs, Switch Oui/Non pour `is_visual`.

---

## **[2026-07-31] — Point 8 phase B : Wiki (Tiptap)**

**Type :** `feature`
**Fichiers concernés :** `app/(app)/wikis/page.tsx`, `actions/wikis.ts`, `actions/wiki-links.ts`, `lib/wiki/*`, `components/wiki/*`, fiches client/mission, `suivi.md`

### Description

Bibliothèque `/wikis` (Cartes/Tableau, filtres catégories, drawers création/édition/consultation, éditeur Tiptap). Sections Wiki liées sur fiches Client et Mission uniquement (pas d’opportunité). Dual write `content_html` + `content_text` pour le FTS.

---

## **[2026-07-31] — Point 8 phase A : Documents + versionning**

**Type :** `feature`
**Fichiers concernés :** `app/(app)/documents/page.tsx`, `app/api/documents/[id]/file/route.ts`, `actions/documents.ts`, `actions/document-links.ts`, `lib/documents/*`, `components/documents/*`, `supabase/migrations/20260731140000_documents_bucket.sql`, fiches client/mission/opportunité, `.cursor/rules/03_business_rules.mdc.md`, `suivi.md`

### Description

Bibliothèque `/documents` (Cartes/Tableau, filtres type/version/client, drawers création/édition, versionning à l’upload, suppression version ou lignée). Bucket Storage privé `documents` + proxy URL signée. Sections Documents liées sur fiches Client / Opportunité / Mission. Correction règles métier : pas de `opportunity_wiki`.

### Détails techniques

- Upload via service role ; `is_visual` fixe le bucket (`documents` / `visuels`)
- Vue `document_latest` pour options de liaison ; liste complète + filtre « latest » côté UI
- RPC `delete_document_version` / `delete_document_lineage` puis purge Storage

---

## **[2026-07-31] — Footer fixe pagination listes**

**Type :** `ux`
**Fichiers concernés :** `components/layout/list-pagination-footer.tsx`, `components/{tools,clients,missions,opportunities}/*-page-client.tsx`, `app/(app)/layout.tsx`, `suivi.md`

### Description

Compteur + pagination en pied de page fixe ; la zone de résultats défile au-dessus. Kanban missions/opportunités : pas de barre (comportement inchangé). Shell app : `overflow-hidden` pour laisser chaque page gérer son scroll.

---

## **[2026-07-31] — Fix build cron exchange-rates (cacheComponents)**


**Type :** `fix`
**Fichiers concernés :** `app/api/cron/exchange-rates/route.ts`, `suivi.md`

### Description

Retrait de `export const dynamic = "force-dynamic"` incompatible avec `nextConfig.cacheComponents` (Next 16 / Turbopack). Build OK.

---

## **[2026-07-31] — Nettoyage artefacts migration toolbox**


**Type :** `chore`
**Fichiers concernés :** `scripts/migrate-*.ts` (supprimés), `.env.example`, `.cursor/rules/08_database_rules.mdc.md`, `suivi.md`

### Description

Retrait des scripts one-shot Top10CRM → TOPilot (migration déjà exécutée). Conservation de la doc historique (`08_database_rules` § migration, entrée phase 0) et du runtime Vault / accès outils.

---

## **[2026-07-31] — Libellés kanban, filtres pôle/propriétaire, création client**

**Type :** `ux`
**Fichiers concernés :** `lib/{opportunities,missions}/labels.ts`, `components/{clients,missions,opportunities}/*-page-client.tsx`, `components/tools/{tools-page-client,tool-access-form-drawer,tool-form-drawer,tool-detail-page-client,entity-linked-tools-section}.tsx`, `components/missions/mission-form-drawer.tsx`, `app/(app)/tools/**`, `suivi.md`

### Description

Kanban : Perdu / Terminé / Archivé. Filtres pôle (via responsable) sur clients, missions, opportunités. Filtre outils : « Propriétaire » + choix Interne. Bouton Nouveau client dans tiroirs mission et accès outil.

---

## **[2026-07-31] — Point 7 polish UI Toolbox (suite)**


**Type :** `ux` / `fix`
**Fichiers concernés :** `components/{clients,missions,opportunities}/*-page-client.tsx`, `components/tools/{tools-page-client,tool-form-drawer,tool-access-form-drawer,tool-subscription-inline-form,delete-tool-dialog}.tsx`, `actions/tools.ts`, `suivi.md`

### Description

Pagination 24 + footer sous liste sur clients / missions / opportunités. Suppression outil en cascade (accès Vault + abonnements) avec retrait optimiste de la liste. Tiroir création : libellé de l’accès créé affiché ; correction formulaire HTML imbriqué (abonnement inline) qui fermait les tiroirs.

---

## **[2026-07-31] — Point 7 polish UI Toolbox**


**Type :** `ux`
**Fichiers concernés :** `components/tools/tools-page-client.tsx`, `components/tools/tool-detail-page-client.tsx`, `components/tools/tool-form-drawer.tsx`, `components/tools/tool-access-form-drawer.tsx`, `components/layout/icon-action-button.tsx`, `components/{categories,clients,collaborators,tools}/*` (boutons suppression), `.cursor/rules/07_ux_composants_reutilisable.mdc.md`, `suivi.md`

### Description

Liste `/tools` : 24/page, compteur + pagination sous la grille (sans superposition), URL tronquée + delete sur la même ligne. Fiche outil : accès (titre / contexte / actions) en colonne gauche sous la description ; droite = abonnements. Tiroir édition outil limité à l’identification ; tiroir nouvel accès : Client + Privé sur une ligne. Suppressions : `IconActionButton` `attention` (outline → destructive au hover).

---

## **[2026-07-31] — Point 7 phase D : Liens outils (client / mission / opp)**


**Type :** `feature`
**Fichiers concernés :** `actions/tool-links.ts`, `lib/tools/queries.ts`, `lib/tools/types.ts`, `components/tools/entity-linked-tools-section.tsx`, `components/tools/tool-consultation-drawer.tsx`, `components/{clients,missions,opportunities}/*-detail-page-client.tsx`, `app/(app)/{clients,missions,opportunities}/[id]/page.tsx`, `suivi.md`

### Description

Onglets Documentations : section Outils opérationnelle sur fiches client, mission et opportunité. Liaison via `client_tool` / `mission_tool` / `opportunity_tool` (client : aussi outils avec `tool_access.client_id`), consultation en tiroir, création+lien ou lien d’un outil existant, retrait sans supprimer le catalogue.

### Détails techniques

- `fetchToolForConsultation` / `linkToolToEntity` / `unlinkToolFromEntity`
- Composant réutilisable `EntityLinkedToolsSection`

---

## **[2026-07-31] — Point 7 phase C : Abonnements + taux Frankfurter**

**Type :** `feature`
**Fichiers concernés :** `actions/tool-subscriptions.ts`, `lib/tools/pricing.ts`, `lib/exchange-rate/**`, `app/api/cron/exchange-rates/route.ts`, `vercel.json`, `components/tools/tool-subscription-inline-form.tsx`, `components/tools/delete-tool-subscription-dialog.tsx`, `components/tools/tool-detail-page-client.tsx`, `components/tools/tool-form-drawer.tsx`, `.env.example`, `suivi.md`

### Description

CRUD abonnements/tarifs sur fiche outil et tiroir création (mini-formulaire inline). Backfill async Frankfurter à l’ajout d’une nouvelle devise ; cron mensuel `/api/cron/exchange-rates` (Bearer `CRON_SECRET`).

### Détails techniques

- Montants en centimes ; plan mensuel/annuel ; une ligne de prix active (`valid_to IS NULL`) par devise
- `scheduleExchangeRateSyncIfNewCurrency` via `after()` ; écriture `exchange_rate` en service role uniquement

---

## **[2026-07-31] — Point 7 phase 0 : Migration Toolbox Top10CRM → TOPilot**

**Type :** `chore`
**Fichiers concernés :** `supabase/migrations/20260731120000_vault_secret_rpcs.sql`, `scripts/migrate-vault-secrets.ts`, `scripts/migrate-toolbox-data.ts`, `suivi.md`

### Description

Migration one-shot des données toolbox depuis Top10CRM : 72 outils, 73 accès, 7 abonnements, 8 prix, 30 taux, 78 jonctions catégories. Secrets Vault recréés côté TOPilot (73/73) via `migrate-vault-secrets.ts` (lecture V1 depuis `../top10crm/.env`, écriture V2 via `.env.local`).

### Détails techniques

- RPC Vault déjà présentes sur TOPilot (`insert_secret` / `read_secret` / `delete_secret` / `update_secret`)
- `client_id` des accès migrés à `NULL` (absent en V1)
- Pas de clé supplémentaire à ajouter dans `.env.local` pour l’app runtime

---

## **[2026-07-31] — Point 7 phase B : Accès outils + Vault**

**Type :** `feature`
**Fichiers concernés :** `actions/vault.ts`, `actions/tool-access.ts`, `lib/tools/types.ts`, `lib/tools/queries.ts`, `lib/uuid.ts`, `components/tools/password-reveal-dialog.tsx`, `components/tools/tool-access-form-drawer.tsx`, `components/tools/delete-tool-access-dialog.tsx`, `components/tools/tool-detail-page-client.tsx`, `components/tools/tool-form-drawer.tsx`, `components/tools/tools-page-client.tsx`, `app/(app)/tools/**`, `suivi.md`

### Description

Phase B Toolbox : création / édition / suppression d’accès (`tool_access`), secrets via Vault (révélation après preuve RLS), toggle Privé (Manager/Direction), client nullable, dialog révélation mot de passe, premier accès optionnel dans le tiroir nouvel outil.

### Détails techniques

- `readVaultSecret` / `createVaultSecret` / `updateVaultSecret` / `deleteVaultSecret` via `createAdminClient` + RPC ; révélation uniquement si ligne `tool_access` lisible en session
- Carte Accès : Interne/client, identifiant, `••••••••`, actions Œil / Crayon / Corbeille, indicateur `lock-simple` si privé

---

## **[2026-07-30] — Point 6 phase C : Missions liées (opp / client)**

**Type :** `feature`
**Fichiers concernés :** `components/missions/mission-consultation-drawer.tsx`, `components/opportunities/opportunity-detail-page-client.tsx`, `components/clients/client-detail-page-client.tsx`, `app/(app)/opportunities/[id]/page.tsx`, `app/(app)/clients/[id]/page.tsx`, `suivi.md`

### Description

Onglets Missions sur fiches opportunité et client : tableau des missions liées, consultation en tiroir, création avec champs FK verrouillés (`opportunity_id` / `client_id`, périmètre client). Bouton « Aller à la mission ».

### Détails techniques

- `listMissionsByOpportunityId` / `listMissionsByClientId` + props form (collaborators, categories, opportunityOptions, currentCollaboratorId)
- `MissionFormDrawer` : prop `lockedFields` pour masquer/désactiver scope, client et opportunité

---

## **[2026-07-30] — Point 6 phase B : Kanban missions (DnD)**

**Type :** `feature`
**Fichiers concernés :** `components/missions/missions-kanban.tsx`, `components/missions/missions-page-client.tsx`, `suivi.md`

### Description

Vue Kanban par défaut sur `/missions` : 4 colonnes (`a_faire`, `en_cours`, `terminee`, `archivee`), drag-and-drop `@dnd-kit` avec `updateMissionsKanban`, montage post-hydratation. Colonne Archivée limitée aux missions avec `archived_at` ≤ 3 mois.

### Détails techniques

- Pas d’agrégat montants (contrairement opportunités)
- Carte : titre, catégories | scope, client/Interne | responsable, opportunité | dates début/fin

---

## **[2026-07-30] — Point 6 phase A : Pipe production missions (liste + fiche)**

**Type :** `feature`
**Fichiers concernés :** `components/missions/mission-form-drawer.tsx`, `components/missions/missions-page-client.tsx`, `components/missions/mission-detail-page-client.tsx`, `app/(app)/missions/**`, `suivi.md`

### Description

Pipe production itération A : `/missions` (vues Cartes/Tableau, filtres, pagination, recherche) et `/missions/[id]` (onglet Informations + stubs Documentations). Tiroir création 2 temps / édition (checkbox Mission interne). Kanban livré en phase B.

### Détails techniques

- Pages serveur : `listMissions`, `getMissionById`, `listMissionOpportunityOptions`, `getCurrentCollaborator`
- Filtres : client, responsable, catégories, périmètre, statut, plages dates début/fin

---

## **[2026-07-30] — Redirect post update-password → /auth/login**

**Type :** `fix`
**Fichiers concernés :** `components/update-password-form.tsx`, `suivi.md`

### Description

Après enregistrement du nouveau mot de passe : `signOut` puis `window.location.assign(/auth/login)` (navigation hard — le soft `router.push` laissait l’utilisateur sur la page).

---

## **[2026-07-30] — Point 5 itération B : Kanban opportunités (DnD)**

**Type :** `feature`
**Fichiers concernés :** `actions/opportunities.ts`, `components/opportunities/opportunities-kanban.tsx`, `components/opportunities/opportunities-page-client.tsx`, `suivi.md`

### Description

Vue Kanban par défaut sur `/opportunities` : 6 colonnes (ordre enum), drag-and-drop `@dnd-kit` avec mise à jour optimiste de `kanban_status` / `kanban_order`, agrégat moyenne `average_price` par colonne, rollback + toast en cas d’échec.

### Détails techniques

- Action batch `updateOpportunitiesKanban`
- Archivées visibles dans le Kanban (colonnes Gagné / Perdue) ; masquage par défaut conservé en vues Cartes / Tableau

---

## **[2026-07-30] — Fix flux invitation Auth (token_hash / hash / PKCE)**

**Type :** `fix`
**Fichiers concernés :** `app/auth/confirm/route.ts`, `app/auth/callback/page.tsx`, `app/auth/error/page.tsx`, `components/auth/*`, `components/update-password-form.tsx`, `lib/auth/*`, `actions/collaborators.ts`, `suivi.md`

### Description

Correction de l’erreur « No token hash or type » sur le lien d’invitation collaborateur : `/auth/confirm` gère `token_hash` + `code` PKCE ; fallback client `/auth/callback` (et récupération sur `/auth/error`) pour le flux implicite `#access_token`.

### Détails techniques

- `inviteRedirectTo` → destination finale `/auth/update-password` (`{{ .RedirectTo }}` du template TokenHash)
- Template Supabase attendu : `/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}`

---

## **[2026-07-30] — Point 5 itération A : Pipe commercial (liste + fiche opportunité)**

**Type :** `feature`
**Fichiers concernés :** `actions/opportunities.ts`, `lib/opportunities/*`, `components/opportunities/*`, `app/(app)/opportunities/**`, `suivi.md`

### Description

Pipe commercial itération A : `/opportunities` (vues Cartes/Tableau, filtres, pagination) et `/opportunities/[id]` (onglet Informations). Tiroir création 2 temps / édition, liaison client/contact/responsable/catégories. Stubs Missions et Documentations. Kanban DnD reporté à l’itération B.

### Détails techniques

- Trigger DB `set_opportunity_kanban_defaults` pour statut initial + proba / archivage `is_active`
- Archivées (`gagne`/`perdue`) masquées par défaut, réaffichables via filtre
- Empilement drawers Client / Contact / Catégorie depuis le tiroir opportunité

---

## **[2026-07-29] — Point 4 : CRM Clients (liste, fiche, contacts, responsable)**

**Type :** `feature`
**Fichiers concernés :** `actions/clients.ts`, `actions/contact-clients.ts`, `lib/clients/*`, `components/clients/*`, `app/(app)/clients/**`, `lib/search/types.ts`, `supabase/migrations/20260729180000_client_logo_type_and_contact_fts.sql`, `suivi.md`

### Description

CRM Clients sur `/clients` et `/clients/[id]` : liste (cartes/tableau, filtres), création 2 temps / édition, contacts (`is_main`, Hover Card, mode gestion), responsable collaborateur obligatoire, catégories multi, logo, stubs Missions/Outils/Wiki. FTS contact → fiche client ; seed type « Logo client ».

---

## **[2026-07-29] — CRUD Catégories & Types + team_category**

**Type :** `feature`
**Fichiers concernés :** `actions/categories.ts`, `actions/document-types.ts`, `actions/teams.ts`, `lib/categories/*`, `components/categories/*`, `components/collaborators/administration-page-client.tsx`, `components/collaborators/team-form-drawer.tsx`, `components/collaborators/collaborator-form-drawer.tsx`, `app/(app)/administration/page.tsx`, `suivi.md`

### Description

Onglets Catégories et Types sur `/administration` (CRUD complet, Hero recherche + crayon contextuel). Association multi-sélection des catégories sur Nouveau/Édition Pôle avec tiroir empilé « Nouvelle catégorie » et sync `team_category`.

### Détails techniques

- Auth CRUD catégories/types : tout collaborateur actif (`requireActiveCollaboratorAction`)
- Pagination 25/page, unicité `label`, toast FK si type encore référencé
- `createTeam` / `updateTeam` acceptent `category_ids[]` et synchronisent la jonction

---

## **[2026-07-29] — Logo NavBar simplifié + text-2xl fallback**

**Type :** `chore`
**Fichiers concernés :** `public/logo_topilot.svg`, `public/topilot-mark-mono-dark.svg`, `public/topilot-mark-mono-white.svg`, `components/layout/app-sidebar-fallback.tsx`, `suivi.md`

### Description

Remplacement du logo NavBar par une version SVG simplifiée (marque T), ajout des variantes mono dark/white, alignement du titre fallback sur `text-2xl`.

---

## **[2026-07-29] — Titre NavBar TOPilot en text-2xl**

**Type :** `fix`
**Fichiers concernés :** `components/layout/app-sidebar.tsx`, `suivi.md`

### Description

Le `SidebarMenuButton` (size `lg`) imposait `text-sm` et écrasait le titre. Ajout de `className="h-auto text-2xl"` + `text-2xl` sur le span « TOPilot ».

---

## **[2026-07-29] — SidebarHeader plus haut (h-17)**

**Type :** `chore`
**Fichiers concernés :** `components/layout/app-sidebar.tsx`, `components/layout/app-sidebar-fallback.tsx`, `suivi.md`

### Description

Hauteur du `SidebarHeader` portée de `h-14` à `h-17` (sidebar + fallback).

---

## **[2026-07-29] — Favicon TOPilot**

**Type :** `chore`
**Fichiers concernés :** `app/icon.svg`, `app/layout.tsx`, `suivi.md`

### Description

Favicon projet basé sur `public/topilot-favicon.svg` : copie en `app/icon.svg` (convention App Router) + déclaration `metadata.icons`.

---

## **[2026-07-29] — Boutons icon-only /administration**

**Type :** `fix`
**Fichiers concernés :** `components/collaborators/administration-page-client.tsx`, `suivi.md`

### Description

Alignement sur la spec §11 : boutons d'action sans texte visible (`size="icon"`), icône `user-plus` pour l'ajout pôle/collaborateur, `aria-label` / `title` pour l'accessibilité.

---

## **[2026-07-29] — Point 3 itération C : invitation + CRUD collaborateurs**

**Type :** `feature`
**Fichiers concernés :** `actions/collaborators.ts`, `components/collaborators/collaborator-form-drawer.tsx`, `components/collaborators/anonymize-collaborator-dialog.tsx`, `components/collaborators/administration-page-client.tsx`, `lib/collaborators/profile-picture.ts`, `lib/app-url.ts`, `components/ui/select.tsx`, `supabase/migrations/20260729140000_profile_picture_type_and_visuels_bucket.sql`, `.env.example`, `suivi.md`

### Description

CRUD collaborateurs sur `/administration` : création via `inviteUserByEmail` + INSERT immédiat (`auth_user_id`), édition, offboarding par anonymisation. Avatar optionnel (bucket `visuels`). Empilement tiroir « Nouveau Pôle » depuis le formulaire collaborateur.

### Détails techniques

- Rollback Auth (`deleteUser`) si l'INSERT `collaborator` échoue après l'invitation
- `redirectTo` invitation → `/auth/confirm?next=/auth/update-password` (`NEXT_PUBLIC_SITE_URL` ou localhost)
- Seed `document_type` « Photo de profil » + bucket `visuels` (migration appliquée)
- Impossible de s'anonymiser soi-même ; statut `sorti` exclu de la grille admin
- Checks : lint + typecheck OK

---

## **[2026-07-29] — UX cartes Top10 + fix recherche globale**

**Type :** `fix`
**Fichiers concernés :** `components/collaborators/collaborator-card.tsx`, `components/collaborators/team-card.tsx`, `components/search/global-search-dialog.tsx`, `supabase/migrations/20260729124000_search_global_prefix_tsquery.sql`, `suivi.md`

### Description

- Badge Manager → icône Phosphor `star` ancrée en haut à droite de la carte
- Padding des cartes pôle `/top10` réduit de moitié (`p-6` → `p-3`)
- Recherche globale : debounce + état « Recherche… » pendant l’attente (corrige le faux « Aucun résultat » dû à `useDeferredValue`) ; FTS en préfixe (`token:*`) pour la saisie progressive

### Détails techniques

- Migration `search_global_prefix_tsquery` appliquée sur le projet Supabase distant
- Checks : lint + typecheck OK

---

## **[2026-07-29] — Fix Suspense Cache Components (/top10, /administration)**

**Type :** `fix`
**Fichiers concernés :** `app/(app)/top10/page.tsx`, `app/(app)/administration/page.tsx`, `suivi.md`

### Description

Correction de l'erreur Next.js `blocking-route` (`cacheComponents`) : les `await` de données session/DB étaient hors `<Suspense>`, ce qui bloquait la navigation.

### Détails techniques

- Contenu async extrait dans un composant serveur enfant wrappé par `<Suspense>` + fallback skeleton (même pattern que `entity-detail-placeholder`)

---

## **[2026-07-29] — Point 3 itération B : CRUD Pôles**

**Type :** `feature`
**Fichiers concernés :** `actions/teams.ts`, `components/collaborators/team-form-drawer.tsx`, `components/collaborators/delete-team-dialog.tsx`, `components/collaborators/administration-page-client.tsx`, `components/ui/textarea.tsx`, `suivi.md`

### Description

CRUD des pôles sur `/administration` : création / édition via tiroirs, suppression avec confirmation. Suppression refusée tant que des collaborateurs (tous statuts) restent rattachés — déplacement obligatoire avant. Catégories de pôle reportées (placeholder).

### Détails techniques

- Server actions `createTeam` / `updateTeam` / `deleteTeam` gardées par `requireManagerOrDirectionAction`
- Unicité `team_name` gérée (erreur 23505 → message inline)
- `notes_updated_at` mis à jour uniquement si les notes changent
- Modale suppression : bouton désactivé + message si `memberCount > 0`
- Checks : `npm run lint` + `npm run typecheck` OK

---

## **[2026-07-29] — Point 3 itération A : consultation Collaborateurs & Pôles**

**Type :** `feature`
**Fichiers concernés :** `app/(app)/top10/page.tsx`, `app/(app)/administration/page.tsx`, `components/collaborators/*`, `components/ui/tabs.tsx`, `lib/auth/roles.ts`, `lib/auth/require-action.ts`, `lib/auth/collaborator-display.ts`, `lib/auth/get-current-collaborator.ts`, `lib/collaborators/*`, `suivi.md`

### Description

Première livrable du point roadmap 3 (Gestion Collaborateurs & Équipes) : page `/top10` en consultation (pôles + collaborateurs, recherche contextuelle, tiroirs lecture), structure `/administration` avec placeholders Catégories/Types et onglet Collaborateurs & Pôles réservé Manager/Direction (lecture seule, CRUD à venir).

### Détails techniques

- Branche : `feature/collaborators-teams`
- Helpers : `canManageCollaboratorsAndTeams`, `requireManagerOrDirectionAction`
- Queries : `loadPeopleDirectory` / `listCollaborators` (avatar public bucket `visuels` si présent)
- Décisions actées : invite email (itération suivante), placeholders catégories/types, suppression pôle avec déplacement forcé des collabs
- Sections missions/opportunités/clients des tiroirs masquées (dépendances CRM / pipe non livrées)
- Checks : `npm run lint` + `npm run typecheck` OK

---

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
