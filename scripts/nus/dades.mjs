// Genera data/nus.json per a la pàgina «El nus» a partir de data/raw/nus-*.csv (scripts/nus/descarrega.py)
// i de la població de Catalunya als anys de padró (data/cartograma.json, sèrie de scripts/historic.mjs).
// Ús: node scripts/nus/dades.mjs
import fs from 'node:fs';
const dir = new URL('../../data/', import.meta.url);
const csv = n => { const [h, ...rs] = fs.readFileSync(new URL(`raw/nus-${n}.csv`, dir), 'utf8').trim().split(/\r?\n/).map(l => l.match(/("[^"]*"|[^,]*)(,|$)/g).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '')));
  return rs.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === '' || r[i] === undefined ? null : (isNaN(+r[i]) ? r[i] : +r[i])]))); };
const CA = JSON.parse(fs.readFileSync(new URL('cartograma.json', dir)));

// Habitatges: [any, cat iniciats lliures, cat acabats lliures, cat protegits, es iniciats lliures, es acabats lliures, es protegits]
const hab = csv('habitatges').map(r => [r.any, r.cat_iniciats_lliures, r.cat_acabats_lliures, r.cat_protegits, r.es_iniciats_lliures, r.es_acabats_lliures, r.es_protegits]);
// Banc d'Espanya: una sèrie per clau, [any, valor]
const B = csv('bde'), bde = {};
Object.keys(B[0]).filter(k => k !== 'any').forEach(k => { bde[k] = B.filter(r => r[k] != null).map(r => [r.any, r[k]]); });
// Població de Catalunya als anys de padró des del 1998 (el 2025, cens)
const pop = CA.years.map((y, i) => [y, CA.pop[i].reduce((a, b) => a + b, 0)]).filter(p => p[0] >= 1998);
if (pop[pop.length - 1][1] !== 8124126) throw new Error('La població del 2025 no quadra amb el cens: ' + pop[pop.length - 1][1]);
const social = csv('social').map(r => [r.pais, r.any, r.pct_parc]);
// Tinença a Espanya per edat (OCDE): { edat: { tinença: [[any, %], …] } }
const ten = {};
csv('tinenca').forEach(r => { ((ten[r.edat] ||= {})[r.tinenca] ||= []).push([r.any, r.pct_persones]); });
const bis = csv('bis').map(r => [r.any, r.nominal_2010_100, r.real_2010_100]);
const sob = {};
csv('sobrecarrega').forEach(r => { ((sob[r.geo] ||= {})[r.tinenca] ||= []).push([r.any, r.pct]); });
const estudis = csv('estudis').map(r => [r.mesura, r.ambit, r.efecte_pct]);
const out = { hab, bde, pop, social, ten, bis, sob, estudis };
fs.writeFileSync(new URL('nus.json', dir), JSON.stringify(out));

// Xifres clau per revisar
const H = Object.fromEntries(hab.map(r => [r[0], r]));
const acab = y => H[y][2] + H[y][3];
for (let i = 1; i < pop.length; i++) { const [a, pa] = pop[i - 1], [b, pb] = pop[i]; let s = 0; for (let y = a + 1; y <= b; y++) s += acab(y);
  console.log(`${a}–${b}: +${pb - pa} habitants, ${s} habitatges acabats, ${((pb - pa) / s).toFixed(2)} per habitatge`); }
console.log('acabats a Catalunya', [1991, 2006, 2008, 2013, 2015, 2025].map(y => `${y}: ${acab(y)}`).join(', '));
console.log('mida', JSON.stringify(out).length, 'bytes');
