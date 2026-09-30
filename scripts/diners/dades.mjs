// Genera data/diners.json a partir de data/raw/diners-*.csv (vegeu scripts/diners/descarrega.py).
// Ús: node scripts/diners/dades.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const csv = name => {
  const [h, ...rows] = readFileSync(join(ROOT, 'data', 'raw', `diners-${name}.csv`), 'utf8').trim().split(/\r?\n/).map(l => l.split(','));
  return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === '' || r[i] === undefined ? null : (isNaN(+r[i]) ? r[i] : +r[i])])));
};
const r1 = (x, d = 1) => x == null ? null : Math.round(x * 10 ** d) / 10 ** d;
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

/* ---- IPC: l'INE publica l'índex des del 2002; abans, l'enllacem cap enrere amb la taxa interanual de cada mes. ---- */
function ipcChain(idxKey, varKey) {
  const rows = csv('ipc'), idx = new Map(), vr = new Map();
  rows.forEach(r => { if (r[idxKey] != null) idx.set(r.mes, r[idxKey]); if (r[varKey] != null) vr.set(r.mes, r[varKey]); });
  const key = (y, m) => `${y}M${String(m).padStart(2, '0')}`;
  const first = [...idx.keys()].sort()[0];
  let y = +first.slice(0, 4), m = +first.slice(5);
  // Anem enrere: I(t-12) = I(t) / (1 + taxa(t)/100)
  for (let yy = y - 1; ; yy--) {
    let any = false;
    for (let mm = 1; mm <= 12; mm++) {
      const next = idx.get(key(yy + 1, mm)), v = vr.get(key(yy + 1, mm));
      if (next != null && v != null) { idx.set(key(yy, mm), next / (1 + v / 100)); any = true; }
    }
    if (!any) break;
  }
  const ks = [...idx.keys()].sort();
  return { from: ks[0], v: ks.map(k => r1(idx.get(k), 3)) };
}
const ipcES = ipcChain('index_espanya', 'taxa_anual_espanya');
const ipcCT = ipcChain('index_catalunya', 'taxa_anual_catalunya');
const annual = s => { // mitjana anual dels anys complets
  const y0 = +s.from.slice(0, 4), m0 = +s.from.slice(5), out = {};
  s.v.forEach((v, i) => { const t = (m0 - 1) + i, y = y0 + Math.floor(t / 12); (out[y] ||= []).push(v); });
  return Object.fromEntries(Object.entries(out).filter(([, a]) => a.length === 12).map(([y, a]) => [y, mean(a)]));
};
const aES = annual(ipcES), aCT = annual(ipcCT);

/* ---- EUA: IPC 1800-2025 ---- */
const usCpi = csv('ipc-eua').map(r => [r.any, r.ipc_1967_100]);

/* ---- Or i canvi ---- */
const gold = csv('or'), eur = new Map(csv('eurusd').map(r => [r.mes.replace('-', 'M'), r.usd_per_euro]));
const goldFrom = gold[0].mes;
// Abans del 1960, preu legal de l'or als EUA ($/unça): 19,39 (Coinage Act 1792), 20,67 (1834–1933, llevat de 1862–1878,
// quan el dòlar de paper no es podia canviar per or) i 35 (Gold Reserve Act, gener del 1934). [des, fins, $/unça]
const goldPar = [[1800, 1833, 19.39], [1834, 1861, 20.67], [1879, 1932, 20.67], [1934, 1959, 35]];

/* ---- Diner: BCE i Fed, a final de cada mes, en milers de milions ---- */
const agg = csv('bce-agregats');
const monthlyLast = (rows, dk, vk, div) => { const m = new Map(); rows.forEach(r => m.set(String(r[dk]).slice(0, 7), r[vk] / div)); return [...m].map(([k, v]) => [k, r1(v, 1)]); };
// Setmanes ISO del BCE → mes de la data del divendres de la setmana
const isoWeekToMonth = w => { const [y, n] = w.split('-W').map(Number); const jan4 = new Date(Date.UTC(y, 0, 4)); const d = new Date(jan4); d.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (n - 1) * 7 + 4); return d.toISOString().slice(0, 7); };
const ecbBal = monthlyLast(csv('bce-balanc').map(r => ({ d: isoWeekToMonth(r.setmana), v: r.actius })), 'd', 'v', 1000);
const fedBal = monthlyLast(csv('fed-balanc'), 'data', 'WALCL', 1000);
const usM2 = csv('eua-m2').map(r => [r.data.slice(0, 7), r.M2SL]);

/* ---- Habitatge, salaris i lloguer ---- */
const hab = csv('habitatge').map(r => [r.trimestre, r.espanya, r.catalunya, r.provincia_barcelona]);
const salQ = csv('salaris');
const salY = {}; salQ.forEach(r => { const y = r.trimestre.slice(0, 4); (salY[y] ||= []).push(r); });
// Salari brut anual = mitjana dels quatre trimestres del cost salarial mensual × 12 (cada trimestre inclou les pagues extres que s'hi cobren)
const sal = Object.entries(salY).filter(([, a]) => a.length === 4).map(([y, a]) => [+y, Math.round(mean(a.map(r => r.catalunya)) * 12), Math.round(mean(a.map(r => r.espanya)) * 12)]);
const habY = {}; hab.forEach(r => { const y = r[0].slice(0, 4); (habY[y] ||= []).push(r); });
const habA = Object.fromEntries(Object.entries(habY).filter(([, a]) => a.length === 4).map(([y, a]) => [y, [1, 2, 3].map(k => mean(a.map(r => r[k])))]));
const rent = csv('lloguer-bcn').map(r => [r.any, r.renda_mensual, r.contractes]);
const eman = {}; csv('emancipacio').forEach(r => { (eman[r.geo] ||= []).push([r.any, r.edat]); });

const out = {
  updated: new Date().toISOString().slice(0, 10),
  ipc: { es: ipcES, ct: ipcCT },
  usCpi,
  gold: { from: goldFrom, v: gold.map(r => r.usd_unca) }, goldPar,
  eurusd: { from: '1999M01', v: [...eur.values()].map(v => r1(v, 4)) },
  m3: agg.map(r => [r.mes, r1(r.M3 / 1000), r1(r.efectiu / 1000), r1(r.M1 / 1000)]),
  ecbBal, fedBal, usM2,
  hab, sal, rent, eman,
};
writeFileSync(join(ROOT, 'data', 'diners.json'), JSON.stringify(out));

/* ---- Xifres clau per al text (per comprovar-les) ---- */
const last = (s) => s.v[s.v.length - 1];
const at = (s, k) => { const y0 = +s.from.slice(0, 4), m0 = +s.from.slice(5); const y = +k.slice(0, 4), m = +k.slice(5); return s.v[(y - y0) * 12 + (m - m0)]; };
const lastKey = s => { const y0 = +s.from.slice(0, 4), m0 = +s.from.slice(5), t = m0 - 1 + s.v.length - 1; return `${y0 + Math.floor(t / 12)}M${String(t % 12 + 1).padStart(2, '0')}`; };
console.log('IPC ES', ipcES.from, lastKey(ipcES), 'CT', ipcCT.from, lastKey(ipcCT));
for (const k of ['1961M01', '1971M08', '1978M01', '1986M01', '1999M01', '2002M01', '2008M01', '2020M01', '2021M01']) {
  const e = at(ipcES, k), c = at(ipcCT, k);
  console.log(k, 'ES ×', r1(last(ipcES) / e, 2), 'poder 100€ →', r1(100 * e / last(ipcES), 1), c ? `| CT × ${r1(last(ipcCT) / c, 2)} → ${r1(100 * c / last(ipcCT), 1)}` : '');
}
const g = out.gold.v, gl = g[g.length - 1], gk = gold[gold.length - 1].mes, el = [...eur.values()].pop();
console.log('Or', gk, gl, '$ ×', r1(gl / 35, 1), 'vs 35$; en €', Math.round(gl / eur.get(gk)), '€/unça; 1999M01', gold.find(r => r.mes === '1999M01').usd_unca / eur.get('1999M01'));
console.log('Unça en pessetes 1971 (35$×70):', 35 * 70, 'PTA =', r1(35 * 70 / 166.386, 2), '€');
const m3 = out.m3, m3l = m3[m3.length - 1], m399 = m3.find(r => r[0] === '1999-01');
console.log('M3', m3l, 'vs 1999-01', m399, '×', r1(m3l[1] / m399[1], 2), 'efectiu %', r1(100 * m3l[2] / m3l[1], 1));
console.log('BCE balanç', ecbBal.find(r => r[0] === '2007-06'), ecbBal.reduce((a, b) => b[1] > a[1] ? b : a), ecbBal[ecbBal.length - 1]);
console.log('Fed balanç', fedBal[0], fedBal.find(r => r[0] === '2008-08'), fedBal.reduce((a, b) => b[1] > a[1] ? b : a), fedBal[fedBal.length - 1]);
console.log('EUA M2', usM2[0], usM2.find(r => r[0] === '1971-08'), usM2.find(r => r[0] === '2020-02'), usM2[usM2.length - 1]);
const us = new Map(usCpi); console.log('IPC EUA 1800', us.get(1800), '1913', us.get(1913), '1971', us.get(1971), '2025', us.get(2025), '1913→2025 poder', r1(100 * us.get(1913) / us.get(2025), 1), '1971→2025', r1(100 * us.get(1971) / us.get(2025), 1));
console.log('Salaris CT', sal.map(r => r.join(':')).join(' '));
for (const [y, s] of sal) { const h = habA[y]; if (h && (y % 5 === 0 || y >= 2024)) console.log(y, 'hab Bcn €/m²', Math.round(h[2]), '80m² =', Math.round(h[2] * 80), 'anys sou CT', r1(h[2] * 80 / s, 1), '| sou real (€ 2025)', Math.round(s * aCT[2025] / aCT[y])); }
console.log('Habitatge anual Bcn', Object.entries(habA).map(([y, h]) => y + ':' + Math.round(h[2])).join(' '));
for (const [y, r] of rent) { const s = sal.find(x => x[0] === y); if (s) console.log('lloguer', y, r, '% sou brut mensual CT', r1(100 * r * 12 / s[1], 1)); }
console.log('IPC anual CT 2000→2025 ×', r1(aCT[2025] / aCT[2000], 3), 'ES', r1(aES[2025] / aES[2000], 3));
