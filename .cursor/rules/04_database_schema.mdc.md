---
description: Schéma complet de la base de données Topilot — tables, champs, contraintes et triggers. Spécification à exécuter via le MCP Supabase pour construire la base.
globs: supabase/migrations/**, **/*.sql
alwaysApply: true
---
# Schéma de base de données — TOPilot

> RLS activé sur toutes les tables. Voir `05_security_rls.mdc` pour les politiques. Tous les enums sont en snake_case sans accents. Les libellés lisibles sont gérés en UI. Suppression : `client`, `mission`, `opportunity` ne sont jamais supprimables (soft delete uniquement via `is_active`/`kanban_status`). `collaborator` n'a jamais de vraie suppression SQL (anonymisation + `status = sorti`). Toutes les autres tables listées ici supportent un vrai `DELETE` — voir `05_security_rls.mdc` pour le détail des rôles autorisés.

---

## Extension requise

```sql
-- gen_random_uuid() dépend de pgcrypto (activée par défaut sur les projets Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## `category` (utilitaire — outils, wikis)

```sql
CREATE TABLE public.category (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

## `category_business` (métier — pôles, clients, missions, opportunités)

```sql
CREATE TABLE public.category_business (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,
  is_private  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

> `is_private = true` : invisible au rôle Collaborateur ; les entités liées (et enfants en cascade client → opportunité/mission/contacts/documents) sont masquées via RLS. Seuls Manager/Direction peuvent poser/modifier `is_private`. Un Collaborateur ne peut pas être membre d’un pôle ayant une catégorie privée.

## `document_type`

```sql
CREATE TABLE public.document_type (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

## `team`

```sql
CREATE TABLE public.team (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name          text NOT NULL UNIQUE,
  notes              text,
  notes_updated_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz
);
```

### `tool`

```sql
CREATE TABLE public.tool (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name    text NOT NULL,
  url          text NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz
);
```

### `exchange_rate`

```sql
CREATE TABLE public.exchange_rate (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency   text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  rate       numeric(18, 8) NOT NULL CHECK (rate > 0),
  date       timestamptz NOT NULL
);

CREATE UNIQUE INDEX uq_exchange_rate_currency_date ON public.exchange_rate (currency, date);
CREATE INDEX idx_exchange_rate_currency ON public.exchange_rate (currency);
CREATE INDEX idx_exchange_rate_date ON public.exchange_rate (date);
```

Taux de change **mensuels** pour la conversion des abonnements outils vers l'euro (vue Abonnements sur `/toolbox`). Source : API [Frankfurter](https://www.frankfurter.app/) (sans clé).

### RLS et écriture

- **SELECT** : collaborateurs actifs (`exchange_rate_select_active` → `is_active_collaborator()`).
- **INSERT / UPDATE / UPSERT** : **service role uniquement** (server actions, cron Vercel `/api/cron/exchange-rates`) — pas de politique d'écriture côté client session.
- **DELETE** : ouvert à tout collaborateur actif (voir `05_security_rls.mdc`).

### Synchronisation applicative

- **EUR** : taux implicite `1` — aucune ligne en base.
- **Backfill** : à la première apparition d'une devise non EUR dans `tool_subscription_price`, remplissage async (janv. 2024 → mois courant) via `scheduleExchangeRateSyncIfNewCurrency`.
- **Cron** : le 1er de chaque mois (`vercel.json`), mise à jour du taux du mois courant pour toutes les devises utilisées.
- **Résolution** : pour un mois donné, taux du 1er du mois ; à défaut, dernière date antérieure disponible (`resolveRateFromLookup`).

### `wiki`

```sql
CREATE TABLE public.wiki (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  content_html  text NOT NULL,
  content_text  text NOT NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
);
```

## `document`

```sql
CREATE TABLE public.document (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name       text NOT NULL,
  document_type_id    uuid NOT NULL REFERENCES public.document_type(id) ON DELETE RESTRICT,
  storage_type        public.document_storage_type_enum NOT NULL,
  file_path           text,
  url                 text,
  is_visual boolean NOT NULL DEFAULT false,
  version_number      integer NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  parent_document_id  uuid REFERENCES public.document(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz,
  CONSTRAINT document_storage_coherence CHECK (
    (storage_type = 'supabase' AND file_path IS NOT NULL AND url IS NULL) OR
    (storage_type = 'url' AND url IS NOT NULL AND file_path IS NULL)
  )
);

CREATE INDEX idx_document_document_type_id ON public.document(document_type_id);
CREATE INDEX idx_document_parent_document_id ON public.document(parent_document_id);
```

> **La dernière version** de chaque document est **calculée dynamiquement** via la vue `document_latest` ci-dessous, qui regroupe par famille (`COALESCE(parent_document_id, id)`) et ne garde que le `version_number` maximum — même logique que `delete_document_version` ci-dessous.

```sql
CREATE VIEW public.document_latest
WITH (security_invoker = true) AS
SELECT DISTINCT ON (COALESCE(parent_document_id, id)) *
FROM public.document
ORDER BY COALESCE(parent_document_id, id), version_number DESC;
```

```sql
-- Mode 1 : supprime uniquement la version la plus récente d'une lignée.
CREATE OR REPLACE FUNCTION public.delete_document_version(p_document_id uuid)
RETURNS TABLE(file_path text) AS $$
DECLARE
  v_root_id uuid;
  v_this_version integer;
  v_max_version integer;
BEGIN
  SELECT COALESCE(parent_document_id, id), version_number
  INTO v_root_id, v_this_version
  FROM public.document
  WHERE id = p_document_id;

  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Document introuvable.';
  END IF;

  SELECT max(version_number) INTO v_max_version
  FROM public.document
  WHERE id = v_root_id OR parent_document_id = v_root_id;

  IF v_this_version <> v_max_version THEN
    RAISE EXCEPTION 'Seule la version la plus récente peut être supprimée individuellement. Utilisez la suppression de la lignée entière pour retirer une version antérieure.';
  END IF;

  RETURN QUERY
  DELETE FROM public.document
  WHERE id = p_document_id
  RETURNING document.file_path;
END;
$$ LANGUAGE plpgsql;

-- Mode 2 : supprime toute la lignée (racine + toutes ses versions).
CREATE OR REPLACE FUNCTION public.delete_document_lineage(p_document_id uuid)
RETURNS TABLE(file_path text) AS $$
DECLARE
  v_root_id uuid;
BEGIN
  SELECT COALESCE(parent_document_id, id) INTO v_root_id
  FROM public.document
  WHERE id = p_document_id;

  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Document introuvable.';
  END IF;

  RETURN QUERY
  DELETE FROM public.document
  WHERE id = v_root_id OR parent_document_id = v_root_id
  RETURNING document.file_path;
END;
$$ LANGUAGE plpgsql;
```

## `collaborator`

```sql
CREATE TABLE public.collaborator (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  email               text NOT NULL UNIQUE,
  role                public.collaborator_role_enum NOT NULL,
  status              public.collaborator_status_enum NOT NULL DEFAULT 'actif',
  team_id             uuid NOT NULL REFERENCES public.team(id) ON DELETE RESTRICT,
  job_title           text NOT NULL,
  profile_picture_id  uuid REFERENCES public.document(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE INDEX idx_collaborator_team_id ON public.collaborator(team_id);
CREATE INDEX idx_collaborator_profile_picture_id ON public.collaborator(profile_picture_id);
```

> Un `collaborator` avec `role IN ('manager', 'direction')` est manager de **sa propre équipe** (`team_id`) ; la règle est appliquée en RLS/logique applicative. **`collaborator` n'est jamais supprimé physiquement** (aucune policy `DELETE`, voir `05_security_rls.mdc`). L'offboarding (réservé Manager/Direction) passe exclusivement par `anonymize_collaborator` ci-dessous.

```sql
CREATE OR REPLACE FUNCTION public.anonymize_collaborator(p_id uuid)
RETURNS void AS $$
  UPDATE public.collaborator
  SET first_name = 'Anonyme', last_name = 'Anonyme',
      email = 'anonyme-' || p_id || '@deleted.local',
      status = 'sorti', profile_picture_id = NULL
  WHERE id = p_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.anonymize_contact_client(p_id uuid)
RETURNS void AS $$
  UPDATE public.contact_client
  SET first_name = 'Anonyme', last_name = 'Anonyme',
      phone_number = NULL, email_address = NULL, profile_picture_id = NULL
  WHERE id = p_id;
$$ LANGUAGE sql;
```

## `client`

```sql
CREATE TABLE public.client (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name           text NOT NULL,
  main_collaborator_id  uuid NOT NULL REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  website               text NOT NULL,
  address_street        text,
  address_city          text,
  address_zip           text,
  address_country       text NOT NULL DEFAULT 'France',
  drive_link            text,
  logo_id               uuid REFERENCES public.document(id) ON DELETE SET NULL,
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  notes_updated_at      timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz
);

CREATE INDEX idx_client_main_collaborator_id ON public.client(main_collaborator_id);
CREATE INDEX idx_client_logo_id ON public.client(logo_id);
```

> **`client` n'est jamais supprimé physiquement** — aucune policy `DELETE` (voir `05_security_rls.mdc`). Seul `is_active` reflète l'état du client.

## `contact_client`

```sql
CREATE TABLE public.contact_client (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  first_name         text NOT NULL,
  last_name          text NOT NULL,
  job_title          text,
  is_main            boolean NOT NULL DEFAULT false,
  notes              text,
  notes_updated_at   timestamptz,
  profile_picture_id uuid REFERENCES public.document(id) ON DELETE SET NULL,
  phone_number       text,
  email_address      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz
);

CREATE INDEX idx_contact_client_client_id ON public.contact_client(client_id);
CREATE INDEX idx_contact_client_profile_picture_id ON public.contact_client(profile_picture_id);

-- Un seul contact principal par client (filet de sécurité en base, en complément des triggers ci-dessous).
CREATE UNIQUE INDEX uq_contact_client_main_per_client
  ON public.contact_client (client_id)
  WHERE is_main = true;
```

> **Contact principal (`is_main`)** : le premier contact créé pour un client devient automatiquement principal, quelle que soit la valeur envoyée par le client (voir `enforce_contact_client_main` ci-dessous). Désigner un autre contact comme principal retire automatiquement ce statut à l'ancien. **Impossible de retirer le statut principal du seul contact principal existant** sans qu'un autre contact du même client ne le devienne au préalable (exception levée sinon — à répercuter côté UI par un toggle désactivé, cf. `ux_architecture.mdc`). Si le contact principal est supprimé, le contact restant le plus ancien (`created_at`) du même client est automatiquement promu (voir `promote_next_contact_client_main`).

```sql
CREATE OR REPLACE FUNCTION public.enforce_contact_client_main()
RETURNS trigger AS $$
BEGIN
  -- Premier contact du client : devient automatiquement principal, quelle que soit la valeur fournie.
  IF NOT EXISTS (
    SELECT 1 FROM public.contact_client
    WHERE client_id = NEW.client_id AND id <> NEW.id
  ) THEN
    NEW.is_main := true;
  END IF;

  -- Empêche de retirer le statut principal du seul contact principal existant sans qu'un autre ne le devienne.
  IF TG_OP = 'UPDATE' AND OLD.is_main = true AND NEW.is_main = false THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contact_client
      WHERE client_id = NEW.client_id AND id <> NEW.id AND is_main = true
    ) THEN
      RAISE EXCEPTION 'Un client doit toujours avoir un contact principal : désignez-en un autre avant de retirer celui-ci.';
    END IF;
  END IF;

  -- Si ce contact devient (ou reste) principal, désactiver le précédent principal du même client.
  IF NEW.is_main THEN
    UPDATE public.contact_client
    SET is_main = false
    WHERE client_id = NEW.client_id
      AND id <> NEW.id
      AND is_main = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_contact_client_main
BEFORE INSERT OR UPDATE ON public.contact_client
FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_client_main();

-- Promotion automatique du contact restant le plus ancien si le contact principal est supprimé.
CREATE OR REPLACE FUNCTION public.promote_next_contact_client_main()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_main THEN
    UPDATE public.contact_client
    SET is_main = true
    WHERE id = (
      SELECT id FROM public.contact_client
      WHERE client_id = OLD.client_id
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promote_next_contact_client_main
AFTER DELETE ON public.contact_client
FOR EACH ROW EXECUTE FUNCTION public.promote_next_contact_client_main();
```

## `opportunity`

```sql
CREATE TABLE public.opportunity (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_name          text NOT NULL,
  client_id                 uuid NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  contact_client_id         uuid REFERENCES public.contact_client(id) ON DELETE SET NULL,
  collaborator_id           uuid NOT NULL REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  price                     numeric,
  probability_confirmation  numeric NOT NULL DEFAULT 10
                              CHECK (probability_confirmation >= 0 AND probability_confirmation <= 100),
  average_price             numeric GENERATED ALWAYS AS (price * probability_confirmation / 100) STORED,
  kanban_status             public.opportunity_kanban_status_enum NOT NULL, -- 
  kanban_order              int,
  is_active                 boolean NOT NULL DEFAULT true,
  priority                  public.opportunity_priority_enum NOT NULL DEFAULT 'normal', -- libellé UI "Urgence"
  notes                     text,
  notes_updated_at          timestamptz,
  action                    text,
  source                    text,
  last_meeting_at           date,
  due_date_at               date,
  end_at                    date,
  entry_average_price       numeric, -- figé à la création (price × probability / 100)
  closed_at                 date,    -- date Paris du passage à gagne/perdue
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz,
  CONSTRAINT opportunity_due_or_end_required CHECK (due_date_at IS NOT NULL OR end_at IS NOT NULL),
  CONSTRAINT opportunity_closed_requires_end_at CHECK (
    kanban_status NOT IN ('gagne', 'perdue') OR end_at IS NOT NULL
  )
);

CREATE INDEX idx_opportunity_client_id ON public.opportunity(client_id);
CREATE INDEX idx_opportunity_contact_client_id ON public.opportunity(contact_client_id);
CREATE INDEX idx_opportunity_collaborator_id ON public.opportunity(collaborator_id);
```

> **`opportunity` n'est jamais supprimée physiquement** — aucune policy `DELETE` (voir `05_security_rls.mdc`).

### Automatismes `kanban_status` / `probability_confirmation` / `is_active`

Mapping fixe statut → probabilité par défaut :

|`kanban_status`|Probabilité mappée|
|---|---|
|`suspect`|10|
|`prospect`|30|
|`besoin_specifie`|50|
|`proposition_envoyee`|75|
|`gagne`|100|
|`perdue`|0|

```sql
CREATE OR REPLACE FUNCTION public.set_opportunity_kanban_defaults()
RETURNS trigger AS $$
DECLARE
  v_mapped_probability numeric;
BEGIN
  -- À la création : kanban_status par défaut selon l'historique du client
  -- (déjà des missions ou opportunités => besoin_specifie, sinon => suspect).
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM public.mission WHERE client_id = NEW.client_id
      UNION ALL
      SELECT 1 FROM public.opportunity WHERE client_id = NEW.client_id
    ) THEN
      NEW.kanban_status := 'besoin_specifie';
    ELSE
      NEW.kanban_status := 'suspect';
    END IF;
  END IF;

  -- À la création ou dès que le statut change : la probabilité ne peut que monter
  -- jusqu'à la valeur mappée du nouveau statut, jamais redescendre en dessous.
  IF TG_OP = 'INSERT' OR NEW.kanban_status IS DISTINCT FROM OLD.kanban_status THEN
    v_mapped_probability := CASE NEW.kanban_status
      WHEN 'suspect' THEN 10
      WHEN 'prospect' THEN 30
      WHEN 'besoin_specifie' THEN 50
      WHEN 'proposition_envoyee' THEN 75
      WHEN 'gagne' THEN 100
      WHEN 'perdue' THEN 0
    END;

    IF TG_OP = 'INSERT' OR NEW.probability_confirmation < v_mapped_probability THEN
      NEW.probability_confirmation := v_mapped_probability;
    END IF;
  END IF;

  -- Les 2 statuts terminaux archivent automatiquement l'opportunité ;
  -- en sortir (déplacement arrière dans le Kanban) la désarchive symétriquement.
  IF NEW.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := false;
  ELSIF TG_OP = 'UPDATE' AND OLD.kanban_status IN ('gagne', 'perdue') THEN
    NEW.is_active := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_opportunity_kanban_defaults
BEFORE INSERT OR UPDATE ON public.opportunity
FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_kanban_defaults();
```

> Comportement de `is_active` à la sortie d'un statut terminal (`ELSIF` ci-dessus) : symétrie confirmée — un retour en arrière dans le Kanban désarchive l'opportunité.

## `mission`

```sql
CREATE TABLE public.mission (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_name      text NOT NULL,
  mission_scope     public.mission_scope_enum NOT NULL,
  client_id         uuid REFERENCES public.client(id) ON DELETE RESTRICT,
  collaborator_id   uuid NOT NULL REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  opportunity_id    uuid REFERENCES public.opportunity(id) ON DELETE SET NULL,
  kanban_status     public.mission_kanban_status_enum NOT NULL DEFAULT 'a_faire',
  kanban_order      int,
  archived_at       timestamptz,
  completed_at      timestamptz,
  notes             text,
  notes_updated_at  timestamptz,
  estimated_charge  numeric CHECK (estimated_charge IS NULL OR estimated_charge >= 0),
  start_at          date NOT NULL DEFAULT CURRENT_DATE,
  end_at            date NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz,
  CONSTRAINT mission_scope_client_coherence CHECK (
    (mission_scope = 'client' AND client_id IS NOT NULL) OR
    (mission_scope = 'interne' AND client_id IS NULL)
  )
);

CREATE INDEX idx_mission_client_id ON public.mission(client_id);
CREATE INDEX idx_mission_collaborator_id ON public.mission(collaborator_id);
CREATE INDEX idx_mission_opportunity_id ON public.mission(opportunity_id);
```

> **`mission` n'est jamais supprimée physiquement** — aucune policy `DELETE` (voir `05_security_rls.mdc`). `mission_scope` est garanti cohérent avec `client_id` par la contrainte `mission_scope_client_coherence` (pas de trigger de synchronisation : `client.status` n'existe pas, seul `client.is_active` existe et n'a aucun impact sur `mission_scope`). `kanban_status` par défaut vaut `a_faire`, cohérent avec l'enum officiel (voir `03_business_rules.mdc`).

> **`kanban_order`** : trace la position de la carte au sein de sa colonne Kanban, mise à jour à chaque glisser-déposer — même comportement que sur `opportunity` (cf. section 8 de `07_ux_composants_reutilisable.mdc`).

> **`archived_at`** : horodatage de l'entrée en statut `archivee`, posé automatiquement par trigger (et remis à `NULL` si la mission ressort de ce statut). Sert à filtrer la colonne Kanban "Archivée" sur les 3 derniers mois uniquement (cf. `ux_architecture.mdc`) — les missions archivées plus anciennes restent accessibles via les vues Cartes/Tableau avec filtre.

> **`completed_at`** : horodatage posé la première fois que la mission atteint `terminee`, et **conservé même si la mission passe ensuite à `archivee`** (contrairement à `archived_at`, il n'est remis à `NULL` que si la mission est rouverte vers `a_faire`/`en_cours`). Permet de distinguer, pour les analyses (`/analyses` onglet Missions) :
> 
> - **Missions complétées** : `completed_at IS NOT NULL` (quel que soit le statut courant — inclut les missions terminées puis archivées ensuite).
> - **Missions abandonnées** : `kanban_status = 'archivee' AND completed_at IS NULL` (archivées sans être jamais passées par `terminee`).

```sql
CREATE OR REPLACE FUNCTION public.set_mission_archived_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.kanban_status = 'archivee' AND (TG_OP = 'INSERT' OR OLD.kanban_status IS DISTINCT FROM 'archivee') THEN
    NEW.archived_at := now();
  ELSIF NEW.kanban_status IS DISTINCT FROM 'archivee' THEN
    NEW.archived_at := NULL;
  END IF;

  IF NEW.kanban_status = 'terminee' AND (TG_OP = 'INSERT' OR OLD.kanban_status IS DISTINCT FROM 'terminee') THEN
    NEW.completed_at := now();
  ELSIF NEW.kanban_status IN ('a_faire', 'en_cours') THEN
    NEW.completed_at := NULL;
  END IF;
  -- Si NEW.kanban_status = 'archivee' : completed_at n'est pas touché ici, il conserve
  -- sa valeur précédente (NULL si jamais complétée, horodatage sinon).

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_mission_archived_at
BEFORE INSERT OR UPDATE ON public.mission
FOR EACH ROW EXECUTE FUNCTION public.set_mission_archived_at();
```

## `tool_access`

```sql
CREATE TABLE public.tool_access (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id           uuid NOT NULL REFERENCES public.tool(id) ON DELETE RESTRICT,
  client_id         uuid REFERENCES public.client(id) ON DELETE RESTRICT,
  label             text NOT NULL,
  identifier        text NOT NULL,
  vault_secret_id   text NOT NULL,
  is_private        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz
);

CREATE INDEX idx_tool_access_tool_id ON public.tool_access(tool_id);
CREATE INDEX idx_tool_access_client_id ON public.tool_access(client_id);
```

> **Règle applicative (non exprimable en `CHECK` SQL)** : le secret doit être créé dans Vault **avant** l'insertion de la ligne `tool_access` ; si l'insertion Vault échoue, aucune ligne `tool_access` n'est créée. À la suppression, l'ordre est inverse (secret Vault supprimé, puis ligne `tool_access`) — et la ligne n'est supprimée que si le `vault_secret_id` fourni correspond exactement à celui stocké (protection contre une suppression Vault sur une mauvaise ligne). Suppression ouverte à tout actif si `is_private = false` ; réservée Manager/Direction si `is_private = true` (voir `05_security_rls.mdc`).

### `tool_subscription`

```sql
CREATE TABLE public.tool_subscription (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id             uuid NOT NULL REFERENCES public.tool(id) ON DELETE RESTRICT,
  title               text NOT NULL,
  subscription_plan   public.tool_subscription_plan_enum NOT NULL DEFAULT 'mensuel',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE INDEX idx_tool_subscription_tool_id ON public.tool_subscription(tool_id);
```

## `tool_subscription_price`

```sql
CREATE TABLE public.tool_subscription_price (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_subscription_id   uuid NOT NULL REFERENCES public.tool_subscription(id) ON DELETE RESTRICT,
  currency               text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  amount                 integer NOT NULL CHECK (amount > 0),
  valid_from             date NOT NULL,
  valid_to               date CHECK (valid_to IS NULL OR valid_to > valid_from),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_subscription_price_subscription_id
  ON public.tool_subscription_price(tool_subscription_id);

-- Filet de sécurité en base, en complément du trigger de fermeture automatique :
-- une seule ligne "active" (valid_to IS NULL) par abonnement et par devise.
CREATE UNIQUE INDEX uq_tool_subscription_price_active
  ON public.tool_subscription_price (tool_subscription_id, currency)
  WHERE valid_to IS NULL;
```

```sql
CREATE OR REPLACE FUNCTION public.close_previous_subscription_price()
RETURNS trigger AS $$
BEGIN
  UPDATE public.tool_subscription_price
  SET valid_to = NEW.valid_from - INTERVAL '1 day'
  WHERE tool_subscription_id = NEW.tool_subscription_id
    AND currency = NEW.currency
    AND valid_to IS NULL
    AND id <> NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_close_previous_subscription_price
AFTER INSERT ON public.tool_subscription_price
FOR EACH ROW EXECUTE FUNCTION public.close_previous_subscription_price();
```

> La fermeture ne cible que la même **devise** (`currency = NEW.currency`), un abonnement peut avoir un tarif actif par devise en parallèle.

## `setting`

```sql
CREATE TABLE public.setting (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id                 uuid NOT NULL UNIQUE REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  theme                           public.theme_enum NOT NULL DEFAULT 'systeme',
  must_change_password            boolean NOT NULL DEFAULT true,
  home_widgets                    text[] NOT NULL DEFAULT '{}',
  preferred_mission_category_ids  uuid[] NOT NULL DEFAULT '{}', -- cats métier pour préfiltre /missions
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz
);

CREATE INDEX idx_setting_collaborator_id ON public.setting(collaborator_id);
```

> **Création automatique** : une ligne `setting` (valeurs par défaut) est créée automatiquement à chaque insertion dans `collaborator`, via le trigger `trg_create_default_setting` ci-dessous — cohérent avec `03_business_rules.mdc` ("Créée automatiquement à la création du collaborateur avec les valeurs par défaut"). Ce trigger s'exécute quel que soit le point d'entrée de l'INSERT (server action applicative ou insertion manuelle via le Dashboard Supabase, ex. lors du bootstrap du tout premier collaborateur, cf. `05_security_rls.mdc`).

```sql
CREATE OR REPLACE FUNCTION public.create_default_setting_for_collaborator()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.setting (collaborator_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_create_default_setting
AFTER INSERT ON public.collaborator
FOR EACH ROW EXECUTE FUNCTION public.create_default_setting_for_collaborator();
```

> Les valeurs par défaut (`theme = 'systeme'`, `must_change_password = true`) sont déjà posées par les `DEFAULT` de la colonne — l'`INSERT` ci-dessus n'a donc besoin de fournir que `collaborator_id`.

## `audit_log`

```sql
CREATE TABLE public.audit_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id  uuid REFERENCES public.collaborator(id) ON DELETE RESTRICT,
  entity_type      text NOT NULL CHECK (entity_type = ANY (ARRAY[
                      'category', 'team', 'collaborator', 'client', 'contact_client',
                      'opportunity', 'mission', 'mission_series', 'document_type', 'document',
                      'tool', 'tool_access', 'tool_subscription', 'tool_subscription_price',
                      'exchange_rate', 'wiki', 'setting', 'note'
                    ]::text[])),
  entity_id        uuid NOT NULL,
  action           public.audit_action_enum NOT NULL,
  label            text NOT NULL,
  old_value        jsonb,
  new_value        jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_collaborator_id ON public.audit_log(collaborator_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
```

> Aucune policy `DELETE`/`UPDATE` côté client sur `audit_log` — écriture uniquement via triggers `SECURITY DEFINER` (voir `05_security_rls.mdc`).

```sql
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger AS $$
DECLARE
  v_collaborator_id uuid;
  v_entity_id uuid;
BEGIN
  SELECT id INTO v_collaborator_id
  FROM public.collaborator
  WHERE auth_user_id = auth.uid();

  v_entity_id := COALESCE(NEW.id, OLD.id);

  INSERT INTO public.audit_log (collaborator_id, entity_type, entity_id, action, label, old_value, new_value)
  VALUES (
    v_collaborator_id,
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP::public.audit_action_enum,
    format('%s sur %s', TG_OP, TG_TABLE_NAME),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

> À appliquer (`AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW`) sur les 17 tables nommées dans le `CHECK` de `audit_log.entity_type`, à l'exception de la valeur `note` (voir fonction dédiée ci-dessous). Jamais sur `audit_log` elle-même (boucle infinie), ni sur les tables de jonction.

```sql
-- Historisation dédiée des notes : uniquement quand le champ `notes` change,
-- sur les 4 tables qui en disposent (client, mission, team, contact_client).
CREATE OR REPLACE FUNCTION public.audit_notes_trigger_fn()
RETURNS trigger AS $$
DECLARE
  v_collaborator_id uuid;
BEGIN
  IF NEW.notes IS NOT DISTINCT FROM OLD.notes THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_collaborator_id
  FROM public.collaborator
  WHERE auth_user_id = auth.uid();

  INSERT INTO public.audit_log (collaborator_id, entity_type, entity_id, action, label, old_value, new_value)
  VALUES (
    v_collaborator_id,
    'note',
    NEW.id,
    'UPDATE',
    format('Modification de note sur %s', TG_TABLE_NAME),
    to_jsonb(OLD.notes),
    to_jsonb(NEW.notes)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

> À appliquer (`AFTER UPDATE ... FOR EACH ROW`) sur `client`, `mission`, `team`, `contact_client` — en complément du trigger générique `audit_trigger_fn` déjà appliqué à `client`/`mission`/`team`/`contact_client` pour le reste de leurs colonnes.

### `mission_category`

```sql
CREATE TABLE public.mission_category (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category_business(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, category_id)
);
CREATE INDEX idx_mission_category_category_id ON public.mission_category(category_id);
```

### `mission_document`

```sql
CREATE TABLE public.mission_document (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.document(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, document_id)
);
CREATE INDEX idx_mission_document_document_id ON public.mission_document(document_id);
```

### `mission_tool`

```sql
CREATE TABLE public.mission_tool (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  tool_id  uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, tool_id)
);
CREATE INDEX idx_mission_tool_tool_id ON public.mission_tool(tool_id);
```

### `mission_wiki`

```sql
CREATE TABLE public.mission_wiki (
  mission_id   uuid NOT NULL REFERENCES public.mission(id) ON DELETE CASCADE,
  wiki_id  uuid NOT NULL REFERENCES public.wiki(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, wiki_id)
);
CREATE INDEX idx_mission_wiki_wiki_id ON public.mission_wiki(wiki_id);
```

### `opportunity_category`

```sql
CREATE TABLE public.opportunity_category (
  opportunity_id  uuid NOT NULL REFERENCES public.opportunity(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES public.category_business(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, category_id)
);
CREATE INDEX idx_opportunity_category_category_id ON public.opportunity_category(category_id);
```

### `opportunity_document`

```sql
CREATE TABLE public.opportunity_document (
  opportunity_id  uuid NOT NULL REFERENCES public.opportunity(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.document(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, document_id)
);
CREATE INDEX idx_opportunity_document_document_id ON public.opportunity_document(document_id);
```

### `opportunity_tool`

```sql
CREATE TABLE public.opportunity_tool (
  opportunity_id   uuid NOT NULL REFERENCES public.opportunity(id) ON DELETE CASCADE,
  tool_id  uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, tool_id)
);
CREATE INDEX idx_opportunity_tool_tool_id ON public.opportunity_tool(tool_id);
```

### `client_category`

```sql
CREATE TABLE public.client_category (
  client_id    uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category_business(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, category_id)
);
CREATE INDEX idx_client_category_category_id ON public.client_category(category_id);
```

### `client_document`

```sql
CREATE TABLE public.client_document (
  client_id    uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES public.document(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, document_id)
);
CREATE INDEX idx_client_document_document_id ON public.client_document(document_id);
```

### `client_tool`

```sql
CREATE TABLE public.client_tool (
  client_id   uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  tool_id  uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, tool_id)
);
CREATE INDEX idx_client_tool_tool_id ON public.client_tool(tool_id);
```

### `client_wiki`

```sql
CREATE TABLE public.client_wiki (
  client_id   uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  wiki_id  uuid NOT NULL REFERENCES public.wiki(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, wiki_id)
);
CREATE INDEX idx_client_wiki_wiki_id ON public.client_wiki(wiki_id);
```

### `tool_category`

```sql
CREATE TABLE public.tool_category (
  tool_id      uuid NOT NULL REFERENCES public.tool(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tool_id, category_id)
);
CREATE INDEX idx_tool_category_category_id ON public.tool_category(category_id);
```

### `wiki_category`

```sql
CREATE TABLE public.wiki_category (
  wiki_id      uuid NOT NULL REFERENCES public.wiki(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wiki_id, category_id)
);
CREATE INDEX idx_wiki_category_category_id ON public.wiki_category(category_id);
```

### `team_category`

```sql
CREATE TABLE public.team_category (
  team_id      uuid NOT NULL REFERENCES public.team(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.category_business(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, category_id)
);
CREATE INDEX idx_team_category_category_id ON public.team_category(category_id);
```

### `set_updated_at()` — générique

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

À appliquer (`BEFORE UPDATE ... FOR EACH ROW`) sur : `team, tool, collaborator, client, contact_client, opportunity, mission, document, tool_access, tool_subscription, wiki, setting`.