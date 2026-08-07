---
description: Sécurité, authentification, RLS et gestion des accès sensibles pour Topilot. Auto-attaché aux routes API, server actions et fichiers lib.
globs: app/api/**, actions/**, lib/**, proxy.ts, **/supabase/**
alwaysApply: true
---
# Sécurité & RLS — TOPilot

---

## Principes fondamentaux

- **RLS activé sur toutes les tables Supabase** — aucune exception.
- Seuls les utilisateurs authentifiés reliés à un `collaborator` dont `status = actif` peuvent accéder à l'application.
- `SUPABASE_SERVICE_ROLE_KEY` est réservée aux **server actions** — jamais exposée côté client ou dans un composant.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` est publique mais toujours filtrée par RLS.

---

## Politiques RLS par rôle

### Principe général

Les politiques RLS s'appuient sur `collaborator.role` et `collaborator.status`, récupérés via la session Auth.

```sql
-- Exemple de politique de base : accès aux actifs uniquement
CREATE POLICY "actifs_seulement" ON collaborator
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM collaborator WHERE status = 'actif'
    )
  );
```

### Règles par entité — synthèse

|Entité|Lecture|Écriture (INSERT/UPDATE)|Suppression définitive (`DELETE`)|
|---|---|---|---|
|`client`, `mission`, `opportunity`|Tous les actifs|Tous les actifs|❌ Personne|
|`collaborator`|Tous les actifs|**INSERT réservé Manager/Direction** ; UPDATE : tous les actifs (champs sensibles `role`/`status` réservés Manager/Direction, cf. trigger dédié ci-dessous)|❌ Personne (anonymisation Manager/Direction uniquement)|
|`team`|Tous les actifs|Tous les actifs|Manager + Direction|
|`wiki`|Tous les actifs|Tous les actifs|Tous les actifs|
|`contact_client`, `tool`, `document`, `category`, `category_business` (non privé), `document_type`, `tool_subscription`, `tool_subscription_price`, `setting`|Tous les actifs|Tous les actifs|Tous les actifs|
|`category_business` (`is_private = true`)|Manager + Direction|Manager + Direction|Manager + Direction|
|`tool_access` (`is_private = false`)|Tous les actifs|Tous les actifs|Tous les actifs|
|`tool_access` (`is_private = true`)|Manager + Direction|Manager + Direction|Manager + Direction|
|`exchange_rate`|Tous les actifs|Service role uniquement|Tous les actifs|
|`audit_log`|Tous les actifs|Trigger uniquement|❌ Personne|

### Règles spécifiques aux contraintes de cohérence

`mission_scope_client_coherence` (sur `mission`) est une contrainte `CHECK` déclarative — elle ne dépend d'aucun champ `client.status` (qui n'existe pas dans ce schéma) et ne nécessite donc aucun trigger de synchronisation.

---

### Politique par défaut (SELECT / INSERT / UPDATE)

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_select_active" ON public.<table>
  FOR SELECT USING (public.is_active_collaborator());

CREATE POLICY "<table>_insert_active" ON public.<table>
  FOR INSERT WITH CHECK (public.is_active_collaborator());

CREATE POLICY "<table>_update_active" ON public.<table>
  FOR UPDATE USING (public.is_active_collaborator()) WITH CHECK (public.is_active_collaborator());
```

### Politique de suppression (`DELETE`) — matrice par table

La policy `DELETE` varie selon la table, contrairement à SELECT/INSERT/UPDATE qui suivent toujours la règle par défaut ci-dessus :

|Groupe de tables|Policy `DELETE`|
|---|---|
|`client`, `mission`, `opportunity`|**Aucune policy `DELETE`** — suppression impossible pour tous les rôles|
|`collaborator`|**Aucune policy `DELETE`** — offboarding via `anonymize_collaborator` uniquement, réservé Manager/Direction (contrôlé en server action, pas en RLS)|
|`team`|Manager/Direction uniquement|
|`tool_access` où `is_private = true`|Manager/Direction uniquement|
|`tool_access` où `is_private = false`, `tool`, `document`, `wiki`, `contact_client`, `category`, `document_type`, `tool_subscription`, `tool_subscription_price`, `exchange_rate`, `setting`|Tout collaborateur actif|
|`audit_log`|**Aucune policy `DELETE`**, pour aucun rôle|
|Tables de jonction (`mission_category`, `mission_tool`, `client_wiki`, etc.)|Tout collaborateur actif (suppression en cascade via la table parente, ou suppression directe du lien)|

```sql
-- Exemple : table ouverte à tous en DELETE (tool, document, wiki, contact_client, category,
-- document_type, tool_subscription, tool_subscription_price, exchange_rate, setting,
-- tool_access non privé, tables de jonction)
CREATE POLICY "<table>_delete_active" ON public.<table>
  FOR DELETE USING (public.is_active_collaborator());

-- Exemple : table réservée Manager/Direction en DELETE (team, tool_access privé)
CREATE POLICY "<table>_delete_manager_direction" ON public.<table>
  FOR DELETE USING (
    public.is_active_collaborator()
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );

-- client, mission, opportunity, collaborator, audit_log : aucune policy DELETE créée.
```

---

## Authentification & middleware

### Vérifications à la connexion

1. Session Supabase Auth valide.
2. `collaborator.auth_user_id` correspondant à l'utilisateur connecté.
3. `collaborator.status = actif` — si `inactif` ou `sorti` : accès refusé.
4. Si `setting.must_change_password = true` : bloquer l'accès aux pages métier et rediriger vers la page de changement de mot de passe.

### Middleware Next.js

Le middleware vérifie la session et le statut du collaborateur avant d'autoriser chaque requête vers les pages protégées. Si la session est expirée ou invalide, rediriger vers `/login`.

### `is_active_collaborator()` et `current_collaborator_role()` — RLS

```sql
CREATE OR REPLACE FUNCTION public.is_active_collaborator()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collaborator
    WHERE auth_user_id = auth.uid() AND status = 'actif'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_collaborator_role()
RETURNS public.collaborator_role_enum AS $$
  SELECT role FROM public.collaborator
  WHERE auth_user_id = auth.uid() AND status = 'actif';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## Supabase Vault — règles absolues

- Les mots de passe toolbox ne sont **jamais** stockés dans les tables standard.
- `tool_access.vault_secret_id` contient uniquement la **référence** (nom) du secret dans le Vault — jamais le mot de passe lui-même.
- La révélation d'un mot de passe doit **obligatoirement** passer par une **server action** serveur (ex. `readVaultSecret` dans `actions/vault.ts`) — jamais depuis le client seul.
- Cette action vérifie **systématiquement** :
    1. Session Supabase active et valide + collaborateur `actif` (`requireActiveCollaboratorAction`).
    2. **Lecture d'une ligne `tool_access` associée au secret** avec le client session (RLS) : un accès `is_private = true` n'est visible que pour les rôles `manager` et `direction` — aligné sur `can_read_tool_access_row` en base.
    3. Déchiffrement via service role **uniquement** après cette preuve d'accès.
- Si la session est expirée : **reconnexion obligatoire** avant révélation — pas de contournement.
- Côté client : afficher `••••••••` par défaut. Après succès de la server action, affichage ponctuel possible dans un **`Dialog`** (mot de passe uniquement en état local jusqu'à fermeture — pas de `localStorage`, pas de persistance URL).

---

## Gestion des accès toolbox privés

- `tool_access.is_private = true` → visible et accessible **uniquement par Manager et Direction** (`can_read_tool_access_row` / `can_manage_private_tool_access`), y compris pour la **suppression définitive**.
- Ces accès sont **exclus** :
    - Des résultats de recherche FTS pour le rôle Collaborateur.
    - De toutes les listes et vues pour le rôle Collaborateur.
    - Du filtre côté serveur — ne pas se fier au frontend seul.
- La privatisation d'un accès est historisée dans `audit_log` (action : `UPDATE`, entity_type `tool_access`).

## Catégories métier privées (`category_business.is_private`)

- SELECT/UPDATE/DELETE : Collaborateur = `is_private = false` ; Manager/Direction = tout. Bascule `is_private` réservée Manager/Direction (trigger).
- Entités `client`, `team`, `mission`, `opportunity` : Collaborateur exclu si ≥1 cat. métier privée **ou** cascade (enfant masqué si client/opportunité parente privée). Contacts et documents liés suivent la cascade.
- Helpers SQL : `has_private_business_category`, `can_access_*`, `team_name_for_display`.
- `search_global` applique les mêmes exclusions. `/analyses` : Manager/Direction uniquement.
- Pôle privé : pas de membre rôle Collaborateur ; ajout d’une cat. privée bloqué tant que des Collaborateurs sont membres.

> **Policy `UPDATE` alignée sur `SELECT`** : la policy `tool_access_update_active` applique le même filtre `is_private` que `tool_access_select` — sans cela, un Collaborateur ne pouvant pas _lire_ un accès privé pourrait néanmoins en modifier `label`/`identifier` par une requête `UPDATE` directe (écriture aveugle) s'il en connaît l'`id`. Seul le champ `is_private` lui-même reste protégé séparément par le trigger `enforce_tool_access_privacy_change` ci-dessous.

```sql
ALTER TABLE public.tool_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_access_select" ON public.tool_access
  FOR SELECT USING (
    public.is_active_collaborator()
    AND (is_private = false OR public.current_collaborator_role() IN ('manager', 'direction'))
  );

CREATE POLICY "tool_access_insert_active" ON public.tool_access
  FOR INSERT WITH CHECK (public.is_active_collaborator());

CREATE POLICY "tool_access_update_active" ON public.tool_access
  FOR UPDATE USING (
    public.is_active_collaborator()
    AND (is_private = false OR public.current_collaborator_role() IN ('manager', 'direction'))
  ) WITH CHECK (
    public.is_active_collaborator()
    AND (is_private = false OR public.current_collaborator_role() IN ('manager', 'direction'))
  );

CREATE POLICY "tool_access_delete_open" ON public.tool_access
  FOR DELETE USING (
    public.is_active_collaborator()
    AND is_private = false
  );

CREATE POLICY "tool_access_delete_private" ON public.tool_access
  FOR DELETE USING (
    public.is_active_collaborator()
    AND is_private = true
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );
```

La bascule `is_private` est protégée **également au niveau base** :

```sql
CREATE OR REPLACE FUNCTION public.enforce_tool_access_privacy_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_private IS DISTINCT FROM OLD.is_private
     AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
    RAISE EXCEPTION 'Seuls un Manager ou la Direction peuvent modifier la visibilité d''un accès outil.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_tool_access_privacy_change
BEFORE UPDATE ON public.tool_access
FOR EACH ROW EXECUTE FUNCTION public.enforce_tool_access_privacy_change();
```

---

## `collaborator` — création, champs sensibles et suppression

### Création (`INSERT`) réservée Manager/Direction

> Le trigger `enforce_collaborator_sensitive_fields` ci-dessous protège la **modification** du rôle/statut d'un collaborateur existant (`UPDATE`), mais ne couvre pas sa **création** (`INSERT`). Sans restriction dédiée à l'`INSERT`, la policy par défaut (ouverte à tout collaborateur actif) permettrait à un simple Collaborateur d'insérer directement une nouvelle ligne `collaborator` avec `role = 'direction'` — une élévation de privilège. La policy suivante remplace la policy `INSERT` par défaut pour cette table :

```sql
CREATE POLICY "collaborator_insert_manager_direction" ON public.collaborator
  FOR INSERT WITH CHECK (
    public.is_active_collaborator()
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );
```

> **Bootstrap** : cette policy ne s'applique qu'aux requêtes passant par les clés `anon`/`authenticated` (RLS). Le tout premier collaborateur (avant qu'aucun Manager/Direction n'existe en base) doit donc être créé directement depuis le Dashboard Supabase (rôle `postgres`/`service_role`, hors RLS) — aucune exception applicative n'est nécessaire dans la policy elle-même.

## `collaborator` — champs sensibles et suppression

```sql
CREATE OR REPLACE FUNCTION public.enforce_collaborator_sensitive_fields()
RETURNS trigger AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status)
     AND public.current_collaborator_role() NOT IN ('manager', 'direction') THEN
    RAISE EXCEPTION 'Seuls un Manager ou la Direction peuvent modifier le rôle ou le statut d''un collaborateur.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_enforce_collaborator_sensitive_fields
BEFORE UPDATE ON public.collaborator
FOR EACH ROW EXECUTE FUNCTION public.enforce_collaborator_sensitive_fields();
```

> Aucune policy `DELETE` n'existe sur `collaborator` : la table ne supporte jamais de vraie suppression SQL. L'offboarding appelle `anonymize_collaborator` via une server action réservée Manager/Direction (vérification du rôle en server action, avant l'appel — la fonction elle-même s'exécute en `SECURITY DEFINER`).

---

## `contact_client` — contact principal (`is_main`)

- Aucune policy RLS dédiée : `contact_client` reste soumis à la règle par défaut (SELECT/INSERT/UPDATE/DELETE ouverts à tout collaborateur actif, cf. matrice ci-dessus), y compris pour la lecture/écriture du champ `is_main`.
- L'unicité du contact principal par client et la promotion automatique à la suppression sont garanties **au niveau base** (index unique partiel + triggers `enforce_contact_client_main` / `promote_next_contact_client_main`, voir `04_database_schema.mdc`) — aucune vérification supplémentaire côté RLS n'est nécessaire, ces triggers s'exécutant avec les mêmes droits que la session appelante (pas de `SECURITY DEFINER` requis, la policy `UPDATE` par défaut couvre déjà la mise à jour croisée des autres lignes du même client).

---

## `team` — suppression

```sql
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_delete_manager_direction" ON public.team
  FOR DELETE USING (
    public.is_active_collaborator()
    AND public.current_collaborator_role() IN ('manager', 'direction')
  );
```

---

## Réinitialisation de mot de passe (`/reset-password`)

- Le flux (`resetPasswordForEmail`, `updateUser`) opère entièrement via le service **Auth de Supabase (GoTrue)**, sur le schéma `auth` — il ne touche **aucune table `public.*`** protégée par RLS. Aucune policy RLS n'est donc nécessaire pour ce flux.
- Sécurité déjà gérée nativement par Supabase, sans code applicatif supplémentaire :
    - Non-révélation de l'existence d'un compte (réponse identique que l'email existe ou non).
    - Expiration du token de réinitialisation (durée configurable dans le dashboard Supabase Auth).
    - Rate limiting sur les appels d'authentification (configurable dans le dashboard Supabase Auth).
- Rappel : un collaborateur `inactif`/`sorti` peut techniquement réinitialiser son mot de passe (le token reste valide au niveau Auth), mais reste ensuite bloqué à la connexion par le middleware (`collaborator.status = actif`, cf. section "Authentification & middleware" ci-dessus) — ce n'est pas une faille, juste une conséquence normale de la séparation Auth/statut métier.

## `must_change_password`

- **Ne jamais exposer** ce champ dans l'UI.
- Mis à jour **exclusivement** via server action avec `SUPABASE_SERVICE_ROLE_KEY`.
- Si `true` au moment du login : bloquer l'accès aux routes métier jusqu'au changement effectif.
- Après changement réussi : remettre à `false` via server action.

## Ré-authentification avant changement de mot de passe (`/settings`)

- Sur le changement **volontaire** depuis `/settings` uniquement (pas le parcours forcé `/auth/update-password` ni `/reset-password`).
- La server action `updateOwnPassword` exige le **mot de passe actuel** : preuve via `signInWithPassword({ email, password: currentPassword })` **avant** `updateUser({ password })`.
- En cas d'échec de preuve : erreur champ `currentPassword` (« Mot de passe actuel incorrect ») — pas de `updateUser`.
- Après succès : **session conservée** (pas de `signOut`) ; **ne pas** toucher `must_change_password`.

---

## `audit_log` — sécurité en écriture

- Table en écriture **uniquement** via triggers PostgreSQL (`audit_trigger_fn`, `audit_notes_trigger_fn`) — jamais depuis un composant client ou une route publique.
- Les fonctions de triggers `SECURITY DEFINER` doivent conserver `GRANT EXECUTE TO authenticated` : PostgreSQL vérifie ce droit pour le rôle qui déclenche le trigger. Ne pas les révoquer pour `authenticated` (sinon toute écriture métier échoue avec `permission denied for function …`).
- **Policies SELECT sur `mission` / `opportunity`** : ne pas appeler `can_access_mission(id)` / `can_access_opportunity(id)` (re-SELECT de la même table). Inliner le contrôle sur les colonnes de la ligne (`client_id`, etc.) — sinon `INSERT…RETURNING` échoue en 42501 pour les Collaborateurs. Les helpers `can_access_*` restent pour les tables de jonction.
- **Jamais** de suppression, pour aucun rôle — aucune policy `DELETE`.
- Les lectures sont autorisées selon RLS (lecture seule, compacte, sur le dashboard).

```sql
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_active" ON public.audit_log
  FOR SELECT USING (public.is_active_collaborator());
```

> Aucune policy `INSERT`/`UPDATE`/`DELETE` : seules les fonctions `audit_trigger_fn()` et `audit_notes_trigger_fn()` (en `SECURITY DEFINER`) peuvent y écrire.