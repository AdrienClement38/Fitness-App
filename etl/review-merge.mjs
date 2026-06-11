// Applique les corrections de relecture : remplace name_fr / instructions_fr
// dans data/exercises_translations.json par les versions relues (out_*.json).
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', '_review');
const TRANS = path.join(ROOT, 'data', 'exercises_translations.json');

const outs = readdirSync(DIR).filter((f) => f.startsWith('out_') && f.endsWith('.json')).sort();
const reviewed = new Map();
let fixedCount = 0;
for (const f of outs) {
  const arr = JSON.parse(readFileSync(path.join(DIR, f), 'utf-8'));
  for (const o of arr) {
    reviewed.set(o.id, o);
    if (o.fixed) fixedCount++;
  }
}

const trans = JSON.parse(readFileSync(TRANS, 'utf-8'));
let updated = 0;
for (const t of trans) {
  const r = reviewed.get(t.id);
  if (r) {
    t.name_fr = r.name_fr;
    t.instructions_fr = r.instructions_fr;
    updated++;
  }
}
writeFileSync(TRANS, JSON.stringify(trans, null, 2), 'utf-8');
console.log(`MERGE -> exercises_translations.json : ${updated} entrees relues appliquees (dont ${fixedCount} corrigees)`);
