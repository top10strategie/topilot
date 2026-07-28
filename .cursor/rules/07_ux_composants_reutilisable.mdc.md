---
description: Composants transverses et structure directrice des pages du CRM TOPilot
globs:
alwaysApply: true
---
# Composants réutilisable - TOPilot

## 1. Structure générale d'une page

- **NavBar** :
    - Ordinateur : sidebar fixe à gauche + header fixe en haut, à droite de la sidebar.
    - Tablette : sidebar collapsible (`collapsible="icon"`) + header fixe.
    - Téléphone : nav cachée par défaut, ouverte en tiroir superposé à gauche via un bouton dans le header (toujours présent).
    - La NavBar et le Header sont fixe et ne bouge pas même avec un scroll
- **Main** (hors NavBar et Header) :
    - Ordinateur & tablette : répartition **verticale**, Hero (1/5) puis Contenu (4/5).
    - Téléphone : Hero et Contenu empilés en colonne, séparés par un trait fin et discret.
    - De façon global, la partie Main est scrollable sur l'axe vertical uniquement, sauf exception spécifiquement précisé.

Breakpoints : standards Tailwind (`sm`, `md`, `lg`, `xl`).

---

## 2. NavBar

> **Base technique** : `npx shadcn@latest add sidebar-04` sert de point de départ (primitives `Sidebar`, `SidebarProvider`, `SidebarTrigger`, gestion du `collapsible="icon"`), **adapté** à la structure ci-dessous — la disposition des groupes de menu, l'en-tête, l'item utilisateur et les breakpoints suivent la spec détaillée de cette section, pas la structure par défaut du block.

### 2.1 En-tête de la NavBar

- Logo + nom "TOPilot" en haut de la NavBar, au même niveau vertical que le Header.
- Clic sur ce duo → redirige vers la page d'accueil (`Home`).
- La page d'accueil est **le seul état où aucun item de menu n'est en surbrillance** dans la NavBar (aucun highlight actif).

### 2.2 Groupes de menus

**Groupe principal :**

|Menu|Icône Phosphor|
|---|---|
|Top10 Stratégie|logo de l'entreprise|
|Clients|`address-book-tabs`|
|Opportunités|`cardholder`|
|Missions|`circles-four`|
|Outils|`screwdriver`|
|Documents|`file`|
|Wikis|`book-open`|

**Séparateur** : ligne fine `Separator` de ShadCN, séparant visuellement le groupe principal du groupe secondaire.

**Groupe secondaire :**

|Menu|Icône Phosphor|
|---|---|
|Études et Analyses|`chart-donut`|
|Gestion Admin|`intersect`|

**Séparateur** : ligne fine `Separator` de ShadCN, séparant visuellement le groupe principal du groupe secondaire.

**Item utilisateur (bas de NavBar) :**

- Avatar ShadCN (photo de profil) + nom de l'utilisateur.
- Ouvre le menu utilisateur.

### 2.3 États des items de menu

- **Hover** : géré via les tokens/variables ShadCN déjà en place (pas de règle spécifique supplémentaire à documenter ici).
- **Sélectionné** : l'icône et le texte du menu adoptent ensemble la variant `default` ShadCN.

---

## 3. Header

- Contenu aligné à gauche :
    - bouton d'ouverture du tiroir de nav (tablette collapsée uniquement/ mobile tout le temps).
    - **Bouton "← Retour"** : présent dans le Header, mécanique reprise d'un autre projet (à fournir).
- Contenu aligné à droite, dans l'ordre :
    - icône de recherche globale
    - toggle dark/light
    - icône de déconnexion.

Au format téléphone, le contenu aligné à droite passe dans la barre de menu entre le "Groupe secondaire" et les "item utilisateur" au dessus de la ligne de séparation.

### 3.1 Recherche globale

- Icône Phosphor : `flashlight`.
- Ouvre une **modale de recherche** superposée à la page actuelle.
- Recherche sur **toutes les entités** du CRM (recherche globale, distincte de la recherche de filtre contextuel décrite en 5.4).
- Raccourci clavier prévu : '⌘K', non affiché à l'écran.

### 3.2 Toggle dark/light

- Icône unique qui change au clic, style "Setting" (variant `ghost`).
    - Dark mode actif → icône `star-and-crescent`.
    - Light mode actif → icône `sun`.

### 3.3 Déconnexion

- Icône `sign-out`. Clic → modale de confirmation (pas de déconnexion immédiate) :
    - Titre : "Déconnexion"
    - Texte : "Vous allez quitter TOPilot. Êtes-vous sûr de vouloir vous déconnecter ?"
    - Boutons : "Annuler" / "Déconnexion" (variant destructive-like mais couleur `--secondary`, cf. wireframe — pas la couleur `--destructive` habituelle des suppressions).

---

## 4. Hero

- **Ordinateur & tablette** : identification de l'entité à gauche, groupe de boutons d'action à droite.
- **Téléphone** : identification au-dessus du groupe de boutons d'action.

### 4.1 Identification de l'entité

- Page de menu (ex. "Clients") → reprend le titre du menu.
- Page issue d'une page de menu (ex. un client précis dans "Clients") → nom réel de l'entité (ex. nom du client), jamais son identifiant technique (id BDD).

### 4.2 Groupe de boutons d'action

- Un champ de recherche contextuel à la page actuelle (distinct de la recherche globale du Header — voir 3.1).
- Icône de présentation (switch de vue).
- Icône de filtre.
- Icône de gestion (ajout/modification) :
    - Sur une **page liste** → ouvre uniquement le tiroir de **création**.
    - Sur une **page d'entité unique** (ex. `/clients/id`, `/tools/id`) → ouvre uniquement le tiroir de **modification** de cette entité.

### 4.3 Modes de présentation disponibles

- Par défaut, toutes les listes disposent de 2 vues : **Cartes** et **Tableau**.
- Exception : **Opportunités** et **Missions** disposent en plus d'une vue **Kanban**.
- Sauf indication contraire dans la documentation d'une page, la vue **Cartes** est la vue par défaut à l'ouverture. Exception : **`/opportunities` et `/missions`** s'ouvre par défaut en vue **Kanban**.
- Garder en mémoire local la dernière présentation demandée par l'utilisateur afin que lorsqu'il revient sur la page en question, il soit présenter avec la même présentation

---

## 5. Contenu — Listes

### 5.1 Vue Cartes

- Nombre de colonnes :
    - Ordinateur :
        - 4 colonnes si carte avec image.
        - 3 colonnes si carte sans image.
    - Tablette : 2 colonnes.
    - Téléphone : 1 colonne.

### 5.2 Vue Tableau

- Ordinateur : page entière, pas de scroll horizontal **sauf en dessous du breakpoint `xl`** (ex. écran 13" ou moins), auquel cas un scroll horizontal apparaît avec un flou sur ~5% de la zone scrollable tant qu'il reste du contenu à découvrir.
- Tablette & téléphone : scroll horizontal avec le même effet de flou.
- **Tri des colonnes** : clic sur l'en-tête, cycle dans l'ordre suivant : descendant (chevron bas) → ascendant (chevron haut) → ordre original.

### 5.3 Pagination et filtrage des entités

- Pagination fixée à **25 entités par page** pour toutes les vues liste (Cartes, Tableau), à l'exception du Kanban qui a sa propre organisation.
- Les entités au statut **archivé** sont masquées par défaut des listes.
    - Elles peuvent réapparaître via le filtre "statut" en sélectionnant explicitement "archivé".
    - Pour les clients, les clients archivé sont ceux ayant `is_active = false` . Leur affichage peut être modifié dans les filtres.

### 5.4 Filtre (icône filtre du Hero)

- Ouvre une **modale** contenant des filtres par catégorie, spécifiques à l'entité affichée. Filtres spécifié dans la description des pages `ux_architecture` .

### 5.5 États de la liste

- **Aucune donnée** : message + invitation à créer une entité.
- **Chargement** : `skeleton` ShadCN adapté à la forme du contenu attendu. ( `npx shadcn@latest add skeleton`)

---

## 6. Contenu — Entité unique

Structure organisée en tabs (prenant toute la largeur de page), avec jusqu'à 4 catégories possibles d'informations, à moduler selon l'entité concernée (le détail par entité sera précisé dans la documentation de chaque page) :

- **Détails** : informations organisées en colonnes (2 colonnes desktop, 1 colonne tablette/mobile).
- **Liste** : informations organisées en tableau chronologique, ouvrant des tiroirs de consultation au clic (ex. missions, teams, catégories liées).
- **Documentation** : 3 colonnes (outils / documents / wiki). Clic sur un **outil** ou un **wiki** lié : ouvre un tiroir de consultation (comportement général, cf. section 7) — le clic sur un **document** n'est pas encore spécifié (à définir avec la page `/documents`).
- **Liste de cartes** : cartes résumant des informations basiques, ouvrant des tiroirs de consultation au clic (ex. collaborateurs).
    - Ordinateur : 4 colonnes. Tablette : 2 colonnes. Téléphone : 1 colonne (contenu simplifié en une seule colonne).

Pour une information simple (hors tabs), organisation en une seule colonne sur les formats de tablette et téléphone et en 2 colonnes pour l'écran desktop.

---

## 7. Tiroir (Sheet)

Composant : `npx shadcn@latest add sheet`

- **Ouverture** : à droite.
- **Dimensions** :
    - Ordinateur : hauteur écran, largeur 60%.
    - Tablette : hauteur écran, largeur 75%.
    - Téléphone : plein écran.
- **Trigger** : icône d'action (Phosphor Icon).
- **Header du tiroir** : titre de l'action (Ajout + nom de l'entité / Modification + nom de l'entité/ nom de l'entité seul en consultation).
- **Contenu** :
    - Ajout / Modification : formulaire de l'entité, organisé selon la même logique que la consultation.
    - Consultation : jusqu'à 3 catégories (Identification, Détails, Documentation).
- **Footer** :
    - Ajout / Modification : boutons "Annuler" et "Enregistrer"/"Créer".
    - Consultation d'une entité **avec page dédiée** : bouton unique "Aller à {l'entité}" (ex. "Aller à la mission"), qui redirige vers la page dédiée (ex. `/missions/[id]`) — remplace le couple Annuler/Enregistrer, aucun champ n'étant éditable dans ce mode.
    - Consultation d'une entité **sans page `[id]` mais avec une page liste dédiée** (ex. `wiki`, cf. `03_business_rules.mdc` — pas de `/wikis/[id]`, lecture/édition en tiroir depuis `/wikis`) : bouton unique "Aller à {les entités}" (ex. "Aller aux wikis"), qui redirige vers la page liste dédiée (ex. `/wikis`) — l'utilisateur y retrouve et ouvre lui-même le tiroir du wiki concerné, plutôt que d'empiler directement ce tiroir par-dessus celui en cours.
    - Consultation d'une entité **sans page ni page liste dédiée** (exceptions "drawer-only"/"Hover Card" en section 9.3, ex. Pôle/Collaborateur sur `/top10`) : bouton unique "Fermer".

### 7.1 Comportements spécifiques

- **Fermeture avec modifications non enregistrées** : perte silencieuse (aucune confirmation demandée).
- **Mécanique de tiroirs empilés** : un n-ième tiroir s'ouvre depuis le bouton d'ajout du formulaire du premier (certains boutons sont des icônes spécialisées par entité, cf. section 11.1 "Icônes fonctionnelles" ; ex. créer un nouveau client pendant la création d'une mission). En cas de fermeture du n-ième tiroir (y compris par échappement), le tiroir précédent reste ouvert et se voit rempli avec les informations saisies dans le n-ième, si elles sont concernées par un champ du précédent. Liste exhaustive des boutons d'ajout concernés par entité : voir la matrice dans `03_business_rules.mdc` section "Drawers empilés".
- **Confirmation** : toast de succès (Sonner) après "Enregistrer"/"Créer".
- **Erreurs de validation** : affichées **inline sous le champ concerné**. Un toast d'erreur est également affiché, **précisant l'emplacement de l'erreur** (non générique) — sauf pour le formulaire de connexion, dont le toast d'erreur reste générique.

---

## 8. Kanban

Composant : DnD kit

- Le composant global prend l'espace entier disponible à l'écran, avec scroll horizontal si la taille de l'écran est inférieur à la taille `l` et que les éléments dépasse l'espace aloué.
- Concerne les entités **Opportunités** et **Missions**.
- Nombre de colonnes moduler selon le champ `kanban_status` — toutes les valeurs de l'enum ont une colonne (aucune n'est omise, même si peu remplie).
- Colonnes à **largeur fixe** (valeur en `rem` à définir), non responsive.
- Style de colonne : fond = couleur de la carte, bordure = couleur Primary (light mode) / Secondary (night mode).
- Déplacement d'une carte : instantané et rapide, avec **mise à jour optimiste côté UI** puis synchronisation Supabase.
    - Déplacement vers une **autre colonne** : met à jour `kanban_status` (+ `kanban_order` pour la position dans la colonne d'arrivée).
    - Réorganisation **au sein de la même colonne** : met à jour uniquement `kanban_order` des cartes concernées (pas de changement de `kanban_status`).
    - En cas d'échec de la synchronisation : **rollback silencieux** de la carte à sa position d'origine + toast d'erreur.
- Titre de colonne : en haut à gauche, même couleur que la bordure de la colonne.
- Badge de comptage : en haut à droite de la colonne, affiché uniquement si le nombre de cartes est supérieur à zéro.
- Sur la page Opportunités uniquement : sous le titre/badge, affichage d'un total agrégé (`opportunity.price` moyen/`average_price`) en couleur Secondary (light mode) / Highlight (night mode).
- La carte utilisée dans le Kanban est une **variante du composant Carte** (section 9), adaptée aux informations de l'entité affichée (opportunité ou mission).

---

## 9. Cartes

### 9.1 Carte simple (une colonne)

- Titre
- Nom du client
- Informations importantes (variable selon l'entité — précisé dans la documentation de chaque page)
- Avatar + nom du collaborateur

### 9.2 Carte avec image (deux colonnes)

- Image
- Informations importantes (variable selon l'entité — précisé dans la documentation de chaque page)

### 9.3 Comportements communs

- **Survol** : ombre plus prononcée sur la carte.
- **Clic** :
    - Sur une **page de liste principale** (ex. `/clients`) : redirection vers la page dédiée de l'entité (ex. `/clients/id`).
    - Dans un **tab d'une fiche entité** affichant des cartes liées (ex. tab "missions" dans `/clients/id`) : ouverture d'un **tiroir de consultation** de l'entité liée (permet de "feuilleter" les entités liées sans quitter la page). Le tiroir contient un lien vers la page dédiée de l'entité (ex. depuis un tiroir mission, lien vers `/missions/id`).
    - **Exception "drawer-only"** : certaines entités n'ont pas de page dédiée dans l'arborescence (ex. `team`/Pôle, `collaborator` consultés depuis `/top10`). Leur tiroir de consultation ne contient donc aucun lien vers une page dédiée.
    - **Exception "Hover Card"** : `contact_client` n'a ni page dédiée ni tiroir de consultation. Partout où un contact apparaît dans une liste (ex. tab "Contacts" d'une fiche client/opportunité, tiroir de création client), il est consultable via un composant **Hover Card** ShadCN (`npx shadcn@latest add hover-card`) au survol/clic, affichant ses informations directement sans navigation ni ouverture de tiroir.
    - **Champ de relation simple (FK unique, hors liste)** : un champ qui référence une seule entité liée (ex. "Client" ou "Opportunité liée" sur la fiche mission) est affiché, en lecture, comme un champ cliquable de type "Accès à {l'entité}" plutôt qu'un simple texte. Le clic ouvre le même **tiroir de consultation** que pour un item de liste (contenu = tiroir d'édition de l'entité en lecture seule, footer "Aller à {l'entité}"). Si le champ est vide (relation non renseignée), il n'est pas cliquable.
- Badge de statut sur la carte : à préciser dans la documentation de chaque page.

---

## 10. Modale de confirmation de suppression

Composant : `Dialog` ShadCN (pas de variant destructive natif dans ce composant → application manuelle de la couleur `destructive` du thème).

- **Déclenchement** : systématique avant toute suppression, aucune suppression sans confirmation manuelle.
- **Position** : centrée au milieu de l'écran.
- **Style** : bordure et titre en couleur `destructive` (`#E71728`).
- **Contenu** :
    - Titre / texte d'avertissement : _"Vous souhaitez supprimer {nom de l'entité}. Confirmez-vous ?"_
    - Nom de l'entité concernée affiché explicitement dans le message.
- **Boutons** : "Annuler" / "Supprimer".

---

## 11. Icônes d'action

Composant : icônes **Phosphor Icons**, dans un `Button` ShadCN.

|Rôle|Variant `Button` ShadCN|
|---|---|
|Basique|`outline`|
|Spécial|`default`|
|Attention|`destructive`|
|Setting|`ghost`|

Toute la gestion des couleurs, tailles, états hover/disabled est déléguée aux **variables/tokens ShadCN** du thème (plus de règles ad hoc à maintenir séparément).

### 11.1 Icônes fonctionnelles

| Action                                            | Icône Phosphor       |
| ------------------------------------------------- | -------------------- |
| Ajout contact/client/collaborateur/team           | `user-plus`          |
| Ajout mission                                     | `circles-three-plus` |
| Ajout opportunité                                 | `plus-circle`        |
| Ajout catégorie                                   | `folder-simple-plus` |
| Ajout defaut                                      | `stack-plus`         |
| Modification / Édition                            | `pencil-simple`      |
| Suppression                                       | `trash`              |
| Tableau (page liste)                              | `rows`               |
| Carte (page liste)                                | `cards`              |
| Kanban (page liste)                               | `kanban`             |
| Filtres                                           | `sliders`            |
| Manager (page Top10 onglet "pôles")               | `star`               |
| Gestion contact                                   | `gear-six`           |
| Indicateur accès privé (`tool_access.is_private`) | `lock-simple`        |
| Contact principal                                 | `push-pin`           |

### 11.2 Icônes Header

|Élément|Icône Phosphor|
|---|---|
|Recherche|`flashlight`|
|Dark mode actif|`star-and-crescent`|
|Light mode actif|`sun`|
|Déconnexion|`sign-out`|

---

## 12. Couleurs

Les couleurs sont gérées directement via les variables du thème ShadCN configurées dans le projet.

---

## 13. Typographie, espacement, transitions

- **Typographie, Espacement (padding) et Border-radius** : gérer par les variables ShadCN
- **Transitions au changement de page** : composant **Skeleton** (`npx shadcn@latest add skeleton`) affiché un minimum de 2 secondes, prolongé si le chargement des données le nécessite. Aucune immobilisation de la page, du tiroir, ou de tout autre élément dans l'attente des données.
- **Notifications système (toasts)** : composant **Sonner** (ShadCN), utilisé pour les confirmations, erreurs, et confirmations de suppression.

---

## 14. Contraintes générales du projet

- **Langue** : Français uniquement (outil interne à l'entreprise, pas d'internationalisation prévue).
- **Accessibilité** : conformité aux règles **RGAA** (Référentiel Général d'Amélioration de l'Accessibilité).