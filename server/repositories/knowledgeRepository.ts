/** Accès données « savoir » : principes, schémas de reps, volumes, splits, sources. */
import {asc, eq} from 'drizzle-orm';
import {db, schema} from '../db/client';

const {
  trainingPrinciples, principleSources, sources,
  repSchemes, muscleVolumeLandmarks, muscles, splits, splitDays,
} = schema;

export async function getPrinciples() {
  const principles = await db.select().from(trainingPrinciples).orderBy(asc(trainingPrinciples.category));

  const links = await db
    .select({
      principleId: principleSources.principleId,
      id: sources.id,
      title: sources.title,
      authors: sources.authors,
      year: sources.year,
      url: sources.url,
    })
    .from(principleSources)
    .innerJoin(sources, eq(sources.id, principleSources.sourceId));

  const byPrinciple = new Map<string, (typeof links)[number][]>();
  for (const l of links) {
    const arr = byPrinciple.get(l.principleId);
    if (arr) arr.push(l);
    else byPrinciple.set(l.principleId, [l]);
  }

  return principles.map((p) => ({...p, sources: byPrinciple.get(p.id) ?? []}));
}

export async function getRepSchemes() {
  return db.select().from(repSchemes);
}

export async function getVolumeLandmarks() {
  return db
    .select({
      muscleId: muscleVolumeLandmarks.muscleId,
      muscleNameFr: muscles.nameFr,
      mvSets: muscleVolumeLandmarks.mvSets,
      mevSets: muscleVolumeLandmarks.mevSets,
      mavSetsMin: muscleVolumeLandmarks.mavSetsMin,
      mavSetsMax: muscleVolumeLandmarks.mavSetsMax,
      mrvSets: muscleVolumeLandmarks.mrvSets,
      notesFr: muscleVolumeLandmarks.notesFr,
    })
    .from(muscleVolumeLandmarks)
    .innerJoin(muscles, eq(muscles.id, muscleVolumeLandmarks.muscleId))
    .orderBy(asc(muscles.nameFr));
}

export async function getSplits() {
  const splitList = await db.select().from(splits).orderBy(asc(splits.daysPerWeekMin));
  const days = await db.select().from(splitDays).orderBy(asc(splitDays.dayOrder));

  const bySplit = new Map<string, (typeof days)[number][]>();
  for (const d of days) {
    const arr = bySplit.get(d.splitId);
    if (arr) arr.push(d);
    else bySplit.set(d.splitId, [d]);
  }

  return splitList.map((s) => ({...s, days: bySplit.get(s.id) ?? []}));
}

export async function getSources() {
  return db.select().from(sources).orderBy(asc(sources.year));
}
