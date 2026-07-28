---
description: Charte graphique, arborescence des pages et fichiers de style.
globs: '"**/*.tsx", "**/*.css", "app/**"'
alwaysApply: true
---
# UI & Design — TOPilot

---

## Charte graphique — source de vérité

Les variables de thème (couleurs, radius, ombres, polices) sont définies dans `app/globals.css` : c'est la seule source de vérité pour les tokens de thème.

### Règles d'application

- Style général : **professionnel et amical** — couleurs vives mais jamais agressives, espacement généreux, typographie lisible.
- **Toujours respecter le code couleur de ShadCN dans tous les composants UI** — y compris les composants générés automatiquement. Ne jamais coder une couleur en dur (hex/rgb) hors des exceptions explicitement listées ci-dessous (le code couleur date de fin).
- Une **mission interne** est toujours distinguée visuellement par un badge coloré avec la couleur `--secondary` dans toutes les listes et fiches.

---

## Code couleur unifié — date de fin (mission et opportunity + tool occasionnellement si nécessaire)

Même règle appliquée aux cartes mission et aux cartes/lignes d'opportunité, basée sur `end_at` comparé à aujourd'hui :

|Couleur|Condition|
|---|---|
|`--destructive`|En retard (`end_at` < aujourd'hui)|
|`#EB9449`|Échéance aujourd'hui|
|`#EAF081`|Échéance dans ≤ 3 jours|
|`--secondary`|Autre, actif|
|`--muted-foreground`|Statut `terminee` ou `archivee`|

Cette règle est mutualisée via un composant ou utilitaire Tailwind unique, utilisé partout où une date de fin est affichée.