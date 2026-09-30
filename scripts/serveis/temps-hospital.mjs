// Temps modelitzat fins a un dispositiu SISCAT que el registre hospitalari etiqueta amb urgències 24 h.
// Inclou CUAP i urgències especialitzades; no és una selecció d'urgències hospitalàries generals d'adults.
// L'origen és l'ajuntament. Per evitar que el punt s'enganxi a una pista forestal, també es proven 8 punts a 700 m
// i es pren el temps mínim. No es verifica quina és la carretera principal ni el trajecte fins al punt triat;
// OSRM ajusta els punts a la xarxa viària. No són temps observats per a tots els domicilis del municipi.
// Ús: SERVEIS=<carpeta amb serveis-municipis.csv i punts-serveis.json> node scripts/serveis/temps-hospital.mjs
import fs from 'node:fs';
const D = process.env.SERVEIS.replace(/\/?$/, '/');
const rows = fs.readFileSync(D + 'serveis-municipis.csv', 'utf8').trim().split('\n');
const H = rows[0].split(';'); const munis = rows.slice(1).map(l => Object.fromEntries(l.split(';').map((v, i) => [H[i], v])));
const hosp = JSON.parse(fs.readFileSync(D + 'punts-serveis.json', 'utf8')).hospital_urg24;
const dest = []; for (const h of hosp) if (!dest.some(d => Math.hypot(d[0] - h[0], d[1] - h[1]) < 0.003)) dest.push(h);
// Punts d'origen corregits: l'ajuntament de la font és lluny del nucli.
const ORIGEN = { '250899': [1.2703, 42.4961] }; // Farrera
munis.forEach(m => { if (ORIGEN[m.codi]) [m.lon, m.lat] = ORIGEN[m.codi]; });
// ONLY=<codi> recalcula només aquest municipi i actualitza el CSV existent.
const ONLY = process.env.ONLY;
const OFF = [[0, 0], ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => [Math.cos(a * Math.PI / 180) * .7, Math.sin(a * Math.PI / 180) * .7])];
const src = munis.filter(m => !ONLY || m.codi === ONLY).flatMap(m => OFF.map(([dx, dy]) => ({ m, lon: +m.lon + dx / (111.32 * Math.cos(+m.lat * Math.PI / 180)), lat: +m.lat + dy / 110.57 })));
const best = new Map(); const B = 100 - dest.length;
for (let i = 0; i < src.length; i += B) {
  const s = src.slice(i, i + B);
  const coords = [...s.map(p => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`), ...dest.map(d => `${d[0]},${d[1]}`)].join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${s.map((_, j) => j).join(';')}&destinations=${dest.map((_, j) => s.length + j).join(';')}&annotations=duration,distance`;
  let j; for (let t = 0; t < 6; t++) { try { const r = await fetch(url, { headers: { 'User-Agent': 'terra-i-gent (catalunya.uriocallaghan.com)' } }); j = await r.json(); if (j.code === 'Ok') break; } catch (e) {} await new Promise(r => setTimeout(r, 4000)); }
  if (j?.code !== 'Ok') throw new Error('OSRM ' + i);
  s.forEach((p, a) => j.durations[a].forEach((d, b) => { if (d == null) return; const o = best.get(p.m.codi); if (!o || d < o.d) best.set(p.m.codi, { d, km: j.distances[a][b], h: dest[b][2] }); }));
  process.stdout.write('.'); await new Promise(r => setTimeout(r, 1100));
}
const OUT = new URL('../../data/raw/serveis-temps-hospital.csv', import.meta.url);
const prev = ONLY ? Object.fromEntries(fs.readFileSync(OUT, 'utf8').trim().split('\n').slice(1).map(l => [l.split(';')[0], l])) : {};
const out = ['codi;min_cotxe;km_carretera;hospital_codi', ...munis.map(m => { const b = best.get(m.codi); return b ? [m.codi, (b.d / 60).toFixed(1), (b.km / 1000).toFixed(1), b.h].join(';') : prev[m.codi]; })];
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log('\nfet', munis.length, 'municipis,', dest.length, 'hospitals');
