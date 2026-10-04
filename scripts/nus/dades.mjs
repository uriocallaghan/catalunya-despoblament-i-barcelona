// Genera data/nus.json per a la pàgina «El nus»: població de cada municipi als anys de padró (1998–2025),
// extreta de data/cartograma.json (sèrie de scripts/historic.mjs, sobre els termes actuals).
// Ús: node scripts/nus/dades.mjs
import fs from 'node:fs';
const dir = new URL('../../data/', import.meta.url);
const CA = JSON.parse(fs.readFileSync(new URL('cartograma.json', dir)));
const CAT = JSON.parse(fs.readFileSync(new URL('catalunya.json', dir)));
const from = CA.years.indexOf(1998);
const years = CA.years.slice(from);
const pop = CA.pop.slice(from);
const imputed = CA.merged.slice(from);
// L'últim any ha de quadrar amb el cens (947 municipis, data/catalunya.json)
const last = pop[pop.length - 1];
CAT.mun.forEach((m, i) => { if (m[2] !== last[i]) throw new Error(`${m[0]}: ${m[2]} ≠ ${last[i]}`); });
fs.writeFileSync(new URL('nus.json', dir), JSON.stringify({ years, pop, imputed }));
const ME = new Set(['Alt Penedès', 'Baix Llobregat', 'Barcelonès', 'Garraf', 'Maresme', 'Vallès Occidental', 'Vallès Oriental'].map(n => CAT.coms.indexOf(n)));
const sum = (a, f) => a.reduce((s, v, i) => s + (f(i) ? v : 0), 0);
years.forEach((y, k) => console.log(y, sum(pop[k], () => true), 'metropolità', sum(pop[k], i => ME.has(CAT.mun[i][1]))));
