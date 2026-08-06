---
description: Rôles, permissions et toutes les règles métier structurantes de Topilot. Toujours actif — ces règles conditionnent chaque composant, action serveur et trigger.
globs:
alwaysApply: true
---
# Règles métier — TOPilot

---

## Rôles et permissions

### Les 3 rôles (pas de rôle Admin en V1)

|Rôle|Description|
|---|---|
|**Direction**|Accès complet. Peut supprimer définitivement `collaborator` (offboarding) et `team`, et voir, gérer et supprimer les accès toolbox privés.|
|**Manager**|Accès complet au contenu métier. Responsable d'une équipe. Peut supprimer définitivement `collaborator` (offboarding) et `team`, voir et gérer les accès toolbox privés.|
|**Collaborateur**|Accès standard. Peut créer, modifier et archiver tous les objets métier. Peut supprimer définitivement toute table métier hors `client`/`mission`/`opportunity` (jamais supprimables), `collaborator`/`team` (réservés Manager/Direction) et les accès toolbox privés (réservés Manager/Direction).|

### Tableau des permissions

|Action|Collaborateur|Manager|Direction|
|---|---|---|---|
|Lire les données métier|✅|✅|✅|
|Créer / modifier objets métier|✅|✅|✅|
|Archiver|✅|✅|✅|
|Supprimer définitivement (`client`, `mission`, `opportunity`)|❌|❌|❌|
|Supprimer définitivement (`collaborator`, `team`)|❌|✅|✅|
|Supprimer définitivement (`tool_access` privé)|❌|✅|✅|
|Supprimer définitivement (toute autre table : `document`, `wiki`, `contact_client`, `tool`, `tool_access` non privé, `category`, `document_type`, `tool_subscription`, `tool_subscription_price`, `exchange_rate`, `setting`)|✅|✅|✅|
|Privatiser un accès toolbox|❌|✅|✅|
|Voir un accès toolbox privé|❌|✅|✅|

> `client`, `mission` et `opportunity` ne sont **jamais** supprimables définitivement, par aucun rôle — uniquement archivables (`is_active` / `kanban_status`). `collaborator` n'a **jamais** de vraie suppression SQL, même par Manager/Direction — l'offboarding passe exclusivement par anonymisation + `status = sorti` (voir `04_database_schema.mdc` et `05_security_rls.mdc`). `audit_log` n'est supprimable par **aucun** rôle.

### Règles transverses

- Tout le monde peut lire l'ensemble des données métier principales.
- La fiche collaborateur est visible par tous.
- Les accès toolbox privés (`is_private = true`) sont **invisibles** pour le rôle Collaborateur — y compris dans la recherche transverse ; visibles et gérables par Manager et Direction.

---

## Référentiels métier — Enums en base

> **Règle d'or :** tous les enums SQL sont en **snake_case sans accents**. Les libellés lisibles sont gérés uniquement à l'affichage UI.

```
collaborator.role               : direction | manager | collaborator
collaborator.status             : actif | inactif | sorti
setting.theme                   : clair | sombre | systeme
mission.mission_scope           : client | interne
mission.kanban_status           : a_faire | en_cours | terminee | archivee
opportunity.kanban_status       : suspect | prospect | besoin_specifie | proposition_envoyee | gagne | perdue
opportunity.priority            : faible | normal | urgente | prioritaire
document.storage_type           : supabase | url
tool_subscription.subscription_plan : annuel | mensuel
audit_log.action                : INSERT | UPDATE | DELETE
```

---

## Client — cycle commercial complet

- Entité externe avec un responsable Top10 (`main_collaborator_id`).
- Tous les collaborateurs peuvent voir tous les clients.
- Un seul lien Drive principal par client (`client.drive_link`, nullable).
- Les back-offices client sont un type d'outil spécifique à un client utilisant la table `tool` et ayant un accès spécifique `tool_access.client_id`.
- Le client est soit actif, soit inactif (`client.is_active`) — géré manuellement pour le moment.

### Contact principal (`contact_client.is_main`)

- Un client peut avoir plusieurs `contact_client`, mais **un seul est le contact principal** maximum (`is_main = true`), garanti par contrainte en base (voir `04_database_schema.mdc`).
- Le **premier contact créé** pour un client devient automatiquement principal, sans action requise de l'utilisateur.
- Désigner un autre contact comme principal retire automatiquement ce statut à l'ancien (un seul _principal_ à la fois).
- **Impossible de retirer le statut principal du seul contact principal existant** sans en désigner un autre au préalable — dès qu'un client a au moins un contact, il a toujours exactement un contact principal (jamais zéro). Le toggle "Contact principal" du dernier contact principal reste donc bloqué sur "Oui" en UI, en plus du blocage en base.
- Si le contact principal est supprimé, le contact restant **le plus ancien** (`created_at`) du même client est automatiquement promu principal.
- Le contact principal fournit le téléphone et l'email affichés partout où une seule coordonnée doit être montrée pour un client (ex. vue Tableau de `/clients`).

### Champs obligatoires à la création

Même dans un formulaire d'ajout rapide (ex : depuis le drawer de création de mission), les champs suivants sont obligatoires :

- `client_name`
- `website`
- `main_collaborator_id`

`logo_id` et `drive_link` sont **nullable** et peuvent être renseignés plus tard.

---

## Mission

- Le terme métier unique est **mission**.
- Une mission appartient **soit** à un client (`mission_scope = client` et `client_id` renseigné), **soit** à un besoin interne (`mission_scope = interne` et `client_id` null) — vérifié par la contrainte `mission_scope_client_coherence`.
- Dans le tiroir de création/édition, cette bascule se fait via un **toggle "Interne : Oui/Non"** : "Oui" force `mission_scope = interne` et masque/désactive le champ Client ; "Non" force `mission_scope = client` et rend le champ Client visible et obligatoire.
- **Une mission interne est toujours distinguée visuellement** dans toutes les listes et fiches (badge coloré `--secondary`, cf. `06_ui_design.mdc`) — affiché dans le champ "Scope" des cartes Kanban/Cartes.
- **`collaborator_id`** est auto-rempli avec l'id de l'utilisateur, **puis reste modifiable** par n'importe quel utilisateur actif. Libellé UI : **"Responsable mission"**.
- Une mission a un champ **`estimated_charge`** en heures (numeric, nullable), libellé UI **"Temps vendu"**, saisi manuellement à la création ou à l'édition.
- `kanban_status` (enum `a_faire | en_cours | terminee | archivee`, défaut `a_faire`) — l'ordre d'affichage UI correspond à l'ordre de déclaration de l'enum (même principe que pour l'opportunité).
- `kanban_order` (int) trace la position de la carte **au sein de sa colonne**, identique au comportement de `opportunity` (cf. `07_ux_composants_reutilisable.mdc` section 8).
- `archived_at` (timestamptz, posé automatiquement par trigger dès que `kanban_status = archivee`, remis à `NULL` sinon) : la colonne Kanban **"Archivée"** n'affiche que les missions dont `archived_at` date de **moins de 3 mois** — les archives plus anciennes restent consultables via les vues Cartes/Tableau avec filtre par statut.
- `completed_at` (timestamptz, posé automatiquement la première fois que `kanban_status = terminee`) : **conservé même si la mission est ensuite archivée**, pour distinguer une mission "terminée puis archivée" d'une mission "abandonnée" (archivée sans avoir jamais été terminée). Remis à `NULL` uniquement si la mission est rouverte (`a_faire`/`en_cours`). Utilisé par `/analyses` (onglet Missions) : "Missions complétées" = `completed_at IS NOT NULL` ; "Missions abandonnées" = `kanban_status = archivee AND completed_at IS NULL`.
- Une mission peut avoir plusieurs **catégories métier** (`mission_category` → `category_business`), **outils liés** (`mission_tool`), **wikis liés** (`mission_wiki`) et **documents liés** (`mission_document`).
- `start_at` (défaut = date du jour à la création) et `end_at` sont **obligatoires**.
    - **pas d'identifiants/mot de passe** (`tool_access` n'a pas de colonne `mission_id`).
- Champ de texte libre : **`notes`**, couplé à `notes_updated_at`, historisé dans `audit_log`.
- Création et édition via **drawer latéral droit** (sans URL) accessible depuis : `/missions`, en **deux temps**:
    - un premier bloc identification (Titre, Responsable mission, Interne, Client) sauvegardé via un bouton "Enregistrer" dédié — nécessaire pour permettre l'ajout de documents/outils/wikis liés qui requièrent un `mission_id` existant.
    - puis un bloc complémentaire sauvegardé via le footer "Annuler"/"Créer".

---

## Opportunity — cycle commercial

- Le terme métier UI est **opportunité** (route `/opportunities`).
- `client_id` et `collaborator_id` sont **obligatoires** ; seul `contact_client_id` reste **nullable** (une opportunité a toujours un client, mais pas nécessairement de contact identifié dès sa création).
- Le champ `collaborator_id` est affiché en UI sous le libellé **"Responsable opportunité"**.
- **Champs obligatoires à la création** : `opportunity_name`, `client_id`, `collaborator_id`, et **au moins un** des deux champs `due_date_at` (« Echéance ») / `end_at` (« Date de clôture ») — contrainte `opportunity_due_or_end_required`. Seuls `contact_client_id` et `price` restent nullables.
- `kanban_status` (enum) : **`suspect | prospect | besoin_specifie | proposition_envoyee | gagne | perdue`** — cet ordre de déclaration en base correspond exactement à l'**ordre d'affichage UI** (colonnes Kanban, filtres, listes déroulantes). `gagne` = opportunité gagnée (contrat signé, missions à créer) ; `perdue` = opportunité non gagnée et archivée.
    - **Valeur initiale à la création**, déterminée automatiquement selon l'historique du client (trigger `set_opportunity_kanban_defaults`, cf. `04_database_schema.mdc`) : si le client a déjà au moins une mission ou une opportunité existante → `besoin_specifie` ; sinon (nouveau client) → `suspect`.
- `kanban_order` (int) trace la position de la carte **au sein de sa colonne**, mise à jour à chaque réorganisation par glisser-déposer (déplacement dans la même colonne ou vers une autre) — cf. `07_ux_composants_reutilisable.mdc` section 8.
- `priority` (enum, libellé UI **"Urgence"**) : `faible | normal | urgente | prioritaire`.
- **Mapping automatique `kanban_status` → `probability_confirmation`** (trigger `set_opportunity_kanban_defaults`) :

|`kanban_status`|Probabilité mappée|
|---|---|
|`suspect`|10|
|`prospect`|30|
|`besoin_specifie`|50|
|`proposition_envoyee`|75|
|`gagne`|100|
|`perdue`|0|

```
- À la création, `probability_confirmation` est initialisée à la valeur mappée du statut initial.
- À chaque changement de `kanban_status` (y compris par glisser-déposer dans le Kanban), `probability_confirmation` est réévaluée : elle est **relevée** à la valeur mappée du nouveau statut si la valeur actuelle lui est **inférieure**, mais **jamais abaissée** si elle lui est déjà **supérieure** (une personnalisation manuelle à la hausse est donc préservée, une valeur restée basse est rattrapée).
- `probability_confirmation` reste par ailleurs modifiable manuellement à tout moment (dans les limites 0–100), indépendamment de tout changement de statut.
```

- **`opportunity.average_price`** (« Montant pondéré ») est une **colonne calculée** (`price × probability_confirmation / 100`), recalculée automatiquement par PostgreSQL à chaque modification de `price` ou `probability_confirmation` — **jamais saisie manuellement** (à la différence d'`estimated_charge` sur `mission`, qui reste lui manuel).
- **`opportunity.is_active`** : passe automatiquement à `false` dès que `kanban_status` atteint un des deux statuts terminaux, **`gagne`** ou **`perdue`** (les deux archivent l'opportunité, qu'elle soit gagnée ou perdue). Elle repasse à `true` si le statut est ensuite modifié pour sortir de ces deux valeurs (déplacement arrière dans le Kanban) — comportement symétrique confirmé.
- `action` et `source` sont des champs texte libre (pas d'enum).
- Une opportunité peut avoir plusieurs **catégories métier** (`opportunity_category` → `category_business`), **documents liés** (`opportunity_document`) et **outils liés** (`opportunity_tool`).
- `entry_average_price` : montant pondéré figé à la création. `closed_at` : date (Europe/Paris) du passage à `gagne`/`perdue` ; si `end_at` est vide à ce moment, il est rempli avec `closed_at`.
- Champ de texte libre : **`notes`**, couplé à `notes_updated_at`, historisé dans `audit_log`.
- Création et édition via **drawer latéral droit** (sans URL) accessible depuis `/opportunities` :
    1. **Bloc identification** : Titre, Client, Contact, Responsable opportunité, Date de dernière rencontre, Echéance, Date de clôture (au moins Echéance ou Date de clôture obligatoire) — sauvegardé via un bouton "Enregistrer" dédié, qui crée l'opportunité en base (nécessaire pour permettre l'ajout de documents liés qui requièrent un `opportunity_id` existant).
    2. **Bloc complémentaire** : Catégories, Montant, Montant pondéré (lecture seule, calculé), Probabilité, Priorité, Statut, Action, Source, Notes, Documents — sauvegardé via le footer "Annuler"/"Créer".

---

## Outil (`tool`) — catalogue et accès

- Le catalogue d'outils (`tool`) est partagé par toute l'entreprise : `tool_name`, `url`, `description`, catégories utilitaires (`tool_category` → `category`).
- **Client(s) lié(s)** (`client_tool`) : simple table de jonction, affichée sur `/tools/[id]` uniquement si au moins un client est lié à l'outil (champ masqué sinon).
- **Accès** (`tool_access`) : un outil peut avoir plusieurs accès, chacun optionnellement rattaché à un client (`client_id`, nullable). Champs : `label`, `identifier`, mot de passe **jamais stocké en clair** (Vault, cf. `05_security_rls.mdc`). Le toggle UI **"Privé"** pilote `is_private` (Oui = privé, réservé Manager/Direction ; Non = visible de tous, valeur par défaut) — matérialisé par une icône dédiée sur chaque carte "Accès" de `/tools/[id]`. Ce toggle est distinct du toggle **"Interne"** de `mission` (qui pilote `mission_scope`) — nommage volontairement différencié pour éviter toute confusion entre les deux concepts.
    - Le bloc "Premier accès (optionnel)" du tiroir Outil (création/édition) ne permet de créer **qu'un seul accès**, au moment de la création de l'outil. Les accès suivants s'ajoutent depuis `/tools/[id]` via un bouton "+ Accès" dédié, qui ouvre le même formulaire (création), indépendamment du tiroir Outil.
- **Abonnement** (`tool_subscription` + `tool_subscription_price`) : un outil peut avoir un ou plusieurs abonnements. Chaque abonnement a un `title`, un plan (`subscription_plan` : `mensuel` | `annuel`, piloté par le toggle UI "Facturation mensuel" Oui/Non) et un historique de prix (`tool_subscription_price` : montant, devise, `valid_from`/`valid_to`). **Une seule ligne de prix active** (`valid_to IS NULL`) par abonnement et par devise, garantie par un index unique partiel (`uq_tool_subscription_price_active`, même pattern que `contact_client.is_main`, cf. `08_database_rules.mdc`).
- **Liens simples** (sans identifiants ni abonnement) vers un client/une mission/une opportunité : `client_tool`, `mission_tool`, `opportunity_tool` — simples tables de jonction, distinctes de `tool_access`.
- **Suppression** : contrairement à `client`/`mission`/`opportunity` (jamais supprimables) et à `contact_client` (suppression via mode gestion), un outil est supprimable **directement depuis sa carte/ligne** dans `/tools`, via une icône dédiée qui ouvre la modale de confirmation générique (cf. `07_ux_composants_reutilisable.mdc` section 10) — pas besoin d'ouvrir une édition au préalable.
- Création et édition via **drawer latéral droit** (sans URL) accessible depuis `/tools`, en **deux temps** :
    - bloc identification (Titre, URL, Catégories, Description) sauvegardé via "Enregistrer" — nécessaire pour permettre l'ajout du premier accès et de l'abonnement, qui requièrent un `tool_id` existant,
    - puis bloc complémentaire optionnel (Premier accès, Abonnement) sauvegardé via le footer "Annuler"/"Créer".

---

## Documents

- Un document se rattache soit à une entité via une table de jonction (`mission_document`, `client_document`, `opportunity_document`), soit directement via une clé étrangère dédiée à un usage précis : `client.logo_id`, `collaborator.profile_picture_id`, `contact_client.profile_picture_id`.
- Les liens externes passent par `document` avec `storage_type = url`.
- Pas de vérification de cohérence croisée des liens documentaires en V1.

---

## Versionning documentaire

Quand un nouveau fichier est uploadé sur un document existant :

1. Une nouvelle entrée est créée avec `version_number = ancien + 1` et `parent_document_id` pointant vers la première version.
2. L'interface affiche par défaut la **dernière version** de chaque document, calculée **dynamiquement** (aucune colonne `is_latest` en base) : pour chaque famille de documents regroupée par `COALESCE(parent_document_id, id)`, c'est la ligne avec le `version_number` le plus élevé. Voir la vue `document_latest` dans `04_database_schema.mdc`.
3. Le filtre "Version" de `/documents` permet de faire remonter les versions antérieures, normalement masquées.

> `parent_document_id` est nul sur la première version, et pointe vers la v1 pour toutes les versions suivantes (jamais vers la version immédiatement précédente) — c'est pourquoi le regroupement par famille utilise `COALESCE(parent_document_id, id)` plutôt qu'un chaînage version par version.

---

## Notes

- Champ `notes` (texte simple) présent sur : `client`, `mission`, `team`, `contact_client`.
- Un seul champ par entité — la dernière saisie remplace la précédente.
- Chaque entité possède `notes_updated_at` pour horodater la dernière modification.
- Les notes sont toujours partagées — pas de note privée.
- **Toute modification de note sur ces 4 entités est historisée dans `audit_log`** (`entity_type = note`).

---

## Préférences collaborateur

- Stockées dans `setting` (une ligne par collaborateur).
- Créée automatiquement à la création du collaborateur avec les valeurs par défaut.
- `theme` : clair | sombre | systeme — appliqué globalement (`systeme` suit `prefers-color-scheme` de l'OS).
- `must_change_password` : si `true`, accès aux pages métier bloqué jusqu'au changement de mot de passe.

---

## Drawers empilés — règles d'UX

Principe général : **tout bouton d'ajout à côté d'un sélecteur** (dans un tiroir de création ou d'édition — icône générique ou spécialisée par entité, cf. `07_ux_composants_reutilisable.mdc` section 11.1 "Icônes fonctionnelles") ouvre un **second tiroir empilé** pour créer la sous-entité correspondante. À la validation de ce second tiroir, il se referme et l'entité tout juste créée est **automatiquement sélectionnée** dans le champ du tiroir inférieur (cf. règle 3 ci-dessous) — l'utilisateur n'a pas à la re-sélectionner manuellement dans la liste déroulante.

### Matrice des boutons d'ajout concernés

|Sélecteur avec bouton d'ajout|Présent dans les tiroirs de...|
|---|---|
|Client|Opportunité, Mission, Outil|
|Contact (`contact_client`)|Client ("Contact chez le client"), Opportunité|
|Catégorie|Client, Opportunité, Mission, Outil, Wiki, Team|
|Pôle (`team`)|Collaborateur (admin `/administration`)|
|Opportunité|Mission|
|Document|Client, Opportunité, Mission|
|Outil|Client, Opportunité, Mission|
|Wiki|Client, Mission|
|Type de document (`document_type`)|Document|

### Parcours d'empilement (exemple)

- Drawer de création de mission → "Ajouter un client" → drawer de création de client → "Ajout d'un contact" → drawer de création de contact_client

> Depuis un tiroir de consultation, on accède à l'entité via "Aller voir {l'entité}" — soit sa propre page `[id]` (où se trouve alors le bouton d'édition), soit sa page liste (cf. `07_ux_composants_reutilisable.mdc` section 7) — jamais en empilant directement un tiroir d'édition par-dessus le tiroir de consultation.

### Règles applicables à tous les empilages

1. **Persistance de l'état du drawer inférieur :** l'état non sauvegardé du drawer sous-jacent est conservé pendant toute la durée de l'empilage.
2. **Annulation du drawer supérieur :** fait disparaître le drawer supérieur et fait réapparaître le drawer inférieur exactement dans l'état où il était au moment de l'empilage.
3. **Validation du drawer supérieur :** la nouvelle entité créée est **injectée** dans le champ approprié du drawer inférieur (ex : le client créé est ajouté au champ client de la mission en cours de création, un outil ou une catégorie tout juste créés sont automatiquement cochés/sélectionnés dans leur multi-sélecteur respectif). L'utilisateur voit immédiatement le résultat sans perdre son travail.

Ces trois règles sont mutualisées via un composant de stack de drawers réutilisable (`DrawerStackProvider`).

---

## Historique automatique (`audit_log`)

Éléments historisés en V1 (correspond exactement à la liste `04_database_schema.mdc` — `audit_log.entity_type`) :

- Création / modification / suppression de : `category`, `team`, `collaborator`, `client`, `contact_client`, `opportunity`, `mission`, `mission_series`, `document_type`, `document`, `tool`, `tool_access`, `tool_subscription`, `tool_subscription_price`, `exchange_rate`, `wiki`, `setting`.
- Modification d'une **note** sur `client`, `mission`, `team` ou `contact_client` (`entity_type = note`) — historisée via un trigger dédié, distinct du trigger générique par table.

### Contrainte `audit_log.entity_type`

```sql
CHECK (entity_type = ANY (ARRAY[
  'category', 'category_business', 'team', 'collaborator', 'client', 'contact_client',
  'opportunity', 'mission', 'mission_series', 'document_type', 'document',
  'tool', 'tool_access', 'tool_subscription', 'tool_subscription_price',
  'exchange_rate', 'wiki', 'setting', 'note'
]::text[]))
```

> Libellé UI unique « Catégorie » pour `category` et `category_business`. `entity_id` peut pointer vers une entité supprimée → afficher "entité supprimée". L'historique est exclu de la recherche transverse.