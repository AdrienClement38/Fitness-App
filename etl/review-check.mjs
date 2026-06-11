// Contrôle les lots relus : complétude (aucun exo perdu), cohérence du nombre
// d'étapes (vs instructions_en), et total des corrections.
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', '_review');

const ins = readdirSync(DIR).filter((f) => f.startsWith('in_') && f.endsWith('.json')).sort();
let tIn = 0, tOut = 0, tMissing = 0, tStepKO = 0, tFixed = 0, probs = 0;

for (const inf of ins) {
  const nn = inf.slice(3, 5);
  const outf = `out_${nn}.json`;
  const input = JSON.parse(readFileSync(path.join(DIR, inf), 'utf-8'));
  tIn += input.length;
  const inById = new Map(input.map((e) => [e.id, e]));
  if (!existsSync(path.join(DIR, outf))) {
    console.log(`${outf} : ABSENT (in=${input.length})`);
    tMissing += input.length;
    probs++;
    continue;
  }
  const out = JSON.parse(readFileSync(path.join(DIR, outf), 'utf-8'));
  tOut += out.length;
  const outIds = new Set(out.map((o) => o.id));
  const missing = input.filter((e) => !outIds.has(e.id)).map((e) => e.id);
  let stepKO = 0, fixed = 0;
  for (const o of out) {
    const src = inById.get(o.id);
    if (!src) { console.log(`  ${outf} : id inconnu '${o.id}'`); continue; }
    if ((o.instructions_fr?.length || 0) !== (src.instructions_en?.length || 0)) stepKO++;
    if (o.fixed) fixed++;
  }
  tMissing += missing.length;
  tStepKO += stepKO;
  tFixed += fixed;
  if (missing.length || stepKO) probs++;
  console.log(`${outf} : in=${input.length} out=${out.length} manquants=${missing.length} etapes_KO=${stepKO} corriges=${fixed}`);
  if (missing.length) console.log(`   -> manquants: ${missing.slice(0, 8).join(', ')}`);
}

console.log(`\nTOTAL  in=${tIn}  out=${tOut}  manquants=${tMissing}  etapes_KO=${tStepKO}  corriges=${tFixed}`);
console.log(probs ? `\n!! ${probs} lot(s) a corriger avant merge` : `\nOK tous les lots complets, pret a merger`);
