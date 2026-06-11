// Prépare la relecture : apparie chaque traduction FR avec sa source EN,
// exclut les exos déjà rédigés à la main (exercises_enriched.json), et découpe
// en lots data/_review/in_NN.json = [{id, name_en, instructions_en, name_fr, instructions_fr}].
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = path.join(ROOT, 'etl', 'sources', 'free-exercise-db.exercises.json');
const TRANS = path.join(ROOT, 'data', 'exercises_translations.json');
const ENRICHED = path.join(ROOT, 'data', 'exercises_enriched.json');
const OUT = path.join(ROOT, 'data', '_review');
const BATCHES = 15;

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const dataset = JSON.parse(readFileSync(DATASET, 'utf-8'));
const trans = JSON.parse(readFileSync(TRANS, 'utf-8'));
const enriched = new Set(JSON.parse(readFileSync(ENRICHED, 'utf-8')).map((e) => e.id));
const enById = new Map(dataset.map((e) => [e.id, e]));

const items = [];
for (const t of trans) {
  if (enriched.has(slug(t.id))) continue; // déjà rédigé à la main → pas concerné
  const en = enById.get(t.id);
  if (!en) continue;
  items.push({
    id: t.id,
    name_en: en.name,
    instructions_en: en.instructions || [],
    name_fr: t.name_fr,
    instructions_fr: t.instructions_fr || [],
  });
}

mkdirSync(OUT, {recursive: true});
const size = Math.ceil(items.length / BATCHES);
for (let b = 0; b < BATCHES; b++) {
  const slice = items.slice(b * size, (b + 1) * size);
  if (!slice.length) continue;
  const num = String(b).padStart(2, '0');
  writeFileSync(path.join(OUT, `in_${num}.json`), JSON.stringify(slice, null, 2), 'utf-8');
  console.log(`in_${num}.json : ${slice.length}`);
}
console.log(`a relire : ${items.length} exos (${enriched.size} enrichis exclus, ${trans.length} traductions au total)`);
