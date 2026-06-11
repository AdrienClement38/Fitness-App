// Fusionne les lots traduits (data/_translations/out_NN.json) en un seul
// data/exercises_translations.json = [{id, name_fr, instructions_fr}].
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', '_translations');

const files = readdirSync(DIR)
  .filter((f) => f.startsWith('out_') && f.endsWith('.json'))
  .sort();

const all = [];
const seen = new Set();
for (const f of files) {
  const arr = JSON.parse(readFileSync(path.join(DIR, f), 'utf-8'));
  let kept = 0;
  for (const t of arr) {
    if (!t.id || seen.has(t.id)) continue;
    seen.add(t.id);
    all.push({id: t.id, name_fr: t.name_fr, instructions_fr: t.instructions_fr ?? []});
    kept++;
  }
  console.log(`${f} : ${kept}`);
}

writeFileSync(
  path.join(ROOT, 'data', 'exercises_translations.json'),
  JSON.stringify(all, null, 2),
  'utf-8',
);
console.log(`MERGE -> data/exercises_translations.json : ${all.length} traductions (${files.length} lots)`);
