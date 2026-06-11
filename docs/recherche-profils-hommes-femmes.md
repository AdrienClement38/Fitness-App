# Musculation hommes vs femmes — recherche sourcée pour un filtre « profil » non-enfermant

> Document de recherche préparatoire à une fonctionnalité où l'utilisateur indique
> son sexe et voit des exercices « adaptés ». Objectif : décider **quoi** filtrer,
> sur des bases factuelles, sans reconduire des stéréotypes.
> Rédigé le 2026-06-11. Niveaux de preuve signalés comme dans
> [`SOURCES.md`](./SOURCES.md) : **fort** / **modéré** / **consensus**.

## Synthèse (à lire en premier)

La quasi-totalité des **exercices** sont universels : un muscle ne « sait » pas s'il
appartient à un homme ou à une femme, et à programme identique les **gains relatifs
d'hypertrophie et de force du bas du corps sont équivalents** entre sexes (preuve
forte, méta-analyse). Les vraies différences physiologiques existent (les femmes ont
un peu plus de fibres de type I, fatiguent moins sur des séries multiples et
récupèrent plus vite entre les séries ; les hommes ont ~15-20× plus de testostérone
d'où une force/puissance absolue supérieure surtout en haut du corps) mais elles se
traduisent par des nuances d'**emphase et de programmation** (volume, fréquence,
fourchettes de reps, repos), **pas** par des catalogues d'exercices distincts. Le
fitness « genré » (femmes → fessiers/bas du corps, hommes → haut du corps) relève
massivement de la **préférence et de la culture**, pas d'une prescription
biologique. **Recommandation : ne pas modéliser une dimension « audience
homme/femme/mixte » sur les exercices ; filtrer par OBJECTIF** (force, hypertrophie,
fessiers, haut du corps…), le sexe ne servant qu'à des réglages fins optionnels et à
des défauts suggérés — jamais à masquer ou « rosir » des exercices.

---

## 1. Différences physiologiques réellement pertinentes pour l'entraînement

### 1.1 Répartition des types de fibres — différence réelle mais **modérée** *(preuve forte)*

Méta-analyse de Nuzzo (2024) et revue systématique associée (James 2025) sur les
biopsies musculaires humaines :

- Les femmes ont une **aire proportionnelle de fibres de type I plus élevée**
  (~51,8 % vs 44,9 % chez l'homme) et les hommes une aire de type II plus élevée
  (~55,0 % vs 47,9 %). Taille d'effet **moyenne** (d ≈ 0,57-0,60), pas énorme.
- C'est **dépendant de la région** : l'écart est net sur le tronc/dos et les jambes,
  **mais pas sur le bras/épaule**.
- L'écart en *distribution du nombre* de fibres s'atténue avec l'âge (net chez le
  jeune adulte, quasi disparu en milieu de vie), alors que l'écart en *aire* persiste
  car il est tiré par la plus grande section transversale (CSA) des fibres masculines.
- Le niveau d'activité physique **ne modifie pas** cet écart : c'est une différence
  biologique de fond.

> **Lecture pour l'app** : assez réel pour expliquer pourquoi les femmes tolèrent
> bien un peu plus de reps/volume, trop modéré et trop régional pour justifier des
> *exercices* différents.

### 1.2 Résistance à la fatigue et récupération entre séries — avantage féminin réel mais **circonscrit** *(preuve modérée)*

Étude PeerJ 2025 (effets du sexe biologique sur fatigue et récupération) +
synthèses ACE/ACSM :

- **Sur une série unique à 75 % 1RM : aucune différence** (femmes 9,0 ± 2,0 reps ;
  hommes 8,6 ± 1,7 ; p = 0,46).
- **Sur un protocole multi-séries : différence forte** — les femmes ont fait presque
  deux fois plus de reps totales (58,3 ± 27,3 vs 29,6 ± 10,6 ; p = 0,0001).
- L'avantage vient surtout de la **récupération inter-séries** (regain de vitesse
  entre la rep la plus lente d'une série et la plus rapide de la suivante :
  0,146 vs 0,123 m/s ; p = 0,0001), pas d'une fatigue moindre *pendant* la série.
- Mécanismes proposés : lactate post-effort plus bas chez les femmes (moindre
  glycolyse anaérobie), plus de fibres I, moindre occlusion artérielle (muscles plus
  petits), effet protecteur estrogénique (controversé chez l'humain).
- **Nuance capitale** : la **récupération après une séance complète** (courbatures,
  1RM prédit sur 72 h) est **similaire** entre sexes, malgré un volume relatif plus
  élevé réalisé par les femmes.

> **Lecture pour l'app** : justifie des **réglages** (repos un peu plus court
> tolérable, plus de séries « payantes » par séance) — pas un programme à part.
> Attention : l'idée souvent relayée (ex. ACE) selon laquelle « les hommes ont besoin
> de 25-50 % de repos en plus » est une **extrapolation de coach**, pas une règle
> dure ; les revues rigoureuses recommandent d'**individualiser**.

### 1.3 Force relative haut vs bas du corps — l'écart est surtout **en haut** *(preuve forte/modérée)*

- En **absolu**, les femmes développent ~50-60 % de la force du haut du corps des
  hommes et ~60-70 % du bas (revue « Evolution of resistance training in women »,
  2025 ; études universitaires sur composition corporelle).
- Une grande partie s'explique par la **masse maigre** et sa répartition (moins de
  muscle relatif en haut du corps chez la femme), pas par une qualité musculaire
  différente : à section égale, la force par unité de muscle est comparable.
- **Point contre-intuitif et important** : en réponse à l'entraînement, les femmes
  **non entraînées progressent davantage en force *relative* du haut du corps** que
  les hommes (voir §1.4). L'écart de départ n'est donc pas une fatalité d'adaptation.

### 1.4 Réponse à l'entraînement — **égale** pour l'essentiel *(preuve forte)*

Méta-analyse de référence Roberts, Nuckols & Krieger (JSCR 2020), à programme
identique :

| Mesure | Résultat hommes vs femmes | Taille d'effet | Interprétation |
|---|---|---|---|
| **Hypertrophie** (12 effets / 10 études) | **Aucune différence** | ES = 0,07 (p = 0,31) | Croissance musculaire **identique** |
| **Force bas du corps** (23 effets / 23 études) | **Aucune différence** | ES = −0,21 (p = 0,20) | Gains équivalents |
| **Force haut du corps** (19 effets / 17 études) | **Avantage femmes** (débutantes) | ES = −0,60 (p = 0,002) | Plus grande marge de progression relative initiale |

Confirmé par une étude contrôlée (Sci Rep / Nature 2021) : « **aucune différence de
sexe** dans les adaptations morphologiques, fonctionnelles et contractiles, ni en
haut ni en bas du corps » une fois ajusté sur les valeurs de départ.

### 1.5 Hormones — la vraie grande différence, surtout sur le plafond absolu *(preuve forte)*

- **Testostérone** : ~15-20× plus élevée chez l'homme adulte ; « probablement le plus
  gros contributeur unique » à l'écart de force/puissance **absolue** (revue 2025).
  C'est ce qui plafonne la masse maximale atteignable, pas ce qui change le *type*
  d'exercice utile.
- **Estrogène** : aide au maintien de la masse et protège des dommages musculaires,
  mais **effet anabolique très inférieur** à la testostérone.
- Signalisation **mTOR** (synthèse protéique) : phosphorylation **similaire** entre
  sexes après l'effort → la « machinerie » de croissance est la même.
- C'est aussi la base du démontage du mythe « soulever lourd rend les femmes
  volumineuses » : sans testostérone élevée + surplus calorique + années d'entraînement
  spécifique, l'« bulk » involontaire n'arrive pas.

### 1.6 Cycle menstruel et programmation — **pas de preuve** d'effet fiable *(preuve modérée, qualité faible des études primaires)*

Revue-parapluie (umbrella review, niveau de preuve le plus élevé ; Frontiers 2023) :

- **Aucune influence démontrée** de la phase du cycle sur la performance de force
  aiguë ni sur les adaptations à l'entraînement de résistance.
- Méta-analyse McNulty : tailles d'effet **triviales** (plus grand écart 0,14,
  négligeable).
- Les auteurs jugent **prématuré** de périodiser l'entraînement selon le cycle ; ils
  recommandent d'**individualiser** (le cycle n'est qu'un facteur parmi sommeil,
  nutrition, stress, symptômes).
- Réserve honnête : la littérature primaire est de **qualité faible/inconstante**
  (vérification des phases peu rigoureuse). Les symptômes vécus *peuvent* compter
  pour certaines femmes au cas par cas — ce qui plaide pour du **ressenti
  utilisateur** (journal/autorégulation), pas pour un algorithme imposé.

---

## 2. Exercices différents, ou différence d'emphase / programmation ?

**Verdict : différence d'emphase et de programmation, pas d'exercices.** Convergence
de toutes les sources de qualité (méta-analyse Roberts 2020 ; revue 2025 ; Stronger
by Science ; StrengthLog ; ACE) :

- **Ce qui ne change pas** : la sélection d'exercices. Squat, soulevé de terre,
  développé couché, tractions, hip thrust… sont les meilleurs mouvements *pour tout
  le monde*. « Le règlement est identique à ~90 % ; le 10 % restant, ce sont des
  réglages, pas d'autres exercices. »
- **Ce qui peut s'ajuster** (variables de programmation) : volume hebdomadaire,
  fréquence, fourchettes de reps, intensité relative, temps de repos — exactement les
  leviers déjà documentés dans [`SOURCES.md`](./SOURCES.md) (Schoenfeld, Grgic, ACSM).
- Les ajustements pertinents par le sexe sont **secondaires et optionnels** :
  tolérance possible à un peu plus de reps/volume et à un repos légèrement plus court
  côté femmes ; éventuelle emphase haut-du-corps pour combler l'écart de départ ;
  travail du plancher pelvien et prévention LCA cités comme considérations utiles
  (revue 2025) — mais ce sont des **options de coaching**, pas des filtres
  d'exercices.

---

## 3. Universalité des exercices — où sont les vraies nuances ?

Les exercices sont **universels**. Les seules nuances réelles, toutes mineures :

1. **Activation EMG à effort égal** légèrement plus basse chez les femmes sur
   certains mouvements — sans conséquence sur les adaptations finales (force/CSA
   comparables après plusieurs mois).
2. **Anthropométrie individuelle** (longueurs de segments, largeur de bassin, mobilité)
   influence le *réglage* d'un exercice (stance, prise, amplitude) — **inter-individuel
   bien plus que strictement « sexe »**.
3. **Différences moyennes de répartition de force** (haut vs bas) → on peut *suggérer*
   un peu plus de volume haut-du-corps aux débutantes, mais l'exercice reste le même.
4. **Contexte spécifique** (grossesse, post-partum, plancher pelvien, prévention LCA) :
   vraies considérations cliniques **féminines**, mais qui relèvent d'un module santé
   dédié et d'un avis professionnel — pas d'un filtre « exercices pour femmes ».

Il n'existe **aucun exercice de musculation classique qui serait réservé à un sexe**
pour des raisons physiologiques.

---

## 4. Fitness « genré » : préférence/culture vs science

- **Constat de préférence (réel, mesuré)** : en pratique, les femmes consacrent plus
  de temps aux fessiers/jambes et au chaînon postérieur, les hommes au haut du corps.
  Des données d'usage d'apps le confirment.
- **Mais c'est un choix, pas une nécessité biologique** : StrengthLog l'explicite —
  ces programmes décrivent « ce que vous *pourriez vouloir* faire, pas ce que vous
  *devez* faire ». Rien dans la physiologie n'impose à une femme de prioriser les
  fessiers ni à un homme de négliger les jambes.
- **Origines culturelles** (recherche sociologique sur le gym) : gyms historiquement
  masculins, force associée à la masculinité, idéaux corporels genrés (silhouette
  « sablier » hanches/fessiers pour les femmes vs « V » épaules/torse pour les hommes).
  Ces idéaux esthétiques, et non la biologie, expliquent l'essentiel de l'emphase
  « genrée ».
- **Conséquence éthique** : encoder « femme → fessiers / homme → haut du corps » dans
  l'app, ce serait **cristalliser un stéréotype culturel en règle pseudo-scientifique**.

---

## 5. Pièges éthiques / UX à éviter + bonnes pratiques

### Pièges (documentés dans la littérature design & fitness)

- **« Shrink it and pink it »** : décliner une version « féminine » plus light/rose au
  lieu de répondre à un vrai besoin → signale que la norme est masculine et que la
  femme en est l'exception. Contre-productif et infantilisant.
- **Réduire la femme à l'esthétique** (« plus petite taille, cuisses plus galbées »)
  sans jamais demander son **objectif réel**.
- **Exclusion par défaut** : masquer des exercices « lourds » ou polyarticulaires aux
  femmes entretiendrait le mythe du « bulk » et les priverait des mouvements les plus
  efficaces.
- **Binarité rigide** : un menu sexe obligatoire homme/femme exclut intersexes, trans,
  non-binaires, et tout utilisateur qui veut juste s'entraîner sans se catégoriser.
- **Stéréotype inversé** : enfermer aussi les hommes (« pas de mobilité, pas de
  fessiers pour toi ») est un piège symétrique.

### Bonnes pratiques pour un filtre « profil » non-enfermant

1. **Filtrer par OBJECTIF, pas par sexe** (cf. §6).
2. **Sexe = optionnel**, jamais bloquant ; proposer aussi « préfère ne pas préciser ».
3. Si le sexe est renseigné, l'utiliser **uniquement** pour : (a) pré-cocher des
   *défauts* suggérés et modifiables (ex. calculs de charge indicatifs, repères de
   programmation), (b) débloquer un **module santé optionnel** (cycle, grossesse/
   post-partum, plancher pelvien) — **jamais** pour retirer des exercices du catalogue.
4. **Tout reste accessible** : aucun exercice n'est caché en fonction du sexe ; au pire
   on **réordonne/suggère**, on ne **restreint** pas.
5. **Langage neutre et factuel**, centré performance/santé, pas esthétique genrée.
6. **Transparence** : afficher la source et le niveau de preuve (déjà la philosophie du
   projet), et dire explicitement que « la différence est surtout une question
   d'objectifs, pas de biologie ».
7. **Autorégulation > algorithme** pour le cycle : offrir un journal de ressenti
   facultatif plutôt qu'une périodisation imposée non étayée.

---

## 6. Recommandation d'implémentation pour l'app

**Modéliser une dimension « objectif », PAS une dimension « audience homme/femme/mixte ».**

### Pourquoi

- C'est ce que dit la science : exercices universels, différences = emphase/objectif.
- C'est **honnête** : un filtre « objectif » ne ment pas sur une prétendue biologie
  des exercices.
- C'est **inclusif** : un homme peut viser « fessiers/force », une femme « haut du
  corps/puissance », sans friction ni catégorisation.
- C'est **cohérent avec l'architecture existante** : le projet rattache déjà chaque
  exercice à des muscles, équipements et principes sourcés — un champ/relation
  `goal` (objectif) s'y greffe naturellement, contrairement à un attribut « sexe » sur
  l'exercice qui n'aurait aucun fondement.

### Modèle de données suggéré

- **Sur l'exercice** : **ne RIEN ajouter** qui soit « genré ». Conserver muscles
  ciblés, équipement, pattern de mouvement. (Un exercice n'a pas de sexe.)
- **Filtre principal = OBJECTIF** : `force` · `hypertrophie` · `puissance` ·
  `endurance musculaire` · + objectifs par région/muscle (`fessiers`, `haut du
  corps`, `dos`, `jambes`, `tronc`…). Dérivable des données muscle/principe déjà
  présentes.
- **Profil utilisateur (optionnel, pour réglages, pas pour filtrer)** : `sexe?`
  (incl. « non précisé »), `niveau`, `objectif principal`, `matériel dispo`. Le sexe
  alimente au plus des **valeurs par défaut** (repères de charge/volume indicatifs) et
  l'accès au **module santé**.
- **Module santé optionnel** (féminin spécifiquement) : cycle (journal d'autorégulation,
  pas de périodisation imposée), grossesse/post-partum, plancher pelvien — clairement
  séparé, activable, sourcé, avec renvoi à un professionnel.

### Ce qu'il NE faut PAS faire

- Pas de catalogue « exercices femmes » / « exercices hommes ».
- Pas de masquage d'exercices selon le sexe.
- Pas de programme « rose » par défaut ni d'orientation esthétique genrée imposée.
- Pas de menu sexe **obligatoire** comme préalable à l'usage de l'app.

### Formulation produit honnête (à afficher)

> « Les exercices sont les mêmes pour tout le monde. Ce qui change, c'est ton
> **objectif** et la façon de **programmer** (séries, reps, repos). Indique ton sexe
> seulement si tu veux des repères de charge plus précis et un module santé adapté —
> c'est facultatif et ça ne masque aucun exercice. »

---

## Sources

Niveau de preuve indiqué comme dans [`SOURCES.md`](./SOURCES.md).

### Méta-analyses & revues systématiques (preuve forte)

- Roberts BM, Nuckols G, Krieger JW (2020). *Sex Differences in Resistance Training:
  A Systematic Review and Meta-Analysis.* J Strength Cond Res 34(5):1448-1460.
  https://pubmed.ncbi.nlm.nih.gov/32218059/ ·
  https://journals.lww.com/nsca-jscr/fulltext/2020/05000/sex_differences_in_resistance_training__a.30.aspx
- Nuzzo JL (2024). *Sex differences in skeletal muscle fiber types: A meta-analysis.*
  Clinical Anatomy. https://onlinelibrary.wiley.com/doi/10.1002/ca.24091
- James R et al. (2025). *Sex differences in human skeletal muscle fiber types and the
  influence of age, physical activity, and muscle group: a systematic review and
  meta-analysis.* Physiological Reports.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12580412/ ·
  https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70616
- *Current evidence shows no influence of women's menstrual cycle phase on acute
  strength performance or adaptations to resistance exercise training* (umbrella
  review, Frontiers in Sports and Active Living, 2023).
  https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1054542/full ·
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10076834/

### Études primaires (preuve modérée)

- *The effects of biological sex on fatigue during and recovery from resistance
  exercise* (PeerJ, 2025). https://peerj.com/articles/20542/ ·
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12790778/
- *Resistance training induces similar adaptations of upper and lower-body muscles
  between sexes* (Scientific Reports / Nature, 2021).
  https://www.nature.com/articles/s41598-021-02867-y ·
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8648816/
- *Sex-Based Differences in Skeletal Muscle Kinetics and Fiber-Type Composition*
  (American Physiological Society / Physiology, 2015).
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4285578/

### Revues & positions institutionnelles / de référence (preuve modérée à consensus)

- *Evolution of resistance training in women: History and mechanisms for health and
  performance* (revue, 2025). https://pmc.ncbi.nlm.nih.gov/articles/PMC12421175/
- NSCA — Position stand historique sur femmes et entraînement de résistance (1989),
  contexte rappelé dans la revue 2025 ci-dessus.
- ACE / ACSM — *Battle of the Sexes: Should Training Guidelines for Men and Women Be
  the Same?* (ProSource, 2016). À lire avec recul : certaines recommandations de repos
  (25-50 % de plus pour les hommes) sont des extrapolations de coach, à individualiser.
  https://www.acefitness.org/continuing-education/prosource/june-2016/5926/battle-of-the-sexes-should-training-guidelines-for-men-and-women-be-the-same/

### Praticiens reconnus, evidence-based (consensus)

- Stronger by Science — *Strength Training for Women: Setting the Record Straight.*
  https://www.strongerbyscience.com/strength-training-women/
- StrengthLog — *Strength Training for Women (2025): Benefits, Programs & Myths.*
  https://www.strengthlog.com/strength-training-for-women/

### Sciences sociales / design (pour les pièges éthiques & UX)

- *Shrink It and Pink It: Gender Bias in Product Design* — Harvard ALI Social Impact
  Review.
  https://www.sir.advancedleadership.harvard.edu/articles/shrink-it-and-pink-it-gender-bias-product-design
- K. Aleisha Fetters — *Pink It and Shrink It: The Problem with Women's Fitness.*
  https://www.kaleishafetters.com/pink-it-and-shrink-it/
- *Should we be offering gender-specific training?* — Health Club Management.
  https://www.healthclubmanagement.co.uk/health-club-management-features/Talking-point-Gender-specific-training/33262
- *« You can call me monster thighs »: Exploring women's body image in gym culture
  through photo-elicitation* (ScienceDirect, 2026).
  https://www.sciencedirect.com/science/article/pii/S1469029226000361

---

## Avertissement

Informations à but **éducatif**, ne remplaçant pas l'avis d'un médecin ou d'un coach
qualifié — en particulier pour les contextes cliniques spécifiques (grossesse,
post-partum, plancher pelvien, blessure). Les données chiffrées proviennent des
sources listées ; les écarts moyens entre sexes sont des **tendances de groupe** et ne
prédisent pas l'individu, dont la variabilité dépasse souvent l'écart homme/femme.
