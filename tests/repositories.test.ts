/**
 * Tests des repositories (couche d'accès données). Ils verrouillent les contrats
 * : filtres, recherche, jointures FR, pagination, intégrité des relations.
 * Données = fixtures contrôlées chargées dans un PGlite de test isolé.
 */
import {beforeAll, describe, expect, it} from 'vitest';
import {db, migrateDb, schema} from '../server/db/client';
import {getExerciseById, getFacets, listExercises} from '../server/repositories/exerciseRepository';
import {getMuscleById, listMuscles} from '../server/repositories/muscleRepository';
import {
  getPrinciples,
  getRepSchemes,
  getSources,
  getSplits,
  getVolumeLandmarks,
} from '../server/repositories/knowledgeRepository';

async function loadFixtures() {
  await migrateDb();

  // Vide (dépendants d'abord).
  await db.delete(schema.exerciseMuscles);
  await db.delete(schema.muscleVolumeLandmarks);
  await db.delete(schema.principleSources);
  await db.delete(schema.splitDays);
  await db.delete(schema.exercises);
  await db.delete(schema.trainingPrinciples);
  await db.delete(schema.splits);
  await db.delete(schema.repSchemes);
  await db.delete(schema.movementPatterns);
  await db.delete(schema.equipment);
  await db.delete(schema.sources);
  await db.delete(schema.muscles);
  await db.delete(schema.muscleGroups);

  await db.insert(schema.muscleGroups).values([
    {id: 'chest', nameFr: 'Pectoraux', region: 'upper'},
    {id: 'back', nameFr: 'Dos', region: 'upper'},
    {id: 'legs', nameFr: 'Jambes', region: 'lower'},
  ]);
  await db.insert(schema.muscles).values([
    {id: 'chest', nameFr: 'Pectoraux', nameEn: 'Pectoralis', groupId: 'chest', antagonistId: null},
    {id: 'lats', nameFr: 'Grand dorsal', nameEn: 'Lats', groupId: 'back', antagonistId: 'chest'},
    {id: 'quadriceps', nameFr: 'Quadriceps', nameEn: 'Quadriceps', groupId: 'legs', antagonistId: null},
  ]);
  await db.insert(schema.equipment).values([
    {id: 'barbell', nameFr: 'Barre', category: 'free-weight'},
    {id: 'bodyweight', nameFr: 'Poids du corps', category: 'bodyweight'},
  ]);
  await db.insert(schema.movementPatterns).values([
    {id: 'horizontal-push', nameFr: 'Poussée horizontale'},
  ]);
  await db.insert(schema.sources).values([
    {id: 'free-exercise-db', title: 'free-exercise-db', type: 'dataset'},
    {id: 'test-sci', title: 'Étude test', authors: 'Auteur', year: 2020, type: 'scientific'},
  ]);
  await db.insert(schema.exercises).values([
    {
      id: 'bench', nameEn: 'Bench Press', nameFr: 'Développé couché', level: 'beginner',
      category: 'strength', force: 'push', mechanic: 'compound', equipmentId: 'barbell',
      movementPatternId: 'horizontal-push', instructionsFr: ['Allonge-toi', 'Pousse'],
      isEnriched: true, sourceDataset: 'free-exercise-db',
    },
    {
      id: 'pushup', nameEn: 'Push Up', nameFr: null, level: 'beginner', category: 'strength',
      force: 'push', mechanic: 'compound', equipmentId: 'bodyweight', isEnriched: false,
      sourceDataset: 'free-exercise-db',
    },
    {
      id: 'squat-test', nameEn: 'Squat', nameFr: 'Squat', level: 'intermediate',
      category: 'strength', equipmentId: 'barbell', isEnriched: true, sourceDataset: 'free-exercise-db',
    },
  ]);
  await db.insert(schema.exerciseMuscles).values([
    {exerciseId: 'bench', muscleId: 'chest', role: 'primary'},
    {exerciseId: 'bench', muscleId: 'lats', role: 'secondary'},
    {exerciseId: 'pushup', muscleId: 'chest', role: 'primary'},
    {exerciseId: 'squat-test', muscleId: 'quadriceps', role: 'primary'},
  ]);
  await db.insert(schema.muscleVolumeLandmarks).values([
    {muscleId: 'chest', mvSets: 8, mevSets: 10, mavSetsMin: 12, mavSetsMax: 20, mrvSets: 22},
  ]);
  await db.insert(schema.trainingPrinciples).values([
    {id: 'test-principle', titleFr: 'Volume', category: 'volume', summaryFr: 'Résumé', evidence: 'strong', practicalFr: ['a', 'b']},
  ]);
  await db.insert(schema.principleSources).values([
    {principleId: 'test-principle', sourceId: 'test-sci'},
  ]);
  await db.insert(schema.repSchemes).values([
    {id: 'hyp', goal: 'hypertrophy', labelFr: 'Hypertrophie', repsMin: 6, repsMax: 12},
  ]);
  await db.insert(schema.splits).values([
    {id: 'ppl', nameFr: 'Push Pull Legs', daysPerWeekMin: 3, daysPerWeekMax: 6},
  ]);
  await db.insert(schema.splitDays).values([
    {splitId: 'ppl', dayOrder: 1, nameFr: 'Push'},
    {splitId: 'ppl', dayOrder: 2, nameFr: 'Pull'},
  ]);
}

beforeAll(loadFixtures, 30000);

describe('exerciseRepository', () => {
  it('liste tout, trié par nom FR (fallback EN)', async () => {
    const r = await listExercises({});
    expect(r.total).toBe(3);
    expect(r.items.map((i) => i.id)).toEqual(['bench', 'pushup', 'squat-test']);
  });

  it('charge les muscles primaires sur chaque item', async () => {
    const r = await listExercises({});
    const bench = r.items.find((i) => i.id === 'bench')!;
    expect(bench.primaryMuscles).toEqual([{id: 'chest', nameFr: 'Pectoraux'}]);
    expect(bench.equipmentNameFr).toBe('Barre');
  });

  it('recherche FR (insensible à la casse) et EN', async () => {
    expect((await listExercises({search: 'développé'})).items.map((i) => i.id)).toEqual(['bench']);
    expect((await listExercises({search: 'push'})).items.map((i) => i.id)).toEqual(['pushup']);
  });

  it('filtre par muscle (via table de liaison)', async () => {
    const r = await listExercises({muscle: 'chest'});
    expect(r.items.map((i) => i.id).sort()).toEqual(['bench', 'pushup']);
  });

  it('filtre par matériel et par niveau', async () => {
    expect((await listExercises({equipment: 'barbell'})).items.map((i) => i.id).sort()).toEqual(['bench', 'squat-test']);
    expect((await listExercises({level: 'beginner'})).items.map((i) => i.id).sort()).toEqual(['bench', 'pushup']);
  });

  it('pagine', async () => {
    const p1 = await listExercises({pageSize: 2, page: 1});
    expect(p1.items).toHaveLength(2);
    expect(p1.pageCount).toBe(2);
    expect((await listExercises({pageSize: 2, page: 2})).items).toHaveLength(1);
  });

  it('filtre par ids (favoris)', async () => {
    const r = await listExercises({ids: ['bench', 'squat-test']});
    expect(r.items.map((i) => i.id).sort()).toEqual(['bench', 'squat-test']);
  });

  it('getExerciseById renvoie la fiche complète + muscles', async () => {
    const ex = await getExerciseById('bench');
    expect(ex).not.toBeNull();
    expect(ex!.nameFr).toBe('Développé couché');
    expect(ex!.movementPatternNameFr).toBe('Poussée horizontale');
    expect(ex!.instructionsFr).toEqual(['Allonge-toi', 'Pousse']);
    expect(ex!.primaryMuscles).toEqual([{id: 'chest', nameFr: 'Pectoraux'}]);
    expect(ex!.secondaryMuscles).toEqual([{id: 'lats', nameFr: 'Grand dorsal'}]);
  });

  it('getExerciseById renvoie null si inconnu', async () => {
    expect(await getExerciseById('inconnu')).toBeNull();
  });

  it('getFacets expose muscles, matériel et énums', async () => {
    const f = await getFacets();
    expect(f.muscles).toHaveLength(3);
    expect(f.equipment).toHaveLength(2);
    expect(f.levels).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(f.categories).toHaveLength(7);
  });
});

describe('muscleRepository', () => {
  it('liste les muscles avec leur groupe', async () => {
    const list = await listMuscles();
    expect(list).toHaveLength(3);
    expect(list.every((m) => typeof m.groupNameFr === 'string')).toBe(true);
  });

  it('getMuscleById : repère de volume + exercices ciblants', async () => {
    const chest = await getMuscleById('chest');
    expect(chest).not.toBeNull();
    expect(chest!.volumeLandmark?.mevSets).toBe(10);
    expect(chest!.primaryExercises.map((e) => e.id).sort()).toEqual(['bench', 'pushup']);
  });

  it('getMuscleById : antagoniste résolu en nom FR', async () => {
    const lats = await getMuscleById('lats');
    expect(lats!.antagonistNameFr).toBe('Pectoraux');
    expect(lats!.secondaryExercises.map((e) => e.id)).toContain('bench');
    expect(lats!.volumeLandmark).toBeNull();
  });

  it('getMuscleById renvoie null si inconnu', async () => {
    expect(await getMuscleById('inconnu')).toBeNull();
  });
});

describe('knowledgeRepository', () => {
  it('principes avec leurs sources', async () => {
    const ps = await getPrinciples();
    expect(ps).toHaveLength(1);
    expect(ps[0].sources).toHaveLength(1);
    expect(ps[0].sources[0].id).toBe('test-sci');
  });

  it('rep schemes, volumes, splits, sources', async () => {
    expect(await getRepSchemes()).toHaveLength(1);
    const vol = await getVolumeLandmarks();
    expect(vol[0].muscleNameFr).toBe('Pectoraux');
    const splits = await getSplits();
    expect(splits[0].days).toHaveLength(2);
    expect(await getSources()).toHaveLength(2);
  });
});
