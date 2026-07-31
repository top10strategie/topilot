---
description: Règles de références concernant la base de données de TOPilot
globs:
alwaysApply: true
---
> Toute création, modification ou migration de table doit se conformer strictement à ce document et à `04_database_schema.mdc`/`05_security_rls.mdc`. Si une divergence est nécessaire, elle doit être proposée et validée avant d'être appliquée.

---

## Conventions générales

- **Nommage** : `snake_case` partout. Toute colonne de clé étrangère se termine par `_id`.
- **Clés primaires** : `uuid DEFAULT gen_random_uuid()` sur toutes les tables métier. Tables de jonction (M2M) : clé primaire composite.
- **Horodatage** : `timestamptz` partout. `created_at NOT NULL DEFAULT now()` systématique ; `updated_at` maintenu par le trigger générique `set_updated_at()` (voir `04_database_schema.mdc`) sur les tables mutables.
- **Enums** : types `ENUM` Postgres nommés explicitement, valeurs en snake_case sans accents.
- **Suppression** : la majorité des tables métier supportent une **vraie suppression physique** (`DELETE`), sans restriction de rôle particulière au-delà de la règle par défaut. Trois exceptions :
    - `client`, `mission`, `opportunity` : **aucune suppression physique possible**, pour aucun rôle — uniquement archivage via `is_active`/`kanban_status`.
    - `collaborator` : **aucune suppression physique possible** — l'offboarding passe par anonymisation (`anonymize_collaborator`, voir §"collaborator" ci-dessous) réservée Manager/Direction.
    - `team` et `tool_access` (`is_private = true`) : suppression physique possible, mais réservée aux rôles Manager/Direction.
    - Voir `05_security_rls.mdc` pour la matrice complète des policies `DELETE` par table.
- **Index** : un index B-tree est créé sur chaque colonne de clé étrangère (bonne pratique Postgres — les FK ne sont pas indexées automatiquement, contrairement aux PK).
- **RLS** : activée sur toutes les tables. Règle par défaut : tout collaborateur **actif** authentifié peut lire et écrire (SELECT/INSERT/UPDATE), via la fonction `is_active_collaborator()`. Le `DELETE` suit la matrice de `05_security_rls.mdc` (pas la règle par défaut). Les exceptions (tool_access privé, champs sensibles de collaborator) sont documentées table par table dans `05_security_rls.mdc`.

---

## `exchange_rate`

Alimentée par un cron Vercel (1er de chaque mois) appelant l'API Frankfurter, avec complément à la demande si une nouvelle devise apparaît sur un abonnement (voir `04_database_schema.mdc`, section "Synchronisation applicative").

---

### Suppression d'un document

`document` autorise une **vraie suppression physique** (ligne + fichier Storage), sans restriction de rôle (n'importe quel collaborateur actif peut supprimer). Deux modes sont proposés à l'utilisateur au moment de la suppression :

1. **Supprimer cette version uniquement** — autorisé **seulement si c'est la version la plus récente** de sa lignée. Motif : si on autorisait la suppression d'une version antérieure (en particulier la racine) alors que des versions plus récentes existent, leur `parent_document_id` passerait à `NULL` (`ON DELETE SET NULL`) et la lignée serait cassée — ces versions se retrouveraient chacune comme un document racine isolé, sans lien entre elles. En restreignant aux versions les plus récentes, ce cas ne peut jamais se produire : la version juste avant redevient naturellement "la plus récente" par tri sur `version_number`, sans aucune mise à jour nécessaire.
2. **Supprimer toute la lignée** — retire toutes les versions du document (racine + toutes les versions dérivées) en une seule fois.

Les deux fonctions (`delete_document_version`, `delete_document_lineage`, voir `04_database_schema.mdc`) s'exécutent en `SECURITY INVOKER` (comportement par défaut) : elles respectent la RLS de la session appelante (policy `document_delete_active` — tout collaborateur actif, sans restriction de rôle) et déclenchent normalement le trigger d'audit générique pour chaque ligne réellement supprimée.

**Flux applicatif attendu** (la suppression Storage ne peut pas se faire depuis SQL) :

1. Le code appelle `delete_document_version` ou `delete_document_lineage` selon le choix de l'utilisateur.
2. La fonction retourne la liste des `file_path` des lignes supprimées (uniquement non `NULL`, donc uniquement pour `storage_type = 'supabase'` — les documents en `storage_type = 'url'` n'ont rien à supprimer côté Storage).
3. Le code supprime ensuite ces objets du bucket correspondant (`documents` ou `visuels`, selon `is_visual` — à récupérer avant l'appel RPC, puisque la ligne n'existe plus après).
4. Un échec de suppression Storage à cette étape ne doit pas être bloquant pour l'utilisateur (la ligne DB est déjà supprimée) — logguer l'anomalie pour nettoyage manuel ultérieur (fichier orphelin).

> Les FK existantes gèrent le reste automatiquement : les liens dans les tables de jonction (`mission_document`, `client_document`...) disparaissent en cascade (`ON DELETE CASCADE`) ; si le document supprimé était une photo de profil ou un logo, `collaborator.profile_picture_id` / `client.logo_id` / `contact_client.profile_picture_id` repassent simplement à `NULL` (`ON DELETE SET NULL`) sans erreur.

### `collaborator`

> Le flux d'offboarding doit anonymiser la ligne `collaborator` via `anonymize_collaborator` avant toute action sur le compte Auth. Réservé aux rôles Manager/Direction (vérifié en server action). Aucune policy `DELETE` n'existe sur cette table.

### `tool_access`

- `vault_secret_id` est **`text`**, pas `uuid`. Le secret est référencé par un **nom** généré côté application (`tool_access_<tool_id>_<label-slug>_<suffixe_aléatoire>`), via des RPC dédiées (`insert_secret`, `read_secret`, `delete_secret` sur le schéma `vault`), et non par l'UUID technique de `vault.secrets`.
- `is_private = true` limite la visibilité en lecture, et la suppression définitive, à `direction`/`manager`.

### `contact_client`

- `is_main` (contact principal) suit le même pattern d'unicité conditionnelle que `tool_subscription_price` (voir `uq_tool_subscription_price_active`) : un index unique **partiel** (`WHERE is_main = true`) plutôt qu'une contrainte `UNIQUE` classique, puisque l'unicité ne s'applique qu'aux lignes où la condition est vraie.
- Contrairement à `tool_subscription_price`, l'enforcement ne se limite pas à l'index : deux triggers (`enforce_contact_client_main` en `BEFORE INSERT OR UPDATE`, `promote_next_contact_client_main` en `AFTER DELETE`) gèrent respectivement l'attribution automatique au premier contact et la promotion automatique à la suppression du principal (voir `04_database_schema.mdc`).

## Stockage des documents (Supabase Storage)

**Deux buckets** :

|Bucket|Contenu|Lecture|Écriture|
|---|---|---|---|
|`documents` (privé)|Tout document avec `document.is_visual = false` (contrats, factures, briefs, livrables, pièces jointes wiki...)|Jamais d'URL publique ; passe systématiquement par la route proxy (voir ci-dessous)|Service role uniquement, côté serveur|
|`visuels` (public en lecture)|Tout document avec `document.is_visual = true` (photos de profil, logos clients)|URL publique directe, pas de proxy|Service role uniquement, côté serveur|

Le bucket cible est déterminé **au moment de l'upload**, à partir de `document.is_visual` — renseigné directement par le code appelant, sans référentiel intermédiaire ni trigger.

- **`documents` (privé)** :
    - **Upload et suppression** d'objets exclusivement via le rôle _service role_, côté serveur (jamais depuis le navigateur).
    - **Lecture** : une route serveur dédiée (ex. `/api/documents/:id/file`) vérifie d'abord la session utilisateur puis que la ligne `document` correspondante est lisible par lui (RLS via le client de session, pas le service role), et ne génère l'URL signée Storage (`createSignedUrl`, expiration courte — 1h dans le code de référence) qu'après cette double vérification.
- **`visuels` (public en lecture)** :
    - **Upload et suppression** toujours via le rôle _service role_ côté serveur (identique à `documents`) — seule la lecture change.
    - **Lecture** : URL publique directe (`getPublicUrl`), sans passer par la route proxy ni générer d'URL signée à chaque affichage. Justifié par le fait que ces visuels ne sont pas plus sensibles que le reste de la base (déjà visibles de tout collaborateur actif via `document`/`client`/`collaborator`) mais sont affichés très fréquemment (en-têtes, listes, cartes) — éviter un aller-retour serveur + signature à chaque rendu réduit la latence perçue.
- **Chemin de stockage** : construit côté serveur dans les deux cas, jamais fourni tel quel par le client (voir convention retenue ci-dessous).

**Convention de nommage retenue** : `{document_id}/{nom_fichier_assaini}` (dans le bucket déterminé par `document.is_visual`) — **indépendante du `document_type_id` et de tout rattachement**. Conséquence directe : corriger le type d'un document, ou modifier ses liens (mission, client, opportunité...) après coup, **ne déplace jamais le fichier** — seule la métadonnée en base change.

Le tri/filtrage par type de document, client, mission, etc. se fait en base (colonnes `document_type_id` + tables de jonction), pas via l'arborescence du bucket — qui n'a donc aucune utilité de tri ; son seul rôle est de garantir un chemin unique et stable par fichier.

---

## Migration des données Top10CRM → TOPilot (outils, accès, abonnements, taux de change)

Contexte : ce point concerne la migration d'un **ancien système existant** (Top10CRM, hors TOPilot) vers ce nouveau projet Supabase (TOPilot). Les deux bases ne peuvent donc pas être jointes directement par `dblink`/`postgres_fdw` sans configuration réseau supplémentaire ; l'approche la plus simple et la plus fiable est un **export CSV depuis Top10CRM → import dans une zone de transit (`staging`) sur TOPilot → transformation SQL vers les tables finales**.

### Tables concernées et compatibilité

| Table Top10CRM                      | Table TOPilot              | Compatibilité                                                                                |
| ----------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `tool`                              | `tool`                     | Identique (`tool_name`, `url`, `description`)                                                |
| `tool_category` (référentiel dédié) | `category` (transverse)    | À fusionner par libellé (voir Étape 3)                                                       |
| `tool_category_tool` (jonction)     | `tool_category` (jonction) | À reconstruire via le mapping de libellés                                                    |
| `tool_access`                       | `tool_access`              | Quasi identique ; **`client_id` absent en Top10CRM** → `NULL` pour toutes les lignes migrées |
| `tool_subscription`                 | `tool_subscription`        | Identique (`title`, `subscription_plan`)                                                     |
| `tool_subscription_price`           | `tool_subscription_price`  | Renommage `subscription_id` → `tool_subscription_id`                                         |
| `exchange_rate`                     | `exchange_rate`            | Identique (vérifier juste le cast vers `numeric(18,8)`)                                      |

**Principe directeur : conserver les mêmes `id` (UUID)** lors de la migration (la base de TOPilot étant une base neuve, aucun risque de collision). Cela évite d'avoir à reconstruire une table de correspondance d'identifiants pour les FK (`tool_access.tool_id`, `tool_subscription.tool_id`, `tool_subscription_price.tool_subscription_id`).

### Étape 1 — Export CSV depuis Top10CRM

Depuis Top10CRM (Supabase Studio → SQL Editor, ou `psql` en ligne de commande avec la connection string du projet Top10CRM) :

```sql
\copy (SELECT id, tool_name, url, description, created_at, updated_at FROM tool) TO 'tool.csv' WITH CSV HEADER;
\copy (SELECT id, label, is_active, created_at FROM tool_category) TO 'tool_category.csv' WITH CSV HEADER;
\copy (SELECT tool_id, tool_category_id, created_at FROM tool_category_tool) TO 'tool_category_tool.csv' WITH CSV HEADER;
\copy (SELECT id, tool_id, label, identifier, vault_secret_id, is_private, created_at, updated_at FROM tool_access) TO 'tool_access.csv' WITH CSV HEADER;
\copy (SELECT id, tool_id, title, subscription_plan, created_at, updated_at FROM tool_subscription) TO 'tool_subscription.csv' WITH CSV HEADER;
\copy (SELECT id, subscription_id, currency, amount, valid_from, valid_to, created_at FROM tool_subscription_price) TO 'tool_subscription_price.csv' WITH CSV HEADER;
\copy (SELECT id, currency, rate, date FROM exchange_rate) TO 'exchange_rate.csv' WITH CSV HEADER;
```

> Adaptez les noms de colonnes exacts si Top10CRM diverge légèrement du code fourni (vérifiez d'abord avec `\d tool_access`, etc.).

### Étape 2 — Import dans une zone de transit sur TOPilot

Une fois le schéma TOPilot créé (voir `04_database_schema.mdc`), sur TOPilot :

```sql
CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE staging.tool (LIKE public.tool INCLUDING ALL);
CREATE TABLE staging.tool_category (id uuid PRIMARY KEY, label text, is_active boolean, created_at timestamptz);
CREATE TABLE staging.tool_category_tool (tool_id uuid, tool_category_id uuid, created_at timestamptz);
CREATE TABLE staging.tool_access (LIKE public.tool_access INCLUDING ALL);
ALTER TABLE staging.tool_access DROP COLUMN IF EXISTS client_id; -- absent en V1
CREATE TABLE staging.tool_subscription (LIKE public.tool_subscription INCLUDING ALL);
CREATE TABLE staging.tool_subscription_price (
  id uuid, subscription_id uuid, currency text, amount integer,
  valid_from date, valid_to date, created_at timestamptz
);
CREATE TABLE staging.exchange_rate (LIKE public.exchange_rate INCLUDING ALL);
```

```sql
\copy staging.tool FROM 'tool.csv' WITH CSV HEADER;
\copy staging.tool_category FROM 'tool_category.csv' WITH CSV HEADER;
\copy staging.tool_category_tool FROM 'tool_category_tool.csv' WITH CSV HEADER;
\copy staging.tool_access FROM 'tool_access.csv' WITH CSV HEADER;
\copy staging.tool_subscription FROM 'tool_subscription.csv' WITH CSV HEADER;
\copy staging.tool_subscription_price FROM 'tool_subscription_price.csv' WITH CSV HEADER;
\copy staging.exchange_rate FROM 'exchange_rate.csv' WITH CSV HEADER;
```

### Étape 3 — Transformation vers les tables finales

**Respecter l'ordre** (dépendances FK) : `tool` → `category` → `tool_category` (jonction) → `tool_access` → `tool_subscription` → `tool_subscription_price` → `exchange_rate`.

```sql
-- 1. tool (id conservés)
INSERT INTO public.tool (id, tool_name, url, description, created_at, updated_at)
SELECT id, tool_name, url, description, created_at, updated_at FROM staging.tool;

-- 2. Fusion des anciens libellés tool_category dans category (transverse), sans doublon
INSERT INTO public.category (label)
SELECT DISTINCT label FROM staging.tool_category
ON CONFLICT (label) DO NOTHING;

-- 3. Reconstruction de la jonction tool ↔ category à partir du mapping par libellé
INSERT INTO public.tool_category (tool_id, category_id, created_at)
SELECT tct.tool_id, c.id, tct.created_at
FROM staging.tool_category_tool tct
JOIN staging.tool_category otc ON otc.id = tct.tool_category_id
JOIN public.category c ON c.label = otc.label
ON CONFLICT DO NOTHING;

-- 4. tool_access (client_id = NULL, absent en V1)
INSERT INTO public.tool_access (id, tool_id, client_id, label, identifier, vault_secret_id, is_private, created_at, updated_at)
SELECT id, tool_id, NULL, label, identifier, vault_secret_id, is_private, created_at, updated_at
FROM staging.tool_access;

-- 5. tool_subscription
INSERT INTO public.tool_subscription (id, tool_id, title, subscription_plan, created_at, updated_at)
SELECT id, tool_id, title, subscription_plan, created_at, updated_at FROM staging.tool_subscription;

-- 6. tool_subscription_price (renommage subscription_id -> tool_subscription_id)
INSERT INTO public.tool_subscription_price (id, tool_subscription_id, currency, amount, valid_from, valid_to, created_at)
SELECT id, subscription_id, currency, amount, valid_from, valid_to, created_at FROM staging.tool_subscription_price;

-- 7. exchange_rate
INSERT INTO public.exchange_rate (id, currency, rate, date)
SELECT id, currency, rate, date FROM staging.exchange_rate;
```

### Étape 4 — Vérification puis nettoyage

```sql
SELECT
  (SELECT count(*) FROM staging.tool) AS staging_tool, (SELECT count(*) FROM public.tool) AS final_tool,
  (SELECT count(*) FROM staging.tool_access) AS staging_access, (SELECT count(*) FROM public.tool_access) AS final_access,
  (SELECT count(*) FROM staging.tool_subscription) AS staging_sub, (SELECT count(*) FROM public.tool_subscription) AS final_sub,
  (SELECT count(*) FROM staging.tool_subscription_price) AS staging_price, (SELECT count(*) FROM public.tool_subscription_price) AS final_price,
  (SELECT count(*) FROM staging.exchange_rate) AS staging_rate, (SELECT count(*) FROM public.exchange_rate) AS final_rate;
```

Si les comptes correspondent de part et d'autre : `DROP SCHEMA staging CASCADE;`.

> **Point d'attention particulière** : les secrets Vault eux-mêmes (mots de passe déchiffrés) ne se migrent **pas** par cette méthode — Vault est propre à chaque projet Supabase. La migration one-shot des secrets a été réalisée hors dépôt (script retiré après exécution réussie).