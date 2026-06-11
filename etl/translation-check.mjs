// Contrôle les lots traduits : complétude (manquants), cohérence du nombre
// d'étapes, ids inconnus, et affiche des échantillons pour juger la qualité.
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', '_translations');

const ins = readdirSync(DIR).filter((f) => f.startsWith('in_') && f.endsWith('.json')).sort();
let totalIn = 0, totalOut = 0, totalMissing = 0, totalStepKO = 0;
const samples = [];

for (const inf of ins) {
  const nn = inf.slice(3, 5);
  const outf = `out_${nn}.json`;
  const input = JSON.parse(readFileSync(path.join(DIR, inf), 'utf-8'));
  totalIn += input.length;
  const inById = new Map(input.map((e) => [e.id, e]));
  if (!existsSync(path.join(DIR, outf))) {
    console.log(`${outf} : MANQUANT (in=${input.length})`);
    totalMissing += input.length;
    continue;
  }
  const out = JSON.parse(readFileSync(path.join(DIR, outf), 'utf-8'));
  totalOut += out.length;
  const outIds = new Set(out.map((o) => o.id));
  const missing = input.filter((e) => !outIds.has(e.id)).map((e) => e.id);
  totalMissing += missing.length;
  let stepKO = 0;
  for (const o of out) {
    const src = inById.get(o.id);
    if (!src) { console.log(`  ${outf} : id inconnu '${o.id}'`); continue; }
    if ((o.instructions_fr?.length || 0) !== (src.instructions?.length || 0)) stepKO++;
  }
  totalStepKO += stepKO;
  console.log(`${outf} : in=${input.length} out=${out.length} manquants=${missing.length} etapes_KO=${stepKO}`);
  if (missing.length) console.log(`    -> manquants: ${missing.slice(0, 12).join(', ')}`);
  if (samples.length < 3 && out.length) samples.push(out[Math.floor(out.length / 2)]);
}

console.log(`\nTOTAL  in=${totalIn}  out=${totalOut}  manquants=${totalMissing}  etapes_KO=${totalStepKO}`);
console.log('\n--- ECHANTILLONS (qualite) ---');
for (const s of samples) console.log(JSON.stringify(s, null, 1));
