// Població municipal històrica (Idescat, població de fet 1857–1991) sobre els 947 municipis actuals.
// Un municipi que encara no existia en una data es fusiona amb el municipi d'on es va segregar: el grup rep la
// població conjunta repartida per superfície (mateixa densitat). El municipi d'origen es dedueix del veí que perd
// la població que el nou municipi guanya quan apareix a la sèrie; els casos posteriors al 1991 són explícits.
import fs from 'fs';
const EXPLICIT = { // segregacions posteriors a 1991 (no apareixen a la sèrie)
  'La Canonja': ['Tarragona'], 'Badia del Vallès': ['Barberà del Vallès', 'Cerdanyola del Vallès'], 'La Palma de Cervelló': ['Cervelló'],
  'Sant Julià de Cerdanyola': ['Guardiola de Berguedà'], 'Riu de Cerdanya': ['Bellver de Cerdanya'], 'Gimenells i el Pla de la Font': ['Lleida'],
};
const ABSORBED = { '17122': 'Les Llosses' }; // Palmerola, agregat a les Llosses
export function historic(M, neighbors, years) {
  const L = fs.readFileSync(new URL('../data/raw/poblacio-municipis-1717-1991.csv', import.meta.url), 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const hi = L.findIndex(l => l.startsWith('Codi;')), hdr = L[hi].split(';');
  const H = {}; L.slice(hi + 1).filter(l => /^\d/.test(l)).forEach(l => { const r = l.split(';'); H[r[0].slice(0, 5)] = Object.fromEntries(hdr.slice(2).map((y, j) => [+y, /^\d+$/.test(r[j + 2]) ? +r[j + 2] : null])); });
  const byN = new Map(M.map(m => [m.n, m]));
  for (const [k, n] of Object.entries(ABSORBED)) { const t = H[byN.get(n).k]; for (const y in H[k]) if (H[k][y] != null && t[y] != null) t[y] += H[k][y]; }
  const HY = hdr.slice(2).map(Number);
  const val = (m, y) => y === 2025 ? m.p : (H[m.k] ? H[m.k][y] : null);
  const out = {}, merged = {}, log = [];
  for (const y of years) {
    if (y === 2025) { out[y] = M.map(m => m.p); merged[y] = []; continue; }
    const par = M.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i])), uni = (a, b) => { par[find(a)] = find(b); };
    const miss = new Set(M.filter(m => val(m, y) == null).map(m => m.i));
    for (const i of miss) { const ex = EXPLICIT[M[i].n]; if (ex) ex.forEach(n => uni(i, byN.get(n).i)); }
    // Components de municipis sense dada que no tenen origen explícit.
    const seen = new Set();
    for (const i of miss) {
      if (seen.has(i) || EXPLICIT[M[i].n]) continue;
      const comp = [], st = [i]; seen.add(i);
      while (st.length) { const a = st.pop(); comp.push(a); for (const b of neighbors[a]) if (miss.has(b) && !seen.has(b) && !EXPLICIT[M[b].n]) { seen.add(b); st.push(b); } }
      // Primer any posterior en què apareixen i l'anterior.
      const y1 = HY.find(yy => yy > y && comp.some(a => val(M[a], yy) != null)), y0 = HY[HY.indexOf(y1) - 1];
      const gain = comp.reduce((s, a) => s + (val(M[a], y1) || 0), 0);
      const cand = [...new Set(comp.flatMap(a => neighbors[a]))].filter(b => !miss.has(b) || EXPLICIT[M[b].n]).filter(b => val(M[b], y0) != null && val(M[b], y1) != null);
      cand.sort((a, b) => (val(M[b], y0) - val(M[b], y1)) - (val(M[a], y0) - val(M[a], y1)));
      // Si cap veí té dades als dos anys (canvis de capitalitat, com Colera i Portbou), el veí més poblat amb dada.
      if (!cand.length) cand.push(...[...new Set(comp.flatMap(a => neighbors[a]))].filter(b => val(M[b], y) != null).sort((a, b) => val(M[b], y) - val(M[a], y)).slice(0, 1));
      const p = cand[0]; comp.forEach(a => uni(a, p));
      log.push(`${y}: ${comp.map(a => M[a].n).join(', ')} → ${M[p].n} (${y0}→${y1}: ${val(M[p], y0)}→${val(M[p], y1)}, nou ${gain})`);
    }
    const G = new Map(); M.forEach(m => { const r = find(m.i); if (!G.has(r)) G.set(r, []); G.get(r).push(m); });
    const v = new Array(M.length);
    for (const g of G.values()) { const P = g.reduce((s, m) => s + (val(m, y) || 0), 0), A = g.reduce((s, m) => s + m.a, 0); g.forEach(m => { v[m.i] = g.length > 1 ? P * m.a / A : P; }); }
    out[y] = v; merged[y] = M.filter(m => val(m, y) == null).map(m => m.i);
  }
  return { values: out, merged, log };
}
