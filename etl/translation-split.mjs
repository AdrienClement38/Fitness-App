// Découpe le dataset en N lots d'entrée pour la traduction parallèle.
// Chaque lot = [{id, name, instructions}] dans data/_translations/in_NN.json.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'etl', 'sources', 'free-exercise-db.exercises.json');
const OUT = path.join(ROOT, 'data', '_translations');
const BATCHES = 15;

const data = JSON.parse(readFileSync(SRC, 'utf-8'));
mkdirSync(OUT, {recursive: true});
const size = Math.ceil(data.length / BATCHES);

for (let b = 0; b < BATCHES; b++) {
  const slice = data
    .slice(b * size, (b + 1) * size)
    .map((e) => ({id: e.id, name: e.name, instructions: e.instructions || []}));
  if (!slice.length) continue;
  const num = String(b).padStart(2, '0');
  writeFileSync(path.join(OUT, `in_${num}.json`), JSON.stringify(slice, null, 2), 'utf-8');
  console.log(`in_${num}.json : ${slice.length} exos`);
}
console.log(`total ${data.length} exos -> ${BATCHES} lots`);
