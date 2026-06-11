# Sources & méthodologie

Toutes les données chiffrées et les principes de la bibliothèque sont rattachés à
une source identifiable (table `source`, liée aux principes via `principle_source`
et à chaque exercice via `exercise.source_dataset`).

## Hiérarchie de confiance

1. **Méta-analyses & revues systématiques** (preuve la plus forte) — Schoenfeld, Grgic…
2. **Recommandations institutionnelles** — ACSM (position stand officiel).
3. **Ouvrages de référence** — NSCA.
4. **Consensus de coachs** — Renaissance Periodization (repères de volume :
   valeurs *indicatives* à individualiser, signalées comme telles).
5. **Dataset open source** — free-exercise-db (ossature factuelle des exercices).

Le champ `evidence` des principes reflète ce niveau (`strong` / `moderate` /
`consensus`).

## Liste des sources

| id | Référence | Type | Sert à |
|---|---|---|---|
| `free-exercise-db` | free-exercise-db — yuhonas, données originales de Ollie Jennings (`exercises.json`). **The Unlicense (domaine public)**. | dataset | Ossature des 873 exercices |
| `schoenfeld-2017-volume` | Schoenfeld, Ogborn, Krieger (2017). *Dose-response relationship between weekly resistance training volume and increases in muscle mass.* J Sports Sci. | méta-analyse | Volume (10+ séries/muscle/sem) |
| `schoenfeld-2016-frequency` | Schoenfeld, Ogborn, Krieger (2016). *Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy.* Sports Med 46:1689-1697. | méta-analyse | Fréquence (2×/sem) |
| `schoenfeld-2021-loading` | Schoenfeld, Grgic, Van Every, Plotkin (2021). *Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance.* Sports 9(2):32. | revue | Continuum de charge / reps |
| `grgic-2018-rest-strength` | Grgic, Schoenfeld et al. (2018). *Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength.* Sports Med. | revue systématique | Temps de repos |
| `helms-2016-rir` | Helms, Cronin, Storey, Zourdos (2016). *Application of the RIR-Based RPE Scale for Resistance Training.* Strength Cond J. | méthodologie | Effort / proximité de l'échec (RIR/RPE) |
| `acsm-2009-progression` | ACSM (2009). *Progression Models in Resistance Training for Healthy Adults.* Med Sci Sports Exerc 41(3):687-708. DOI 10.1249/MSS.0b013e3181915670. | recommandation | Surcharge progressive, ordre des exercices |
| `rp-volume-landmarks` | Renaissance Periodization (Israetel et al.). *Training Volume Landmarks for Muscle Growth* (MV/MEV/MAV/MRV). | coach | Repères de volume par muscle |
| `nsca-essentials` | Haff & Triplett (éd., 2016). *Essentials of Strength Training and Conditioning*, 4e éd., NSCA. | ouvrage | Technique, programmation, physiologie |

URLs complètes dans [`data/sources.json`](../data/sources.json).

## Synthèse des faits chiffrés retenus

- **Volume** : relation dose-réponse ; ~10+ séries dures par muscle et par semaine
  > 5–9 > <5 (Schoenfeld 2017). Fourchette pratique 10–20.
- **Fréquence** : à volume égal, 2 séances/muscle/semaine ≥ 1 (Schoenfeld 2016).
- **Charge** : hypertrophie possible de ~6 à 30+ reps si proche de l'échec ; force
  spécifique aux charges lourdes ≥80 % 1RM (Schoenfeld 2021 ; ACSM 2009).
- **Effort** : 1–3 répétitions en réserve (RIR) sur la majorité des séries
  (Helms 2016).
- **Repos** : 2–3 min sur les gros polyarticulaires, 60–90 s en isolation ;
  ≥2–3 min pour la force (Grgic 2018).
- **Récupération** : ~48 h par muscle, sommeil 7–9 h, protéines ~1,6–2,2 g/kg/j
  (consensus).

## Méthodologie de contrôle qualité

1. Données éditées en JSON, chargées en base par un **seed TypeScript** (Drizzle,
   `server/db/seed.ts`) — requêtes préparées, aucune corruption de texte.
2. **Validation au seed** : énums légaux, intégrité référentielle, bornes
   numériques, provenance obligatoire. Toute anomalie **stoppe** le seed.
3. **Mapping explicite** du vocabulaire du dataset (équipement, muscles) vers les
   référentiels FR — aucun terme silencieusement ignoré.
4. **Nulls préservés** : un champ inconnu dans la source reste `NULL`.
5. **Vérifié en base** (PGlite local, strictement identique à PostgreSQL) :
   comptes, liens orphelins (0), jointures et rendu de l'app.

## Avertissement

Ces informations sont fournies à but **éducatif**. Elles ne remplacent pas l'avis
d'un médecin ou d'un coach qualifié, en particulier en cas de blessure, de
pathologie ou pour les débutants sur les mouvements techniques (soulevé de terre,
squat, good morning…).
