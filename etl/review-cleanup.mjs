// Nettoyage final ciblé : corrige les calques systématiques résiduels que la
// relecture a laissés passer par endroits. Opère sur le JSON parsé (name_fr +
// instructions_fr), jamais sur le texte brut, pour ne rien casser.
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANS = path.join(ROOT, 'data', 'exercises_translations.json');

const REPLACEMENTS = [
  [/bras supérieurs?/g, 'bras'], // calque de "upper arm(s)" (contexte : bras fixe vs avant-bras)
  [/curl les poids/g, 'amène les poids en curl'],
  [/curl le poids/g, 'amène le poids en curl'],
  [/explosément/g, 'de manière explosive'],
  [/tu exercises/g, 'tu exerces'],
  [/Grimpeurs? de montagne/g, 'Mountain climbers'],
  [/se protacter/g, "s'écarter"], // calque non-français de "protract" (omoplates)
];

const trans = JSON.parse(readFileSync(TRANS, 'utf-8'));
let changed = 0;
const fix = (s) => {
  let r = s;
  for (const [re, rep] of REPLACEMENTS) r = r.replace(re, rep);
  if (r !== s) changed++;
  return r;
};
for (const t of trans) {
  if (t.name_fr) t.name_fr = fix(t.name_fr);
  if (Array.isArray(t.instructions_fr)) t.instructions_fr = t.instructions_fr.map(fix);
}
writeFileSync(TRANS, JSON.stringify(trans, null, 2), 'utf-8');
console.log(`cleanup final : ${changed} chaines corrigees`);
