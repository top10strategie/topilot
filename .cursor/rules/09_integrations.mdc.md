---
description: Intégrations externes et fonctionnalités transverses de TOPilot — recherche FTS, Storage. Auto-attaché aux fichiers concernés.
globs: '"lib/search*", "lib/storage*", "**/fts/**"'
alwaysApply:
---
# Intégrations & fonctionnalités transverses — TOPilot

---

## Recherche transverse (Supabase FTS — tsvector)

> L'historique (`audit_log`) est **exclu** de la recherche transverse. Les accès toolbox privés (`is_private = true`) sont **filtrés côté serveur** selon le rôle avant retour des résultats.

### Colonnes indexées par table

|Table|Colonnes indexées|
|---|---|
|`client`|`client_name`, `notes`|
|`contact_client`|`first_name`, `last_name`, `job_title`, `notes`|
|`collaborator`|`first_name`, `last_name`, `job_title`|
|`team`|`team_name`, `notes`|
|`opportunity`|`opportunity_name`, `notes`|
|`mission`|`mission_name`, `notes`|
|`tool`|`tool_name`, `description`|
|`tool_access`|`label`, `identifier` — accès `is_private = true` exclus pour le rôle Collaborateur|
|`document`|`document_name`|
|`wiki`|`title`, `content_text`, `tags`|

### Règles FTS

- Le FTS wiki s'appuie sur `content_text` — **jamais** sur `content_html`.
- Le filtrage des accès privés se fait **côté serveur** (server action ou RLS) — ne pas filtrer uniquement côté frontend.

---

## Supabase Storage

Utilisé pour :

- Photos de profil des collaborateurs (`collaborator.profile_picture_id`, FK vers `document`).
- Photos de profil des contacts client (`contact_client.profile_picture_id`, FK vers `document`).
- Logos client (`client.logo_id`, FK vers `document`).
- Fichiers uploadés via `document` (`storage_type = supabase`, `file_path`).

> Les liens externes (Google Drive, URLs tierces) passent par `document.url` avec `storage_type = url` — ils ne sont pas uploadés dans Supabase Storage.

> `document.is_visual` est renseigné explicitement par le code applicatif à la création (`true` uniquement pour les flux dédiés — upload de photo de profil, upload de logo client ; `false` implicite pour tout le reste). Pas de valeur par défaut dérivée d'un référentiel, pas de trigger : chaque appelant (`createDocument`, `createDocumentVersion`) sait dans quel contexte il se trouve et fixe la valeur en conséquence. **Convention à respecter côté code (pas garantie en base)** : aucune action de mise à jour de métadonnées (`updateDocument` et équivalents) ne doit jamais inclure `is_visual` dans son payload d'`UPDATE` — la création d'une nouvelle version passe par un nouvel `INSERT` (nouvelle ligne), jamais par une modification de `is_visual` sur une ligne existante. Il n'y a donc, en pratique, jamais besoin de modifier ce champ après sa création initiale.

---

## Tiptap (éditeur riche)

Utilisé pour :

- `wiki.content_html` + `wiki.content_text`

Règles :

- Version gratuite, headless.
- Extensions supportées : H1–H3, listes ordonnées et non ordonnées, gras, italique, liens, images.
- `content_html` : HTML généré par Tiptap — utilisé pour l'affichage.
- `content_text` : texte brut nettoyé (sans balises HTML) — utilisé exclusivement pour le FTS.
- Mise à jour des deux champs à chaque sauvegarde.
- Le suivi du dernier éditeur n'est **pas** requis — `wiki.updated_at` (horodatage seul) suffit.