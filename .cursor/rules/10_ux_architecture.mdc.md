---
description: Structure et contenu des pages du CRM Topilot
globs:
alwaysApply: true
---
# Pages

## Arborescence des pages

```
/login                         → Connexion à un compte utilisateur
/reset-password                → Réinitialisation de mot de passe (demande + saisie du nouveau mot de passe)
/                              → Home
/top10                         → Page entreprise interne
/clients                       → Liste des clients
/clients/[id]                  → Fiche client
/opportunities                 → Liste globale des opportunités
/opportunities/[id]            → Fiche opportunité
/missions                      → Liste des missions
/missions/[id]                 → Fiche mission
/tools                         → Liste des outils
/tools/[id]                    → Fiche outil
/documents                     → Bibliothèque documentaire
/wikis                         → Liste des pages wikis
/analyses                      → Etudes et analyses (opportunités, missions, abonnements)
/administration                → Gestion des catégories, types et utilisateurs
/settings                      → Paramètres utilisateur + profil
```

### Page de connexion (`/login`)

**Structure** : reprend le block ShadCN `npx shadcn@latest add login-02` (mise en page 2 colonnes), avec deux différences par rapport au starter :

- Le panneau droit (habituellement une photo plein cadre en `object-cover`) est remplacé par le **logo Topilot centré** (pictogramme + wordmark "TOPilot"), sur fond uni — pas de photo, pas de filtre `dark:brightness`/`dark:grayscale`.
- La page ne propose **aucun autre moyen de connexion** (pas de Github, etc.) ni de **création de compte** (page non existante).

**Panneau gauche (formulaire)** :

- Titre : "Connexion à votre compte"
- Sous-titre : "Entrer vos identifiants pour vous connecter"
- Champ Email
- Champ Mot de passe, avec un lien **"Mot de passe oublié ?"** aligné à droite du label — renvoie vers `/reset-password`
- Bouton "Connexion" (pleine largeur)

### Page de réinitialisation de mot de passe (`/reset-password`)

Page unique gérant les **2 étapes** du flux Supabase Auth, différenciées par la présence ou non d'un **token en query param** (lien reçu par email) :

- **Étape 1 — Demande** (pas de token dans l'URL) :
    - Titre : "Mot de passe oublié"
    - Champ Email
    - Bouton "Envoyer le lien de réinitialisation" → appelle `resetPasswordForEmail` (Supabase Auth), envoie un email contenant un lien vers `/reset-password?token=...`
    - Confirmation : toast de succès (Sonner) indiquant qu'un email a été envoyé, quel que soit le résultat côté serveur (ne pas révéler si l'email existe ou non en base, pour ne pas exposer la liste des comptes).
- **Étape 2 — Nouveau mot de passe** (token présent dans l'URL) :
    - Titre : "Nouveau mot de passe"
    - Champ Nouveau mot de passe
    - Champ Confirmation du mot de passe
    - Bouton "Réinitialiser le mot de passe" → appelle `updateUser` (Supabase Auth) avec le nouveau mot de passe, puis redirige vers `/login`
    - Erreurs de validation (mots de passe différents, token invalide/expiré) : affichées inline, cf. section 7.1 de `07_ux_composants_reutilisable.mdc`.
- Même structure Hero/panneau que `/login` (logo Topilot centré à droite, formulaire à gauche) — pas de lien retour vers `/login` nécessaire à l'étape 2 (redirection automatique après succès).

### Page entreprise (`/top10`)

> Vocabulaire UI : l'entité `team` est toujours affichée sous le nom **"Pôle"** (onglet, cartes, tiroirs)

Structure Hero + Tabs :

**Hero** :

- Identification de l'entité : "Top 10 Stratégie"
- Groupe de boutons d'action : uniquement un champ de **recherche contextuelle**, scopé au contenu de `/top10` (pôles + collaborateurs) — distinct de la recherche globale transverse du Header (voir `07_ux_composants_reutilisable.mdc`, section 3.1). Pas d'icône de filtre, pas de switch de vue (Cartes/Tableau), pas d'icône de gestion sur cette page.

> Le Header (logo, recherche globale, thème, déconnexion) est un composant global présent sur toutes les pages — voir `07_ux_composants_reutilisable.mdc`, section 3. Il n'est pas redécrit ici.

**Contenu - Tabs** : "Pôles" | "Collaborateurs"

- **Pôles** :
    - Chaque Pôle a une section utilisant le composant `card` de ShadCN pour présenter tous les pôles. Ce composant aura en titre le nom du pôle et prendra une largeur d'1/4 de la largeur du contenu du tabs en desktop, 1/2 en tablette et toute la largeur en téléphone.
    - Chaque section ( `card` : carte de pôle) présente des petites `carte avec image` pour chacun des collaborateurs appartenant au pôle, qui prendront la largeur maximum de la carte de pôle.
        - Carte avec image (collaborateur) :
            - image : Avatar du collaborateur
            - informations :
                - identification : nom du collaborateur au dessus de son `job_title`
                - badge manager : si `role` est "manager".
    - Chaque click sur la carte de pôle déclenche le comportement commun de cette carte dans un **tab d'une fiche entité** : ouverture d'un **tiroir de consultation** du pôle lié.
    - Chaque click sur une `carte avec image` d'un collaborateur déclenche le comportement commun de cette carte dans un **tab d'une fiche entité** : ouverture d'un **tiroir de consultation** du collaborateur lié.
    - Les deux clicks doivent être distincts pour ne pas ouvrir le tiroir pôle en même temps que celui du collaborateur.
    - Tiroir de consultation d'un pôle :
        - Header : Nom du pôle
        - Contenu :
            - Identification :
                - Badge des catégories auxquelles est lié le pôle
                - Champ **Notes** du pôle, édition inline (cf. `03_business_rules.mdc` — historisé dans `audit_log`)
                - liste en une colonne des collaborateurs du pôle présentée sous forme de `carte avec image` (collaborateur, avec badge manager le cas échéant) qui prendront la largeur maximum disponible de la carte.
            - Détails :
                - tableau de la liste des 10 dernières missions (les plus récemment ajoutées et encore non archivées) du pôle. Colonnes : nom de la mission, client, catégories, date de début et date de fin. Lien "Voir tout -->" vers la liste complète filtrée sur le pôle.
                - tableau de la liste des 10 dernières opportunités (les plus récemment ajoutées et encore non clôturées) du pôle. Colonnes : nom de l'opportunité, client, catégories, date de début et date de fin. Lien "Voir tout -->" vers la liste complète filtrée sur le pôle.
    - Tiroir de consultation d'un collaborateur (ouvert depuis l'onglet Pôles) :
        - Header : Nom du collaborateur
        - Contenu :
            - Identification :
                - Avatar (grand format)
                - `job_title`
                - "Pôle :" nom du pôle du collaborateur
                - "Rôle :" `role`
            - Détails :
                - Section "Responsable clients" (si existant, sinon section non visible) : liste en une colonne des clients dont le collaborateur est le principal contact, présentée sous forme de `carte avec image` (client) qui prendront la largeur maximum disponible de la carte.
                    - Carte avec image (client) :
                        - image : logo du client (placeholder si absent)
                        - informations : nom du client au dessus de son statut (`is_active`)
                        - compteurs alignés à droite : nombre de missions liées, nombre d'opportunités liées
                - tableau de la liste des 10 dernières missions (les plus récemment ajoutées et encore non archivées) du collaborateur. Colonnes : nom de la mission, client, catégories, date de début et date de fin. Lien "Voir tout -->" vers la liste complète filtrée sur le collaborateur.
- **Collaborateurs** :
    - Chaque Collaborateur a une section utilisant le composant `carte avec image` pour présenter tous les collaborateurs. Les composants seront répartis selon la "Vue Cartes" des listes.
        - Carte avec image :
            - image : Avatar du collaborateur
            - informations en une seule colonne:
                - `first_name` `last_name`
                - `job_title`
                - "Pôle :" nom du pôle du collaborateur
                - "Rôle :" `role`
    - Chaque click sur une `carte avec image` d'un collaborateur déclenche le comportement commun de cette carte dans un **tab d'une fiche entité** : ouverture d'un **tiroir de consultation** du collaborateur lié.
    - Tiroir de consultation d'un collaborateur (ouvert depuis l'onglet Collaborateurs) : identique en tout point au tiroir de consultation d'un collaborateur décrit ci-dessus (onglet Pôles).

### Page clients (`/clients`)

**Hero** :

- Identification de l'entité : "Clients" (titre du menu)
- Groupe de boutons d'action (standard liste, cf. `07_ux_composants_reutilisable.mdc` section 4.2) : recherche contextuelle, icône de switch de vue (Cartes ↔ Tableau), icône de filtre, icône de gestion (ouvre le tiroir de création "Nouveau client").

**Contenu** :

- **Vue Cartes** (`carte avec image`, cf. section 5.1 et 9.2 de `07_ux_composants_reutilisable.mdc`) : 4 colonnes desktop / 2 tablette / 1 téléphone.
    - Carte avec image (client) :
        - image : logo du client (placeholder si absent)
        - informations : Nom du client (titre), Statut du client (`is_active` : "Actif" / "Inactif"), Nb de missions liées, Nb d'opportunités liées, Nom du collaborateur responsable (`main_collaborator_id`).
    - Clic sur la carte : redirection vers `/clients/[id]` (page de liste principale, cf. section 9.3 — pas de tiroir).
- **Vue Tableau** (cf. section 5.2) : colonnes Nom Client (+ logo), Statut, Catégories, Site (`website`), Téléphone, Email, Nom du responsable.
    - Téléphone et Email affichent les coordonnées du contact **principal** (`contact_client` où `is_main = true`) rattaché au client — ce ne sont pas des champs propres à l'entité `client` (voir `03_business_rules.mdc`).
    - Clic sur la ligne : redirection vers `/clients/[id]`, idem vue Cartes.
- **Pagination et compteur** (cf. section 5.3) : "Nombre de clients" (total, en bas à gauche) + pagination 25/page avec "Page : x/y" et navigation précédent/suivant (en bas à droite).
- **Filtre** (modale, cf. section 5.4) :
    - Filtre par catégorie (`client_category`, multi-sélection)
    - Filtre par responsable client (`main_collaborator_id`, multi-sélection)
    - Filtre par ville (multi-sélection)
    - Filtre par nombre de missions rattachées (tranches : < 5, 5 ≤ nombre ≤ 20, > 20)
    - Filtre par statut (`is_active`) : Actif / Inactif
    - Boutons "Effacer" (vide les filtres)/ "Filtrer"
- **Tiroir de création "Nouveau client"** (cf. section 7 de `07_ux_composants_reutilisable.mdc`), en **deux temps** :
    1. **Bloc identification** (toujours visible en haut) : logo (upload), Nom (`client_name`, obligatoire), Responsable client (`main_collaborator_id`, obligatoire, dropdown collaborateurs), Website (obligatoire). Bouton **"Enregistrer"** dédié à ce bloc : crée l'enregistrement client en base avec ces champs minimaux — nécessaire pour permettre l'ajout des sous-entités liées (contacts, documents, outils) qui requièrent un `client_id` existant.
    2. **Bloc complémentaire** (déverrouillé après l'étape 1) :
        - Adresse, Code postal, Ville
        - Lien Drive (`drive_link`, nullable)
        - Contact chez le client : liste simplifiée (noms uniquement, sans avatar ni Hover Card) des `contact_client` du client + bouton d'ajout (`user-plus`, drawer contact empilable, cf. `03_business_rules.mdc`). Version différente et plus riche sur la fiche client elle-même (avatars, badge principal, Hover Card, mode gestion — voir `/clients/[id]`).
        - Catégories (`client_category`) : multi-sélection + bouton d'ajout d'une nouvelle catégorie
        - Notes (`notes`, édition inline, historisée dans `audit_log`)
        - Documents relatifs au client (`client_document`) : liste + bouton d'ajout
        - Outil spécifique du client (back-office, `tool_access.client_id`) : liste + bouton d'ajout — actif dès la V1. Le bouton d'ajout ouvre pour l'instant un **tiroir provisoire vide** (à compléter lors de la rédaction de la section Outils/`/tools`).
        - Footer : "Annuler" / "Créer" (sauvegarde le bloc complémentaire)

### Fiche client (`/clients/[id]`)

**Hero** :

- Identification de l'entité : nom réel du client (jamais son id technique, cf. `07_ux_composants_reutilisable.mdc` section 4.1)
- Groupe de boutons d'action : recherche contextuelle (filtre le contenu de l'onglet actif, ex. le tableau Missions) + icône de gestion (`pencil-simple`, ouvre le tiroir **"Edition Client"** — mêmes champs que le tiroir "Nouveau client" de `/clients` (identification + bloc complémentaire), mais en **sauvegarde unique** : "Annuler" / "Enregistrer" en footer, pas d'étape intermédiaire puisque le client existe déjà. Pas de filtre ni de switch de vue sur cette page, ce n'est pas une liste)

**Contenu - Tabs** : "Informations" | "Missions" | "Documentations"

- **Informations** :
    - Colonne gauche : logo du client (lecture seule), Nom (`client_name`), Responsable client (`main_collaborator_id`), Website (`website`). En dessous : Notes (`notes`, édition inline, historisée dans `audit_log`).
    - Colonne droite : Adresse (`address_street`), Code postal (`address_zip`), Ville (`address_city`), Lien drive (`drive_link`).
    - **Contact chez le client** (`contact_client`) : rangée d'avatars (photo ou initiales à défaut).
        - Le contact principal (`is_main = true`) affiche un petit badge (`push-pin`) en haut à droite de son avatar.
        - Survol/clic sur un avatar (hors mode gestion) : **Hover Card** ShadCN (`npx shadcn@latest add hover-card`) avec Nom, Poste, Email, Téléphone — badge principal répété dans la carte si applicable (pas de page dédiée, pas de tiroir de consultation, cf. section 9.3 de `07_ux_composants_reutilisable.mdc`).
        - Icône **"Gestion contact"** (`gear-six`) : bascule la liste en **mode gestion** — chaque avatar affiche alors une icône crayon (édition, ouvre le tiroir "Edition Contact Client") et une icône poubelle (suppression, ouvre la modale de confirmation générique, cf. section 10 de `07_ux_composants_reutilisable.mdc` — le message doit citer le nom du contact, conformément à la règle générale de cette modale).
        - Icône **"Ajout contact"** (`user-plus`) : ouvre le tiroir "Création Contact Client" (drawer empilable, cf. `03_business_rules.mdc`).
        - Tiroir "Création/Édition Contact Client" : avatar (upload), Nom (`last_name`), Prénom (`first_name`), Poste (`job_title`), Email (`email_address`), Téléphone (`phone_number`), **Contact principal** : toggle Oui/Non (`is_main`). Footer : Annuler / Enregistrer.
            - Passer un contact à "Oui" retire automatiquement le statut principal de l'ancien (trigger `enforce_contact_client_main`, cf. `04_database_schema.mdc`).
            - Si ce contact est l'unique contact principal existant, le toggle reste **bloqué sur "Oui"** (grisé/désactivé) : impossible de le repasser à "Non" sans désigner un autre contact comme principal au préalable — appliqué côté UI et garanti côté base (trigger, cf. `04_database_schema.mdc`).
- **Missions** : tableau des missions du client. Colonnes : Nom mission, Collaborateur, Catégories, Opportunité parente, Début, Fin, Statut. Bouton d'ajout (`circles-three-plus`, en haut à droite de l'onglet, au-dessus du tableau ; ouvre un drawer mission avec `mission_scope = client` et `client_id` verrouillés). Clic sur une ligne : tiroir de **consultation** de la mission :
    - Header : nom de la mission.
    - Contenu : identique au tiroir d'**édition** des missions, mais en **lecture seule** — aucun champ n'est éditable.
    - Footer : un seul bouton **"Aller à la mission"** (redirige vers `/missions/[id]`) à la place du couple Annuler/Enregistrer (cf. section 7 de `07_ux_composants_reutilisable.mdc`)
- **Documentations** : 3 blocs côte à côte, chacun avec un libellé, un bouton d'ajout placé immédiatement à droite du libellé (au-dessus de la liste correspondante), et sa liste en dessous. Clic sur un item outil ou wiki : tiroir de consultation (comportement général, cf. section 6/7 de `07_ux_composants_reutilisable.mdc`). Le clic sur un document permet la consultation soit du lien, soit du document (ouverture d'un onglet externe).
    - Documents relatifs au client (`client_document`)
    - Outil spécifique du client (`tool_access.client_id`)
    - Wiki lié au client (`client_wiki`)
    - Les boutons d'ajouts ouvrent le tiroir de **création de l'entité** (document, outil ou wiki) décrit en détail dans leur section; une fois créé, l'entité est automatiquement sélectionné et listé ici (cf. matrice des boutons d'ajout, `03_business_rules.mdc`).

### Page opportunities (`/opportunities`)

**Hero** :

- Identification de l'entité : "Opportunités"
- Groupe de boutons d'action (cf. `07_ux_composants_reutilisable.mdc` section 4.2) : recherche contextuelle, icône de switch de vue (3 modes : **Kanban** / Cartes / Tableau), icône de filtre, icône de gestion (`pencil-simple`, ouvre le tiroir de création "Nouvelle opportunité").

**Contenu** :

- **Vue Kanban** — **vue par défaut** à l'ouverture de la page (cf. `07_ux_composants_reutilisable.mdc` sections 4.3 et 8).
    - 6 colonnes, une par valeur de `kanban_status`, dans cet **ordre d'affichage** (qui correspond désormais à l'ordre de déclaration de l'enum en base) : **Suspect → Prospect → Besoin spécifié → Proposition envoyée → Gagné → Perdue**.
    - Carte (variante Kanban du composant Carte) : Titre (`opportunity_name`) ; ligne Catégories | Urgence ; ligne Client | Responsable opportunité ; ligne Montant | Probabilité de réussite | Date de clôture (couleur selon la règle unifiée de `06_ui_design.mdc`, basée sur `end_at`).
    - Drag and drop (DnD kit) entre et au sein des colonnes, mise à jour optimiste de `kanban_status`/`kanban_order`, cf. section 8 de `07_ux_composants_reutilisable.mdc`.
        - Déplacer une carte vers **Gagné** ou **Perdue** archive automatiquement l'opportunité (`is_active = false`) ; l'en sortir la désarchive (cf. `03_business_rules.mdc`/`04_database_schema.mdc`).
        - Le déplacement met aussi à jour `probability_confirmation` (relevée au minimum mappé du nouveau statut, jamais abaissée si déjà supérieure — cf. `03_business_rules.mdc`), donc `average_price` (colonne calculée) recalculé automatiquement.
    - Total agrégé (`average_price` moyen) sous le titre/badge de chaque colonne, cf. section 8 de `07_ux_composants_reutilisable.mdc`.
    - Compteur "Nombre d'opportunités" en bas à gauche — pas de pagination en Kanban (organisation propre à la vue).
- **Vue Cartes** (cf. section 5.1) : carte sans image → **3 colonnes desktop** / 2 tablette / 1 téléphone.
    - Carte : Titre (`opportunity_name`) ; ligne Catégories | Statut ; ligne Client | Responsable opportunité ; ligne Montant | Probabilité de réussite | Date de clôture.
    - Clic sur la carte : redirection vers `/opportunities/[id]` (page de liste principale, cf. section 9.3).
- **Vue Tableau** (cf. section 5.2) : colonnes Nom Opportunité, Client, Responsable opportunité, Statut, Urgence, Catégories, Echéance, Date de clôture, Montant.
    - Clic sur la ligne : redirection vers `/opportunities/[id]`, idem vue Cartes.
- **Pagination et compteur** (Cartes/Tableau uniquement, cf. section 5.3) : "Nombre d'opportunités" (total, en bas à gauche) + pagination 25/page avec "Page : x/y" et navigation précédent/suivant (en bas à droite).
- **Filtre** (modale, cf. section 5.4) :
    - Filtre par client (multi-sélection)
    - Filtre par responsable opportunité (multi-sélection)
    - Filtre par catégorie (multi-sélection)
    - Filtre par montant (tranches : < 5 k, 5 k ≤ montant ≤ 20 k, > 20 k)
    - Filtre par statut (`kanban_status`, multi-sélection, dans l'ordre d'affichage ci-dessus)
    - Filtre par probabilité (tranches : < 30 %, 30 % ≤ proba ≤ 50 %, > 50 %)
    - Filtre par urgence (multi-sélection, ajouté pour cohérence avec la colonne Urgence du tableau)
    - Boutons "Effacer" (vide les filtres) / "Filtrer"
- **Tiroir de création "Nouvelle opportunité"** (cf. section 7), en **deux temps** :
    1. **Bloc identification** (toujours visible en haut) : Titre (`opportunity_name`, obligatoire), Client (`client_id`, **obligatoire** — dropdown clients + bouton d'ajout client), Contact (`contact_client_id`, nullable — dropdown contacts du client sélectionné + bouton d'ajout contact), Responsable opportunité (`collaborator_id`, obligatoire — dropdown collaborateurs), Date de dernière rencontre (`last_meeting_at`), Echéance (`due_date_at`), Date de clôture (`end_at`). **Au moins une des deux dates Echéance/Date de clôture est obligatoire** (contrainte `opportunity_due_or_end_required`). Bouton **"Enregistrer"** dédié : crée l'opportunité en base avec ces champs — nécessaire pour permettre l'ajout de documents liés qui requièrent un `opportunity_id` existant. Le statut initial (`kanban_status`) et la probabilité associée sont posés automatiquement à cet instant selon l'historique du client (cf. `03_business_rules.mdc`), sans champ visible à cette étape.
    2. **Bloc complémentaire** (déverrouillé après l'étape 1) :
        - Catégories (`opportunity_category`) : multi-sélection + bouton d'ajout d'une nouvelle catégorie
        - Montant (`price`) et Montant pondéré (`average_price`, **lecture seule**, calculé automatiquement à partir de Montant × Probabilité)
        - Probabilité (`probability_confirmation`, 0–100) et Urgence (`priority`, dropdown)
        - Statut (`kanban_status`, dropdown, dans l'ordre d'affichage ci-dessus — modifier ce champ ici a les mêmes effets automatiques que le déplacement d'une carte en Kanban : probabilité et archivage)
        - Action (`action`, texte libre) et Source (`source`, texte libre)
        - Notes (`notes`, édition inline, historisée dans `audit_log`)
        - Documents relatifs à l'opportunité (`opportunity_document`) : liste + bouton d'ajout
        - Outil spécifique de l'opportunité (`opportunity_tool`) : liste + bouton d'ajout — **simple lien vers un outil existant, sans identifiants** (pas de back-office crédentialisé, `tool_access` n'a pas de colonne `opportunity_id`, cf. `03_business_rules.mdc`)
        - Footer : "Annuler" / "Créer" (sauvegarde le bloc complémentaire)

### Fiche opportunity (`/opportunities/[id]`)

**Hero** :

- Identification de l'entité : nom réel de l'opportunité (`opportunity_name`, jamais son id technique, cf. `07_ux_composants_reutilisable.mdc` section 4.1)
- Groupe de boutons d'action : recherche contextuelle (filtre le contenu de l'onglet actif) + icône de gestion (`pencil-simple`, ouvre le tiroir "Edition Opportunité" — mêmes champs que le tiroir "Nouvelle opportunité" de `/opportunities`, mais en **sauvegarde unique** : "Annuler" / "Enregistrer" en footer, pas d'étape intermédiaire puisque l'opportunité existe déjà. Pas de filtre ni de switch de vue sur cette page, ce n'est pas une liste)

**Contenu - Tabs** : "Informations" | "Missions" | "Documentations"

- **Informations** :
    - Colonne gauche : Titre (`opportunity_name`), Client (`client_id`), Contact (`contact_client_id`), Responsable opportunité (`collaborator_id`). En dessous : Notes (`notes`, édition inline, historisée dans `audit_log`).
    - Colonne droite : Statut (`kanban_status`), Montant (`price`), Montant pondéré (`average_price`, **lecture seule**, calculé), Probabilité (`probability_confirmation`), Urgence (`priority`), Action (`action`), Source (`source`), Date de dernière rencontre (`last_meeting_at`), Echéance (`due_date_at`), Date de clôture (`end_at`).
- **Missions** : tableau des missions liées à cette opportunité (`mission.opportunity_id`). Colonnes (cf. `03_business_rules.mdc`) : Nom mission, Collaborateur, Catégories, Début, Fin, Statut. Bouton d'ajout (`circles-three-plus`, en haut à droite de l'onglet, au-dessus du tableau ; ouvre un drawer mission avec `opportunity_id` verrouillé). Clic sur une ligne : tiroir de **consultation** de la mission (contenu = tiroir d'édition mission en lecture seule, footer "Aller à la mission" → `/missions/[id]`).
- **Documentations** : 2 blocs côte à côte pour les documents et les outils : libellé + bouton d'ajout à droite + liste en dessous. Clic sur un item outil : tiroir de consultation (comportement général, cf. section 6/7 de `07_ux_composants_reutilisable.mdc`). Le clic sur un document permet la consultation soit du lien, soit du document (ouverture d'un onglet externe).
    - Documents relatifs à l'opportunité (`opportunity_document`)
    - Outil spécifique de l'opportunité (`opportunity_tool`).
    - Les boutons d'ajouts ouvrent le tiroir de **création de l'entité** (document, outil) décrit en détail dans leur section; une fois créé, l'entité est automatiquement sélectionné et listé ici (cf. matrice des boutons d'ajout, `03_business_rules.mdc`).

### Page missions (`/missions`)

**Hero** :

- Identification de l'entité : "Missions"
- Groupe de boutons d'action (cf. `07_ux_composants_reutilisable.mdc` section 4.2) : recherche contextuelle, icône de switch de vue (3 modes : Kanban (par défaut)/ Cartes / Tableau), icône de filtre, icône de gestion (`pencil-simple`, ouvre le tiroir de création "Nouvelle mission").

**Contenu** :

- **Vue Kanban** (cf. `07_ux_composants_reutilisable.mdc` section 8) : 4 colonnes, une par valeur de `kanban_status`, dans l'ordre de déclaration de l'enum : **A faire → En cours → Terminée → Archivée**.
    - La colonne **"Archivée"** est libellée **"Archivée (3 mois)"** et n'affiche que les missions dont `archived_at` date de moins de 3 mois (cf. `03_business_rules.mdc`/`04_database_schema.mdc`) — les archives plus anciennes restent accessibles via les vues Cartes/Tableau avec le filtre par statut.
    - Carte (variante Kanban du composant Carte) : Titre (`mission_name`) ; ligne Catégorie | Scope (`mission_scope`, badge coloré `--secondary` si interne, cf. `06_ui_design.mdc`) ; ligne Client | Responsable mission ; ligne Opportunité liée | Date de début | Date de fin.
    - Drag and drop (DnD kit) entre et au sein des colonnes, mise à jour optimiste de `kanban_status`/`kanban_order` (même comportement que la vue Kanban Opportunités) ; entrer/sortir du statut `archivee` met à jour `archived_at` automatiquement (trigger, cf. `04_database_schema.mdc`).
    - Compteur "Nombre de missions" en bas à gauche — pas de pagination en Kanban.
- **Vue Cartes** (cf. section 5.1) : carte sans image → **3 colonnes desktop** / 2 tablette / 1 téléphone (règle générale, comme pour Opportunités).
    - Carte : Titre (`mission_name`) ; ligne Catégorie | Statut ; ligne Client | Responsable mission ; ligne Opportunité liée | Date de début | Date de fin.
    - Clic sur la carte : redirection vers `/missions/[id]` (page de liste principale, cf. section 9.3).
- **Vue Tableau** (cf. section 5.2) : colonnes Nom Missions, Client, Responsable mission, Statut, Catégories, Date de début, Date de fin, Scope.
    - Clic sur la ligne : redirection vers `/missions/[id]`, idem vue Cartes.
- **Pagination et compteur** (Cartes/Tableau uniquement, cf. section 5.3) : "Nombre de missions" (total, en bas à gauche) + pagination 25/page avec "Page : x/y" et navigation précédent/suivant (en bas à droite).
- **Filtre** (modale, cf. section 5.4) :
    - Filtre par client (multi-sélection)
    - Filtre par responsable mission (multi-sélection)
    - Filtre par catégorie (multi-sélection)
    - Filtre par scope (`mission_scope` : Interne / Client)
    - Filtre par statut (`kanban_status`, multi-sélection)
    - Filtre par date (plage de dates)
    - Boutons "Effacer" (vide les filtres)/ "Filtrer"
- **Tiroir de création "Nouvelle mission"** (cf. section 7), en **deux temps** comme pour client/opportunité :
    1. **Bloc identification** (toujours visible en haut) : Titre (`mission_name`, obligatoire), Responsable mission (`collaborator_id`, obligatoire, dropdown collaborateurs, pré-rempli avec l'utilisateur courant mais modifiable), toggle **Interne** (Oui/Non — pilote `mission_scope`), Client (`client_id` — visible et obligatoire seulement si Interne = Non ; masqué si Interne = Oui ; dropdown + bouton d'ajout client). Bouton **"Enregistrer"** dédié : crée la mission en base avec ces champs — nécessaire pour permettre l'ajout de documents/outils/wikis/opportunité liés qui requièrent un `mission_id` existant.
    2. **Bloc complémentaire** (déverrouillé après l'étape 1) :
        - Catégories (`mission_category`) : multi-sélection + bouton d'ajout d'une nouvelle catégorie
        - Temps vendu (`estimated_charge`, en heures) et Statut (`kanban_status`, dropdown)
        - Date de début (`start_at`) et Date de fin (`end_at`)
        - Opportunité liée à la mission (`opportunity_id`, nullable, dropdown + bouton d'ajout d'une nouvelle opportunité — champ propre à Mission, cf. matrice des boutons "+" dans `03_business_rules.mdc`)
        - Notes (`notes`, édition inline, historisée dans `audit_log`)
        - Documents relatifs à la mission (`mission_document`) : liste + bouton d'ajout
        - Outil spécifique de la mission (`mission_tool`) : **simple lien vers un outil existant, sans identifiants** (comme pour l'opportunité — pas de back-office crédentialisé, `tool_access` n'a pas de colonne `mission_id`)
        - Wiki spécifique de la mission (`mission_wiki`) : liste + bouton d'ajout
        - Footer : "Annuler" / "Créer" (sauvegarde le bloc complémentaire)

### Fiche mission (`/missions/[id]`)

**Hero** :

- Identification de l'entité : nom réel de la mission (`mission_name`, jamais son id technique, cf. `07_ux_composants_reutilisable.mdc` section 4.1)
- Groupe de boutons d'action : recherche contextuelle (filtre le contenu de l'onglet actif) + icône de gestion (`pencil-simple`, ouvre le tiroir "Edition Mission" — mêmes champs que le tiroir "Nouvelle mission" de `/missions`, mais en **sauvegarde unique** : "Annuler" / "Enregistrer" en footer, pas d'étape intermédiaire puisque la mission existe déjà. Pas de filtre ni de switch de vue sur cette page, ce n'est pas une liste)

**Contenu - Tabs** : "Informations" | "Documentations"

- **Informations** :
    - Colonne gauche : Titre (`mission_name`), Client (`client_id` — champ de relation simple cliquable "Accès au client", cf. section 9.3 de `07_ux_composants_reutilisable.mdc` ; vide/non cliquable si mission interne), Responsable mission (`collaborator_id`). En dessous : Notes (`notes`, édition inline, historisée dans `audit_log`).
    - Colonne droite : Statut (`kanban_status`), Catégorie (`mission_category`), Temps vendu (`estimated_charge`), Opportunité (`opportunity_id` — champ de relation simple cliquable "Accès à l'opportunité", vide/non cliquable si aucune opportunité liée), Date de début (`start_at`), Date de fin (`end_at`).
    - **Tiroir de consultation d'un client** (ouvert via "Accès au client") : Header = nom du client ; Contenu = identique au tiroir d'édition client (cf. `/clients`), en lecture seule ; Footer = bouton unique "Aller au client" (`/clients/[id]`).
    - **Tiroir de consultation d'une opportunité** (ouvert via "Accès à l'opportunité") : Header = nom de l'opportunité ; Contenu = identique au tiroir d'édition opportunité en lecture seule; Footer = bouton unique "Aller à l'opportunité" (`/opportunities/[id]`).
- **Documentations** : 3 blocs côte à côte : libellé + bouton d'ajout à droite + liste en dessous. Clic sur un item outil ou wiki : tiroir de consultation (comportement général, cf. section 6/7 de `07_ux_composants_reutilisable.mdc`). Le clic sur un document permet la consultation soit du lien, soit du document (ouverture d'un onglet externe).
    - Documents relatifs à la mission (`mission_document`)
    - Outil spécifique de la mission (`mission_tool`)
    - Wiki lié à la mission (`mission_wiki`)
    - Les boutons d'ajouts ouvrent le tiroir de **création de l'entité** (document, outil ou wiki) décrit en détail dans leur section; une fois créé, l'entité est automatiquement sélectionné et listé ici (cf. matrice des boutons d'ajout, `03_business_rules.mdc`).

### Page tools (`/tools`)

**Hero** :

- Identification de l'entité : "Outils"
- Groupe de boutons d'action (cf. `07_ux_composants_reutilisable.mdc` section 4.2) : recherche contextuelle, icône de switch de vue (2 modes : Cartes / Tableau), icône de filtre, icône de gestion (`pencil-simple`, ouvre le tiroir de création "Nouvel outil").

**Contenu** :

- **Vue Cartes** (cf. section 5.1) : carte sans image → 3 colonnes desktop / 2 tablette / 1 téléphone.
    - Carte : Titre (`tool_name`) ; Abonnement — montant mensuel actif en haut à droite, calculé à partir de `tool_subscription_price` où `valid_to IS NULL` : affiché tel quel si `subscription_plan = mensuel`, **divisé par 12** (proratisé au mois) si `subscription_plan = annuel` ; vide si aucun abonnement actif ; Catégories ; Lien direct (`url`).
    - **Icône de suppression directement sur la carte** (en bas à droite) : ouvre la modale de confirmation générique (section 10) — "Toute suppression d'un outil est définitive. Êtes-vous sûr de vouloir supprimer cet outil ?" / Annuler / Supprimer. Exception au comportement des autres entités (Client/Opportunité/Mission), qui n'ont pas de suppression directe depuis la carte.
    - Clic sur la carte (hors icône suppression) : redirection vers `/tools/[id]` (page de liste principale, cf. section 9.3).
- **Vue Tableau** (cf. section 5.2) : colonnes Nom Outils, Lien direct (URL), Catégories, Description, Coût mensuel, puis une colonne dédiée à l'icône de suppression directe (même comportement/modale que la vue Cartes).
    - Coût mensuel : prix actif de l'abonnement (`tool_subscription_price` où `valid_to IS NULL`), affiché en lecture ; vide si aucun abonnement actif.
    - Clic sur la ligne (hors icône suppression) : redirection vers `/tools/[id]`, idem vue Cartes.
- **Pagination et compteur** (cf. section 5.3) : "Nombre d'outils" (total, en bas à gauche) + pagination 25/page avec "Page : x/y" et navigation précédent/suivant (en bas à droite).
- **Filtre** (modale, cf. section 5.4) :
    - Filtre par catégorie (multi-sélection)
    - Filtre par coût mensuel (tranches : < 10 €, 10 € ≤ coût ≤ 20 €, > 20 €)
    - Avec abonnement / Sans abonnement (checkboxes)
    - Filtre par client (multi-sélection — filtre sur `client_tool`, les clients auxquels l'outil est tagué)
    - Boutons "Effacer" (vide les filtres)/ "Filtrer"
- **Tiroir de création "Nouvel outil"** (cf. section 7), en **deux temps** :
    1. **Bloc identification** (toujours visible en haut) : Titre (`tool_name`, obligatoire), URL (`url`, obligatoire), Catégories (multi-sélection + bouton d'ajout d'une nouvelle catégorie), Description (`description`). Bouton **"Enregistrer"** dédié : crée l'outil en base avec ces champs — nécessaire pour permettre l'ajout du premier accès et de l'abonnement, qui requièrent un `tool_id` existant.
    2. **Bloc complémentaire** (déverrouillé après l'étape 1), en 2 sous-sections optionnelles :
        - **"Premier accès (optionnel)"** — crée une ligne `tool_access` : toggle **Privé** (Oui/Non, pilote `is_private` — distinct du toggle "Interne" de mission, cf. `03_business_rules.mdc`), Client (`client_id`, nullable, dropdown + bouton d'ajout client), Label (`label`), Identifiant (`identifier`), Mot de passe (stocké via Vault, jamais en clair, cf. `05_security_rls.mdc`).
        - **"Abonnement"** — crée une ligne `tool_subscription` (+ son premier `tool_subscription_price`) : bouton d'ajout dédié en en-tête de section (mini-formulaire inline, pas un tiroir empilé) avec Titre (`tool_subscription.title`), Facturation mensuel (Oui/Non — pilote `subscription_plan` : Oui = `mensuel`, Non = `annuel`), Montant (`amount`) et Devise (`currency`), Date de début (`valid_from`) et Date de fin (`valid_to`, nullable — une seule ligne de prix "active", `valid_to IS NULL`, par devise, cf. `04_database_schema.mdc`/`08_database_rules.mdc`) ; boutons "Annuler"/"Ajouter" propres à ce mini-formulaire.
        - Footer global du tiroir : "Annuler" / "Créer" (sauvegarde le bloc complémentaire)

### Fiche outil (`/tools/[id]`)

**Hero** :

- Identification de l'entité : nom réel de l'outil (`tool_name`, jamais son id technique)
- Groupe de boutons d'action : recherche contextuelle + icône de gestion (`pencil-simple`, ouvre le tiroir "Edition Outil" — mêmes champs que le tiroir "Nouvel outil" de `/tools`, en **sauvegarde unique**). Pas de filtre ni de switch de vue, ce n'est pas une liste.

Page à **plat, sans onglets** (contrairement à Client/Opportunité/Mission) :

- **Colonne gauche** : Titre (`tool_name`), URL (`url`), Catégories (`tool_category`), **Client(s) lié(s)** (`client_tool` — liste de badges clients ; champ **affiché uniquement si au moins un client est lié** à l'outil, masqué sinon ; positionné entre Catégories et Description), Description (`description`).
- **Section "Accès"** (sous une ligne de séparation) : une carte par ligne `tool_access`.
    - Carte "Accès" : libellé "Interne/client" (résumé de la portée : interne ou nom du client lié), Identifiant (`identifier`), Mot de passe masqué (`••••••••`).
    - 3 icônes sur la carte :
        - **Œil** : révèle le mot de passe. Ouvre un petit encart **"Mot de passe — Accès"** avec le texte _"Ce mot de passe est affiché temporairement. Il sera effacé à la fermeture."_, puis Identifiant + Mot de passe en clair. Déclenche la server action `readVaultSecret` (`actions/vault.ts`), cf. `05_security_rls.mdc`.
        - **Icône `lock-simple`** : indicateur (pas une action) de la valeur de `is_private` — signale visuellement si l'accès est privé (Manager/Direction uniquement) ou non.
        - **Poubelle** : suppression, modale de confirmation générique (section 10 de `07_ux_composants_reutilisable.mdc`).
        - (Crayon, en plus des 3 ci-dessus) : ouvre le tiroir **"Edition Accès"** (Privé, Client, Label, Identifiant, **"Nouveau mot de passe"** — laisser vide conserve le mot de passe existant ; footer Annuler/Enregistrer).
    - Bouton **"+ Accès"** à côté du titre "Accès" : ouvre le même tiroir en création (mêmes champs, libellé "Mot de passe"), pour ajouter un accès supplémentaire. Distinct du bloc "Premier accès (optionnel)" du tiroir Outil, qui ne permet de créer **que le tout premier accès**, au moment de la création de l'outil.
    - Accès `is_private = true` invisibles pour **Collaborateur** uniquement (visibles pour Manager et Direction) — cf. `05_security_rls.mdc`.
- **Colonne droite — section "Abonnement"** : bouton d'ajout à côté du titre (mini-formulaire inline, cf. tiroir "Nouvel outil"). Liste des `tool_subscription_price` (ex. "Année 2024", "Année 2026" + Montant).

### Page documents (`/documents`)

**Hero** :

- Identification de l'entité : "Documents"
- Groupe de boutons d'action (cf. `07_ux_composants_reutilisable.mdc` section 4.2) : recherche contextuelle, icône de switch de vue (2 modes : Cartes / Tableau), icône de filtre, icône de gestion (`pencil-simple`, ouvre le tiroir de création "Nouveau document").

**Contenu** :

- Par défaut, seule la **dernière version** de chaque document est affichée (calculée dynamiquement : pour chaque famille de documents regroupée par `COALESCE(parent_document_id, id)`, la ligne avec le `version_number` le plus élevé — cf. `04_database_schema.mdc`, vue `document_latest`). Le filtre Version permet de faire apparaître aussi les versions antérieures.
- Pas de page `[id]` dédiée pour `document` — toutes les actions se font depuis les icônes de la carte/ligne (voir ci-dessous), il n'y a pas de fiche à consulter séparément.
- **Vue Cartes** (cf. section 5.1) : carte sans image → 3 colonnes desktop / 2 tablette / 1 téléphone.
    - Carte : Titre (`document_name`) ; version (`version_number`, en haut à droite) ; Type (`document_type`) ; Visuel : (`is_visual`) ; Lié : Client/Opportunité/Mission (nom de l'entité liée via `client_document`/`opportunity_document`/`mission_document` — vide si le document n'est rattaché à aucune entité, ex. un document créé directement depuis `/documents`) ; Date (`created_at`).
    - **4 icônes d'action directement sur la carte** (pas de passage par une fiche dédiée) : crayon (édition, ouvre le tiroir "Edition document"), lien externe (ouvre/prévisualise le fichier ou l'URL), téléchargement (`download`, télécharge le fichier), poubelle (suppression, modale de confirmation générique — "Toute suppression d'un document est définitive. Êtes-vous sûr de vouloir supprimer ce document ?").
- **Vue Tableau** (cf. section 5.2) : colonnes Nom document, Type, **Lié à** (nom de l'entité liée, même logique que la carte), Date d'ajout, Version, Actions (mêmes 4 icônes que la vue Cartes).
- **Pagination et compteur** (cf. section 5.3) : "Nombre de documents" (total, en bas à gauche) + pagination 25/page avec "Page : x/y" et navigation précédent/suivant (en bas à droite).
- **Filtre** (modale, cf. section 5.4) :
    - Filtre par type (`document_type`, multi-sélection)
    - Filtre par version (multi-sélection, ex. V1/V2/V3 — permet de faire remonter des versions antérieures à la dernière, normalement masquées par défaut)
    - Filtre par client (multi-sélection — filtre sur `client_document` ; à étendre par cohérence aux missions/opportunités liées si besoin + interne qui exclue les document lié à un client)
    - Boutons "Effacer" (vide les filtres)/ "Filtrer"
- **Tiroir de création "Nouveau document"** (cf. section 7) — **sauvegarde unique**, pas de tiroir en deux temps (document est une entité simple, sans sous-entité à lui rattacher) :
    - Titre (`document_name`, obligatoire)
    - Type (`document_type_id`, dropdown + bouton d'ajout d'un nouveau type — cf. matrice des boutons d'ajout, `03_business_rules.mdc`)
    - Source : toggle **Fichier (Supabase)** / **Lien externe** (pilote `storage_type`)
        - Si Fichier : champ "Fichier" — composant **Attachment** ShadCN (`npx shadcn@latest add attachment`, zone de dépôt/sélection avec aperçu du nom et de la taille), upload vers Supabase Storage → `file_path`
        - Si Lien externe : champ "URL" (`url`)
    - Document visuel (photo, logo, avatar) : toggle Oui/Non (`is_visual`)
    - Footer : "Annuler" / "Créer"
    - Lorsque ce tiroir est ouvert **en empilé** depuis un bouton d'ajout de document (Client/Opportunité/Mission), la liaison à l'entité parente (`client_document`/`opportunity_document`/`mission_document`) est créée automatiquement à la validation (cf. matrice des boutons d'ajout, `03_business_rules.mdc`) — pas de champ "Lié à" visible dans ce formulaire.
- **Tiroir "Edition document"** : mêmes champs que la création, en sauvegarde unique (Annuler/Enregistrer). Uploader un nouveau fichier sur un document existant déclenche le mécanisme de versionning (nouvelle entrée `version_number + 1`, cf. `03_business_rules.mdc`) plutôt que d'écraser la version actuelle.
    - **Toggle "Document visuel" (`is_visual`)** : grisé/masqué en mode édition **tant qu'aucun nouveau fichier n'est sélectionné** — il ne redevient actif que dans le sous-flux de remplacement de fichier (upload d'une nouvelle version), puisque `is_visual` n'est jamais modifiable sur une ligne existante sans nouvel upload (cf. `09_integrations.mdc`). La nouvelle version ainsi créée peut porter une valeur `is_visual` différente de la précédente sans aucun souci technique, chaque version ayant son propre `id` et donc son propre chemin de stockage, potentiellement dans un bucket différent (cf. `08_database_rules.mdc`).

### Wiki (`/wikis`)

- **Une seule route page** : `/wikis`. Pas de `/wikis/[id]` : ouverture lecture / édition / création en **drawers** (pile possible avec gestion des catégories, etc.).
- Éditeur **Tiptap** : H1–H3, listes, gras, italique, liens, images (barre d'outils : B, I, U, H1, H2, H3, liste).
- `content_html` pour l'affichage, `content_text` pour le FTS — jamais afficher le HTML brut en FTS.
- Tags (`tags`, texte libre) + catégorie (via `wiki_category`).
- Lecture et édition ouvertes à **tous les rôles** en V1.

**Hero** :

- Identification de l'entité : "Wikis"
- Groupe de boutons d'action (cf. `07_ux_composants_reutilisable.mdc` section 4.2) : recherche contextuelle, icône de switch de vue (2 modes : Cartes / Tableau), icône de filtre, icône de gestion (`pencil-simple`, ouvre le tiroir de création "Nouveau Wiki").

**Contenu** :

- **Vue Cartes** (cf. section 5.1) : carte sans image → 3 colonnes desktop / 2 tablette / 1 téléphone.
    - Carte : Titre (`title`) ; Catégories (`wiki_category`) ; Tags (`tags`) ; Date création (`created_at`) ; Date mise à jour (`updated_at`).
    - 2 icônes d'action directement sur la carte (pas de page dédiée à consulter séparément) : crayon (édition, ouvre le tiroir "Edition Wiki") ; poubelle (suppression, modale de confirmation générique — "Toute suppression d'un wiki est définitive. Êtes-vous sûr de vouloir supprimer ce wiki ?").
- **Vue Tableau** (cf. section 5.2) : colonnes Titre, Catégories, Tags, Date d'ajout, Actions (mêmes 2 icônes que la vue Cartes).
- **Pagination et compteur** (cf. section 5.3) : "Nombre de wikis" (total, en bas à gauche) + pagination 25/page avec "Page : x/y" et navigation précédent/suivant (en bas à droite).
- **Filtre** (modale, cf. section 5.4) :
    - Filtre par catégorie (`wiki_category`, multi-sélection)
    - Boutons "Effacer" (vide les filtres)/ "Filtrer"
- **Tiroir de création "Nouveau Wiki"** (cf. section 7) — **sauvegarde unique**, pas de tiroir en deux temps (comme `document`, wiki est une entité simple sans sous-entité à lui rattacher) :
    - Titre (`title`, obligatoire)
    - Catégories (`wiki_category`, multi-sélection + bouton d'ajout d'une nouvelle catégorie)
    - Tags (`tags`, texte libre)
    - Contenu (`content_html`/`content_text`, éditeur Tiptap)
    - Footer : "Annuler" / "Créer"
- **Tiroir "Edition Wiki"** : mêmes champs que la création, en sauvegarde unique (Annuler/Enregistrer).

### Page Etudes & Analyses (`/analyses`)

**Hero** :

- Identification de l'entité : "Etudes et analyses"
- Groupe de boutons d'action : Aucun (page de lecture seule, pas de création/filtre/vue).

**Contenu - Tabs** : "Opportunités" | "Missions" | "Abonnements"

- **Opportunités** :
    - 4 cartes KPI : Nombre d'opportunités (`COUNT`) ; Total des sommes engagées (`SUM(price)`) ; Total des sommes pondérées (`SUM(average_price)`) ; Taux de conversion (`COUNT(kanban_status = gagne) / COUNT(*)`, opportunités encore ouvertes incluses au dénominateur).
    - Comparaison par statut : diagramme en barres horizontales, une barre par valeur de `kanban_status`.
    - Evolution du pipeline Commercial : diagramme en barres verticales dans le temps (volume/valeur des opportunités par période).
    - Comparaison par catégories : diagramme en barres horizontales par `opportunity_category`.
    - Comparaison CA par pôle : diagramme en barres horizontales, chiffre d'affaires (`price` ou `average_price`) agrégé par pôle (via `collaborator_id` → équipe du collaborateur responsable).
- **Missions** :
    - 4 cartes KPI : Nombre de missions (`COUNT`) ; Nombre de missions en production (`kanban_status = en_cours`) ; Nombre de missions abandonnées (`kanban_status = archivee AND completed_at IS NULL`) ; Nombre de missions complétées (`completed_at IS NOT NULL`, cf. `03_business_rules.mdc`/`04_database_schema.mdc`).
    - Comparaison par statut : diagramme en barres horizontales par `kanban_status`.
    - Evolution du pipeline Produit : diagramme en barres verticales dans le temps.
    - Comparaison par catégories : diagramme en barres horizontales par `mission_category`.
    - Comparaison par pôle : diagramme en barres horizontales, nombre de missions par pôle (via `collaborator_id` → équipe).
- **Abonnements** :
    - "Dépenses du mois" : un total séparé **par devise réellement utilisée** dans les abonnements actifs du mois courant (somme des `tool_subscription_price` actives, groupée par `currency`) — pas de nombre de devises fixé à l'avance, pas de conversion/agrégation inter-devises. Si une seule devise est utilisée (ex. uniquement EUR), un seul total s'affiche.
    - Coût par Outil - mois : diagramme en barres verticales, coût actif du mois par outil.
    - Evolution des coûts par Catégories - année : diagramme en barres verticales dans le temps, coûts agrégés par `tool_category`, vue annuelle.
    - Coût par catégories - mois : diagramme en barres horizontales, coûts du mois agrégés par `tool_category`.

### Page Gestion Admin (`/administration`)

**Hero** :

- Identification de l'entité : "Gestion admin"
- Groupe de boutons d'action : recherche contextuelle + icône de gestion (`pencil-simple`) — **pas de filtre, pas de switch de vue** sur cette page (contenus simples, vue Cartes uniquement, cf. onglets ci-dessous).

**Contenu - Tabs** : "Catégories" | "Types" | "Collaborateurs & Pôles"

- **Catégories** (`category`) :
    - Grille de cartes "Catégorie" (Titre uniquement), chacune avec icônes crayon (édition) et poubelle (suppression directe, sans passer par une édition préalable — modale de confirmation générique : "Toute suppression d'une catégorie est définitive. Êtes-vous sûr de vouloir supprimer cette catégorie ?").
    - Pagination 25/page (cf. section 5.3), compteur "Nombre de catégories".
    - Le crayon de gestion du Hero ouvre le tiroir **"Nouvelle catégorie"** — sauvegarde unique : Titre (`label`, obligatoire), footer Annuler/Enregistrer. Suppression ouverte à tout collaborateur actif (cf. `05_security_rls.mdc`).
- **Types** (`document_type`) : structure et comportement identiques à l'onglet Catégories (grille de cartes "Type", crayon/poubelle inline, tiroir "Nouveau type documentaire" à un seul champ Titre (`label`), même modale de suppression adaptée au libellé "type documentaire"). Suppression ouverte à tout collaborateur actif.
- **Collaborateurs & Pôles** (`team` / `collaborator`) : 2 sous-sections sur le même onglet, chacune avec son propre bouton d'ajout à droite du sous-titre. Accessible uniquement aux collaborateur avec rôle "manager" et "direction"
    - **Pôles** : grille de cartes "Pôle" (Titre), crayon (édition, ouvre "Edition Pôle") + poubelle (suppression). Bouton d'ajout ouvre le tiroir **"Nouveau Pôle"** : Nom (`team_name`), Catégories (`team_category`, multi-sélection + bouton d'ajout d'une nouvelle catégorie), Notes (`notes`), footer Annuler/Enregistrer.
    - **Collaborateurs** : grille de cartes "Collaborateur" (Nom), crayon (édition) + poubelle. Bouton d'ajout ouvre le tiroir **"Nouveau Collaborateur"** : Avatar (upload, `profile_picture_id`), Nom (`last_name`), Prénom (`first_name`), Email (`email`), Rôle (`role`, dropdown), Statut (`status`, dropdown), Pôle (`team_id`, dropdown + bouton d'ajout d'un nouveau pôle, cf. matrice des boutons d'ajout dans `03_business_rules.mdc`), Poste (`job_title`). Footer Annuler/Enregistrer.
    - **Suppression** :
        - Suppression d'un **Pôle** : modale de confirmation générique classique, suppression SQL réelle (`team` n'a pas de contrainte particulière hors permissions).
        - Suppression d'un **Collaborateur** : le bouton déclenche en réalité le flux d'**anonymisation** (`anonymize_collaborator`, cf. `04_database_schema.mdc`/`05_security_rls.mdc`) et non une suppression SQL — `collaborator` n'a aucune policy `DELETE`. Le texte de la modale ("Toute suppression d'un pôle/collaborateur est définitive...") reste identique en façade pour les deux cas, mais recouvre deux mécanismes différents côté serveur.

### Home (`/`)

**Hero** :

- Identification de l'entité : "Home"
- Groupe de boutons d'action : icône `gear` uniquement (pas de recherche contextuelle sur cette page) — ouvre la modale **"Ajout de widgets à votre page d'accueil"**.

**Modale de sélection des widgets** :

- Titre : "Ajout de widgets à votre page d'accueil"
- "Sélectionner un ou plusieurs widgets :" — liste déroulante à cases à cocher (multi-sélection), catalogue fermé de 13 widgets précis (pas l'ensemble des graphiques de `/analyses`) :
    1. Kanban des opportunités
    2. Kanban des missions
    3. Résumé des chiffres des opportunités (4 cartes KPI : Nombre d'opportunités, Total des sommes engagées, Total des sommes pondérées, Taux de conversion)
    4. Résumé des chiffres des missions (4 cartes KPI : Nombre de missions, Nombre de missions en production, Nombre de missions abandonnées, Nombre de missions complétées)
    5. Opportunités - comparaison par statut
    6. Opportunités - comparaison par catégories
    7. Missions - comparaison par statut
    8. Missions - comparaison par catégories
    9. Tools - dépenses du mois
    10. Opportunités - évolution du pipeline Commercial
    11. Opportunités - comparaison CA par pôle
    12. Missions - évolution du pipeline Produit
    13. Tools - évolution des coûts par Catégories - année
- Chaque widget correspond exactement à un élément déjà décrit dans `/opportunities` (vue Kanban), `/missions` (vue Kanban), ou `/analyses` (cartes KPI et graphiques des onglets Opportunités/Missions/Abonnements) — même source de données, même calcul, simplement réaffiché ici. Il faut utiliser les composants créer pour les conglets de la page `/analyses`
- Bouton "Confirmation" : valide la sélection et ferme la modale.

**Contenu** :

- Les widgets cochés s'affichent en pile verticale, **dans l'ordre où l'utilisateur les a sélectionnés** (pas d'ordre fixe de catalogue, pas de réorganisation manuelle a posteriori documentée pour l'instant).
- Page vide (aucun bloc) tant qu'aucun widget n'a été sélectionné.
- Chaque widget est dans le même état que dans leur page d'origine car on ne fait qu'afficher le composant d'origine et non le modifier.

### Profil utilisateur (`/settings`)

**Hero** :

- Identification de l'entité : "Profil & préférences"
- Groupe de boutons d'action : icône de gestion uniquement (`pencil-simple`, ouvre le tiroir "Modification profil") — pas de recherche contextuelle sur cette page (pas de liste à filtrer).

**Contenu**, à plat (pas d'onglets) :

- **Colonne gauche** (lecture seule) : Avatar (`profile_picture_id`), Nom (`last_name`), Prénom (`first_name`) ; en dessous : Email (`email`), Rôle (`role`), Statut (`status`), Pôle (`team_id`), Poste (`job_title`).
- **Colonne droite** :
    - **Thème favori** (`setting.theme`) : 3 boutons (Clair / Sombre / Système), sélection directe et immédiate sur la page (pas besoin d'ouvrir le tiroir ni de cliquer "Enregistrer" — appliqué tout de suite, cohérent avec le comportement global décrit en section 3.2 de `07_ux_composants_reutilisable.mdc`).
    - **Sécurité** : encart "Modifiez votre mot de passe de connexion" — Nouveau mot de passe, Confirmation, bouton "Modifier le mot de passe". Action **directe et indépendante** du tiroir "Modification profil" (appelle `updateUser` de Supabase Auth) ; ne touche pas `must_change_password` sauf dans le parcours de première connexion déjà décrit (`05_security_rls.mdc`).
- **Tiroir "Modification profil"** : Avatar (upload), Nom, Prénom, Email, Pôle (`team_id`, dropdown), Poste (`job_title`), Thème favori (mêmes 3 boutons que la page). Footer : Annuler / Enregistrer.