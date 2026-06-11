# Roadmap / À faire

Backlog des évolutions souhaitées (noté le 2026-06-11), dans l'ordre donné. À prioriser plus tard.

## 1. Rendre les sources visibles dans l'app
Montrer d'où viennent les connaissances (provenance), idéalement une section/onglet **Sources** dans « Savoir ».
- **Déjà en place** : table `source` (9 sources) + endpoint `GET /api/knowledge/sources` + `docs/SOURCES.md`. Les principes affichent déjà leurs sources en bas de carte.
- **Reste à faire** : une vue « Sources » dédiée (titre, auteurs, année, type, lien) dans l'onglet Savoir ; éventuellement un lien depuis chaque exercice vers sa source d'origine (free-exercise-db).

## 2. Relecture des traductions
Vérifier la justesse des 835 traductions auto (Sonnet) : contresens, phrases bizarres, faux-amis.
- **Approche** : passe de relecture (agents adversariaux par lots, ou ciblée) comparant FR ↔ EN d'origine ; corriger dans `data/exercises_translations.json` puis `npm run db:seed`.
- L'anglais d'origine reste en base (`instructions_en`) → comparaison facile.

## 3. Ajouter les images
Afficher les images d'exécution des exercices.
- **Source** : free-exercise-db (domaine public). Chemins déjà stockés dans `exercise.images` ; base URL `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<chemin>`.
- **Reste à faire** : script de téléchargement → héberger en local (ou pointer l'URL upstream) ; afficher dans la fiche (souvent 2 images : départ / arrivée).

## 4. Exercices par profil (homme / femme / mixte)
Rechercher quels exercices sont plutôt orientés homme, femme ou mixtes ; permettre d'indiquer son sexe et filtrer l'affichage en conséquence.
- **Données** : ajouter une dimension `audience` (male / female / mixed) par exercice (nouveau champ + sourcing/recherche).
- **Préférence** : mémoriser le sexe choisi (localStorage pour une app perso) et filtrer/ordonner les exercices.
- **Note honnête** : physiologiquement, la quasi-totalité des exercices sont universels. La distinction reflète surtout des **tendances d'usage/objectifs** (ex. fessiers/hanches très demandés côté féminin) plutôt que des règles strictes — à cadrer pour ne pas enfermer (toujours garder un « tout afficher »).

## 5. Favoris
Mettre des exercices en favori.
- **Option simple (app perso)** : localStorage (liste d'ids) — zéro backend, marche hors-ligne.
- **Option « connecté »** : table `favorite` + identité utilisateur (si multi-appareils un jour).
- **UI** : bouton ❤ sur la carte et la fiche + un filtre/onglet « Favoris ».

## 6. Schéma corporel des muscles travaillés
Sur la fiche exercice (et/ou muscle), afficher un **corps** avec les muscles travaillés **en rouge** (primaires foncés, secondaires plus clairs).
- **Besoin** : un SVG anatomique (face avant + arrière) dont les zones sont identifiées par nos `muscle.id` (chest, lats, quadriceps…), pour les colorer dynamiquement.
- **Reste à faire** : trouver/produire un SVG « muscle map » libre de droits, le mapper sur nos 17 muscles.

## 7. Programmes
Étendre les splits (onglet Savoir) en **programmes** complets : thèmes, niveaux de difficulté, etc. — **spec à compléter** (note de l'utilisateur).
- **Base existante** : tables `split` + `split_day`. À enrichir : objectif, durée de cycle, séances détaillées (avec exercices), progression.
- À préciser ensemble avant implémentation.
