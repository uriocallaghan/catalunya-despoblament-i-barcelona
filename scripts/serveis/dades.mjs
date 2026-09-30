// Genera data/serveis.json per a la secció de serveis.
// Si SERVEIS apunta a la carpeta de descàrregues (vegeu descarrega.sh), primer hi actualitza les taules de data/raw.
// Ús: node scripts/serveis/dades.mjs   (o SERVEIS=<carpeta> node scripts/serveis/dades.mjs)
import fs from 'node:fs';
import { matriculaPerComarca } from './matricula.mjs';
const R = f => new URL('../../data/raw/' + f, import.meta.url);
if (process.env.SERVEIS) {
  const D = process.env.SERVEIS.replace(/\/?$/, '/');
  fs.copyFileSync(D + 'serveis-municipis.csv', R('serveis-municipis.csv'));
  const P = JSON.parse(fs.readFileSync(D + 'punts-serveis.json', 'utf8'));
  fs.writeFileSync(R('serveis-hospitals-urgencies.csv'), 'lon;lat;codi_municipi\n' + P.hospital_urg24.map(p => p.join(';')).join('\n') + '\n');
  // Matrícula d'universitats públiques i privades per comarca del centre, sense duplicar detall i subtotals.
  const { curs:last, comarques:c } = matriculaPerComarca(JSON.parse(fs.readFileSync(D + 'univ_alumnat.json', 'utf8')));
  fs.writeFileSync(R('serveis-alumnat-universitari.csv'), `comarca;matricula_${last}\n` + Object.entries(c).sort((a, b) => b[1] - a[1]).map(e => e.join(';')).join('\n') + '\n');
}
const csv = f => { const [h, ...rows] = fs.readFileSync(R(f), 'utf8').trim().split('\n').map(l => l.split(';')); return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const S = csv('serveis-municipis.csv'), T = Object.fromEntries(csv('serveis-temps-hospital.csv').map(r => [r.codi, r]));
// Mateix ordre de municipis que data/catalunya.json (geometries d'es-atlas).
const atlas = JSON.parse(fs.readFileSync(new URL('../../node_modules/es-atlas/es/municipalities.json', import.meta.url)));
const ORD = atlas.objects.municipalities.geometries.filter(g => ['08', '17', '25', '43'].includes(g.id.slice(0, 2))).map(g => g.id);
const byIne = Object.fromEntries(S.map(r => [r.codi.slice(0, 5), r])), idx = Object.fromEntries(ORD.map((k, i) => [k, i]));
if (ORD.some(k => !byIne[k])) throw new Error('municipis sense dades de serveis');
const N = ['primaria', 'farmacia', 'biblioteca_publica', 'eso', 'batxillerat', 'piscina_coberta', 'estacio_tren', 'cinema', 'hospital', 'univ_centre', 'esport_installacio', 'fp'];
const DI = ['farmacia', 'eso', 'batxillerat', 'biblioteca_publica', 'cinema', 'estacio_tren', 'univ_centre'];
const rows = ORD.map(k => byIne[k]);
const out = {
  n: Object.fromEntries(N.map(s => [s, rows.map(r => +r['n_' + s])])),
  d: Object.fromEntries(DI.map(s => [s, rows.map(r => +(+r['d_' + s]).toFixed(1))])),
  min: rows.map(r => +T[r.codi].min_cotxe), km: rows.map(r => +T[r.codi].km_carretera), hosp: rows.map(r => idx[T[r.codi].hospital_codi.slice(0, 5)]),
  hospitals: csv('serveis-hospitals-urgencies.csv').map(r => [+(+r.lon).toFixed(5), +(+r.lat).toFixed(5), idx[r.codi_municipi.slice(0, 5)]]),
  uni: csv('serveis-alumnat-universitari.csv').map(r => [r.comarca, +Object.values(r)[1]]), uniCurs: Object.keys(csv('serveis-alumnat-universitari.csv')[0])[1].split('_')[1],
};
fs.writeFileSync(new URL('../../data/serveis.json', import.meta.url), JSON.stringify(out));
console.log('serveis.json', (fs.statSync(new URL('../../data/serveis.json', import.meta.url)).size / 1024).toFixed(0), 'KB');
