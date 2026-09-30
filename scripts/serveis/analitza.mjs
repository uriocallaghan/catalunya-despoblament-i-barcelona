// Anàlisi de localització de serveis vs població (Cens 2025) als 947 municipis.
// Ús: SERVEIS=<carpeta de descàrregues> node scripts/serveis/analitza.mjs (vegeu descarrega.sh)
import fs from 'node:fs';
import { createRequire } from 'node:module';
const PROJ = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const require = createRequire(PROJ + '/package.json');
const d3 = require('d3-geo');
const D = process.env.SERVEIS.replace(/\/?$/, '/');
const J = f => JSON.parse(fs.readFileSync(D + f, 'utf8'));

// ---------- Municipis ----------
const lines = fs.readFileSync(PROJ + '/data/raw/municipis-cens-2025.csv', 'utf8').trim().split('\n').slice(1);
const M = new Map(); // codi6 -> muni
const ine2c6 = new Map();
for (const l of lines) {
  const [codi, comarca, alt, sup, pob] = l.split(';');
  M.set(codi, { codi, ine: codi.slice(0, 5), comarca, alt: +alt, km2: +sup, pob: +pob, n: {} });
  ine2c6.set(codi.slice(0, 5), codi);
}
const METRO = new Set(['Barcelonès', 'Baix Llobregat', 'Vallès Occidental', 'Vallès Oriental', 'Maresme']);
const TOTPOB = [...M.values()].reduce((s, m) => s + m.pob, 0);
const TOTKM2 = [...M.values()].reduce((s, m) => s + m.km2, 0);

// Polígons municipals ICGC 1:50.000 (v2r2, 2026-01-20) per a point-in-polygon i centroides
const icgc = J('icgc-municipis-50000.json');
const polyByC6 = new Map();
for (const f of icgc.features) {
  // d3-geo vol anells en sentit horari; si l'àrea surt > hemisferi, s'inverteixen
  if (d3.geoArea(f) > 2 * Math.PI) {
    const rev = poly => poly.map(r => [...r].reverse());
    f.geometry.coordinates = f.geometry.type === 'Polygon' ? rev(f.geometry.coordinates) : f.geometry.coordinates.map(rev);
  }
  const c6 = f.properties.CODIMUNI; if (M.has(c6)) { M.get(c6).nom = f.properties.NOMMUNI; polyByC6.set(c6, { f, b: d3.geoBounds(f) }); }
}
const unmatchedPoly = icgc.features.filter(f => !M.has(f.properties.CODIMUNI)).map(f => f.properties.CODIMUNI);
const missingPoly = [...M.keys()].filter(c => !polyByC6.has(c));
function pip0(lon, lat) {
  for (const [c6, { f, b }] of polyByC6) {
    if (lon < b[0][0] || lon > b[1][0] || lat < b[0][1] || lat > b[1][1]) continue;
    if (d3.geoContains(f, [lon, lat])) return c6;
  }
  return null;
}
// Els polígons d'es-atlas són simplificats: punts costaners (estacions, bancs de primera línia) poden quedar
// fora. Si el punt no cau en cap polígon, es desplaça en anells de 0,3 / 0,7 / 1,5 km fins a trobar-ne un.
let pipNudged = 0;
function pip(lon, lat, nudge = true) {
  const c = pip0(lon, lat); if (c || !nudge) return c;
  for (const r of [0.3, 0.7, 1.5]) for (let a = 0; a < 360; a += 30) {
    const dlat = r / 111.2 * Math.cos(a * Math.PI / 180), dlon = r / (111.2 * Math.cos(lat * Math.PI / 180)) * Math.sin(a * Math.PI / 180);
    const c2 = pip0(lon + dlon, lat + dlat); if (c2) { pipNudged++; return c2; }
  }
  return null;
}

// Punt de referència del municipi: coordenades de l'ajuntament (Equipaments); si no, centroide del polígon
const EQ = J('equipaments.json');
const pad6 = c => String(c).padStart(6, '0');
// codi_municipi d'Equipaments: 6 xifres Idescat, sovint sense el 0 inicial; 135 registres sense codi -> point-in-polygon
let eqNoCode = 0;
function eqC6(r) {
  if (r.codi_municipi) return pad6(r.codi_municipi);
  if (r.latitud) { eqNoCode++; return pip(+r.longitud, +r.latitud); }
  return null;
}
for (const r of EQ) {
  if (/Ajuntaments/.test(r.categoria || '') && r.latitud) {
    const m = M.get(eqC6(r)); if (m && !m.ref) m.ref = [+r.longitud, +r.latitud];
  }
}
let refFallback = [];
for (const m of M.values()) {
  const p = polyByC6.get(m.codi);
  if (!m.ref || (!d3.geoContains(p.f, m.ref) && hav(m.ref, d3.geoCentroid(p.f)) > 5)) { refFallback.push(m.codi); m.ref = d3.geoCentroid(p.f); }
}

// ---------- Registre de serveis ----------
function hav(a, b) { return d3.geoDistance(a, b) * 6371.0088; }
const P = {}; // cat -> array de {c6, lon, lat, nom}
const badCoord = {};
function add(cat, c6, lon, lat, nom) {
  if (!c6 || !M.has(c6)) { (P._fora ??= {})[cat] = (P._fora[cat] || 0) + 1; return; }
  lon = +lon; lat = +lat;
  // coordenada vàlida si cau dins el polígon del seu municipi o a <2 km del seu punt de referència
  let ok = isFinite(lon) && isFinite(lat) && lon !== 0;
  if (ok) { const pf = polyByC6.get(c6).f; ok = d3.geoContains(pf, [lon, lat]) || hav(M.get(c6).ref, [lon, lat]) < 2 || pip(lon, lat, false) === null && hav(M.get(c6).ref, [lon, lat]) < 5; }
  if (!ok) badCoord[cat] = (badCoord[cat] || 0) + 1;
  (P[cat] ??= []).push({ c6, lon, lat, nom, ok });
  M.get(c6).n[cat] = (M.get(c6).n[cat] || 0) + 1;
}

// Equipaments de Catalunya (8gmd-gz7i)
for (const r of EQ) {
  const c = r.categoria || '', c6 = eqC6(r), a = [c6, r.longitud, r.latitud, r.nom];
  if (c.includes("1. Centres d'atenció primària")) {
    add('salut_primaria', ...a);
    if (/^(CAP|Consultori|CUAP|EAP)/i.test(r.nom)) add('cap_o_consultori', ...a);
  }
  if (c.includes('2. Centres amb atenció continuada')) add('atencio_continuada', ...a);
  if (c.includes('3. Hospitals')) {
    add('hospital', ...a);
    if (/Urgències i emergències 24 h/i.test(r.propietats || '')) add('hospital_urg24', ...a);
  }
  if (c.startsWith('Universitats') && c.includes('Centre docent')) add('univ_centre', ...a);
  if (c.includes("Estacions d'autobusos")) add('estacio_bus', ...a);
}

// Centres docents curs 2025/2026 (kvmv-ahh4)
for (const r of J('centres_docents.json')) {
  // error a la font: 39 centres d'Esplugues de Llobregat porten el codi de Barcelona (080193)
  const c6d = r.codi_municipi_6 === '080193' && r.nom_municipi !== 'Barcelona' ? pip(+r.coordenades_geo_x, +r.coordenades_geo_y) : r.codi_municipi_6;
  const a = [c6d, r.coordenades_geo_x, r.coordenades_geo_y, r.denominaci_completa];
  const pub = r.nom_naturalesa === 'Públic';
  if (r.einf1c) add('llar_infants', ...a);
  if (r.epri) { add('primaria', ...a); if (pub) add('primaria_pub', ...a); }
  if (r.eso) { add('eso', ...a); if (pub) add('eso_pub', ...a); }
  if (r.batx) add('batxillerat', ...a);
  if (r.cfpm || r.cfps) add('fp', ...a);
  if (r.cfps) add('fp_superior', ...a);
}

// Establiments sanitaris (nrmq-ytje): farmàcies
for (const r of J('establiments_sanitaris.json')) {
  const c6 = ine2c6.get(String(r.municipi_codi).padStart(5, '0'));
  if (r.tipus_establiment_nom === 'Farmàcia') add('farmacia', c6, r.longitud, r.latitud, r.establiment_nom);
  if (r.tipus_establiment_nom === 'Farmaciola') add('farmaciola', c6, r.longitud, r.latitud, r.establiment_nom);
}

// Equipaments culturals (48s6-82h2)
for (const r of J('equipaments_culturals.json')) {
  const a = [r.id_municipi, r.longitud, r.latitud, r.nom];
  if (r.tipus === 'Biblioteques' && /^Pública/.test(r.subtipus) && !/Bibliobús/.test(r.subtipus)) add('biblioteca_publica', ...a);
  if (r.tipus === 'Cinemes') add('cinema', ...a);
  if (r.tipus === 'Espais escènics i musicals' && /Teatre|Auditori/.test(r.subtipus)) add('teatre_auditori', ...a);
  if (r.tipus === "Museus, col·leccions i centres d'interpretació") add('museu', ...a);
  if (r.tipus.startsWith('Centres culturals')) add('centre_cultural', ...a);
}

// Cens d'Equipaments Esportius (5zd6-bk6r)
for (const r of J('ceec_installacions.json')) {
  if (/^Privada residencial/.test(r.titularitat)) continue; // exclou piscines d'urbanització/hotel
  const a = [r.ine, r.longitud, r.latitud, r.instal_laci];
  add('esport_installacio', ...a);
  if (+r.pav > 0) add('pavello', ...a);
  if (+r.pco > 0) add('piscina_coberta', ...a);
}

// Estacions de tren (GTFS Renfe Rodalies/Cercanías, Renfe AV/LD/MD, FGC) -> point-in-polygon
function csv(f) {
  const [h, ...rows] = fs.readFileSync(D + f, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const H = h.split(',').map(s => s.trim());
  return rows.map(l => { const v = l.split(','); return Object.fromEntries(H.map((k, i) => [k, (v[i] || '').trim()])); });
}
const stationSeen = new Map(); // c6 -> [ [lon,lat], ... ] per deduplicar entre operadors (<400 m)
let stationsRaw = 0;
for (const feed of ['renfe_cer', 'renfe_avldmd', 'fgc']) {
  const used = new Set(csv(`gtfs/${feed}/stop_times.txt`).map(r => r.stop_id));
  const stops = csv(`gtfs/${feed}/stops.txt`);
  const parentUsed = new Set(stops.filter(s => used.has(s.stop_id) && s.parent_station).map(s => s.parent_station));
  for (const s of stops) {
    if (!(used.has(s.stop_id) && !s.parent_station) && !parentUsed.has(s.stop_id)) continue;
    const lon = +s.stop_lon, lat = +s.stop_lat;
    if (lon < 0.1 || lon > 3.4 || lat < 40.5 || lat > 42.9) continue;
    const c6 = pip(lon, lat); if (!c6) continue;
    stationsRaw++;
    const prev = stationSeen.get(c6) || [];
    if (prev.some(p => hav(p, [lon, lat]) < 0.4)) continue; // mateixa estació, altre operador
    prev.push([lon, lat]); stationSeen.set(c6, prev);
    add('estacio_tren', c6, lon, lat, s.stop_name + ' (' + feed + ')');
  }
}

// OpenStreetMap (Overpass) -> point-in-polygon
const osm = J('osm_serveis.json').elements;
for (const e of osm) {
  const lon = e.lon ?? e.center?.lon, lat = e.lat ?? e.center?.lat; if (lon == null) continue;
  const t = e.tags || {}; const k = t.shop === 'supermarket' ? 'supermarket' : /^(bank|atm|cinema|theatre|pharmacy|post_office)$/.test(t.amenity) ? t.amenity : null; if (!k) continue;
  const c6 = pip(lon, lat); if (!c6) continue;
  add('osm_' + k, c6, lon, lat, t.name || '');
  if (k === 'bank' || k === 'atm') add('osm_bank_o_atm', c6, lon, lat, t.name || '');
}

// ---------- Estadístiques ----------
const munis = [...M.values()];
const fmt = n => n.toLocaleString('ca-ES');
const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
const out = { totals: { munis: munis.length, pob: TOTPOB, km2: +TOTKM2.toFixed(1) }, checks: { unmatchedPoly, missingPoly, refFallback, eqNoCode, pipNudged, stationsRaw, fora: P._fora, badCoord }, cats: {} };
const cats = Object.keys(P).filter(k => k !== '_fora');
const metroPob = munis.filter(m => METRO.has(m.comarca)).reduce((s, m) => s + m.pob, 0);
const bcnesPob = munis.filter(m => m.comarca === 'Barcelonès').reduce((s, m) => s + m.pob, 0);
const bcnPob = M.get('080193').pob;
for (const k of cats) {
  const tot = P[k].length;
  const sense = munis.filter(m => !m.n[k]);
  const senseMetro = sense.filter(m => METRO.has(m.comarca));
  const metro = munis.filter(m => METRO.has(m.comarca)).reduce((s, m) => s + (m.n[k] || 0), 0);
  const bcnes = munis.filter(m => m.comarca === 'Barcelonès').reduce((s, m) => s + (m.n[k] || 0), 0);
  const bcn = M.get('080193').n[k] || 0;
  out.cats[k] = {
    total: tot,
    munis_amb: munis.length - sense.length,
    munis_sense: sense.length,
    pct_munis_sense: +(100 * sense.length / munis.length).toFixed(1),
    pob_sense: sense.reduce((s, m) => s + m.pob, 0),
    km2_sense: +sense.reduce((s, m) => s + m.km2, 0).toFixed(0),
    pct_km2_sense: +(100 * sense.reduce((s, m) => s + m.km2, 0) / TOTKM2).toFixed(1),
    per10k_cat: +(1e4 * tot / TOTPOB).toFixed(2),
    per10k_metro: +(1e4 * metro / metroPob).toFixed(2),
    per10k_resta: +(1e4 * (tot - metro) / (TOTPOB - metroPob)).toFixed(2),
    pct_metro: +(100 * metro / tot).toFixed(1),
    pct_barcelones: +(100 * bcnes / tot).toFixed(1),
    pct_bcn_ciutat: +(100 * bcn / tot).toFixed(1),
    per_100km2_cat: +(100 * tot / TOTKM2).toFixed(2),
  };
}
out.pesos = { pct_pob_metro: +(100 * metroPob / TOTPOB).toFixed(1), pct_pob_barcelones: +(100 * bcnesPob / TOTPOB).toFixed(1), pct_pob_bcn: +(100 * bcnPob / TOTPOB).toFixed(1),
  pct_km2_metro: +(100 * munis.filter(m => METRO.has(m.comarca)).reduce((s, m) => s + m.km2, 0) / TOTKM2).toFixed(1) };

// Mida de municipi: % que té el servei, per trams de població
const trams = [[0, 100], [100, 250], [250, 500], [500, 1000], [1000, 2000], [2000, 5000], [5000, 10000], [10000, 20000], [20000, 1e9]];
out.per_trams = trams.map(([a, b]) => {
  const g = munis.filter(m => m.pob >= a && m.pob < b);
  const o = { tram: `${a}-${b === 1e9 ? '…' : b}`, munis: g.length, pob: g.reduce((s, m) => s + m.pob, 0) };
  for (const k of ['primaria', 'eso', 'batxillerat', 'farmacia', 'cap_o_consultori', 'salut_primaria', 'biblioteca_publica', 'cinema', 'estacio_tren', 'osm_bank_o_atm', 'osm_supermarket', 'pavello', 'piscina_coberta'])
    o[k] = +(100 * g.filter(m => m.n[k]).length / g.length).toFixed(0);
  return o;
});

// Distància en línia recta (des de l'ajuntament) al servei més proper
function nearest(k, m) {
  if (m.n[k]) return { d: 0, nom: null }; // servei dins el mateix municipi => 0
  let best = Infinity, nom = null; for (const p of P[k]) { if (!p.ok) continue; const d = hav(m.ref, [p.lon, p.lat]); if (d < best) { best = d; nom = p.nom + ' · ' + p.c6; } }
  return { d: best, nom };
}
const distCats = ['hospital', 'hospital_urg24', 'eso', 'batxillerat', 'fp', 'farmacia', 'cinema', 'estacio_tren', 'univ_centre', 'biblioteca_publica', 'piscina_coberta', 'teatre_auditori'];
out.distancies = {};
for (const k of distCats) {
  const ds = munis.map(m => ({ m, ...nearest(k, m) }));
  for (const x of ds) x.m['d_' + k] = +x.d.toFixed(2);
  const bands = [5, 10, 20, 30, 45, 60];
  const o = { mitjana_pond_pob_km: +(ds.reduce((s, x) => s + x.d * x.m.pob, 0) / TOTPOB).toFixed(1),
    mitjana_munis_km: +(ds.reduce((s, x) => s + x.d, 0) / ds.length).toFixed(1) };
  for (const b of bands) {
    const g = ds.filter(x => x.d > b);
    o[`>${b}km`] = { munis: g.length, pob: g.reduce((s, x) => s + x.m.pob, 0), pct_pob: +(100 * g.reduce((s, x) => s + x.m.pob, 0) / TOTPOB).toFixed(2), pct_km2: +(100 * g.reduce((s, x) => s + x.m.km2, 0) / TOTKM2).toFixed(1) };
  }
  o.mes_lluny = ds.sort((a, b) => b.d - a.d).slice(0, 8).map(x => ({ codi: x.m.codi, nom: x.m.nom, comarca: x.m.comarca, pob: x.m.pob, km: +x.d.toFixed(1), mes_proper: x.nom }));
  out.distancies[k] = o;
}

// Distribució de la distància a l'hospital: població acumulada per km (per a corba)
out.corba_hospital = [];
{ const s = [...munis].sort((a, b) => a.d_hospital - b.d_hospital); let acc = 0;
  for (const m of s) { acc += m.pob; out.corba_hospital.push([m.d_hospital, +(100 * acc / TOTPOB).toFixed(3)]); } }

// Comarques: serveis per 10.000 hab i % municipis sense
const com = {};
for (const m of munis) { const c = (com[m.comarca] ??= { pob: 0, km2: 0, munis: 0, n: {}, sense: {} }); c.pob += m.pob; c.km2 += m.km2; c.munis++;
  for (const k of cats) { c.n[k] = (c.n[k] || 0) + (m.n[k] || 0); if (!m.n[k]) c.sense[k] = (c.sense[k] || 0) + 1; } }
out.comarques = Object.fromEntries(Object.entries(com).map(([k, c]) => [k, { pob: c.pob, km2: +c.km2.toFixed(0), munis: c.munis,
  per10k: Object.fromEntries(['farmacia', 'salut_primaria', 'primaria', 'biblioteca_publica', 'cinema', 'hospital', 'univ_centre', 'osm_bank_o_atm', 'esport_installacio'].map(s => [s, +(1e4 * (c.n[s] || 0) / c.pob).toFixed(2)])),
  n: Object.fromEntries(['farmacia', 'hospital', 'univ_centre', 'cinema', 'estacio_tren', 'batxillerat'].map(s => [s, c.n[s] || 0])),
  pct_munis_sense: Object.fromEntries(['primaria', 'farmacia', 'salut_primaria', 'osm_bank_o_atm', 'osm_supermarket', 'estacio_tren'].map(s => [s, +(100 * (c.sense[s] || 0) / c.munis).toFixed(0)])) }]));

// Nombre de serveis "bàsics" (canasta) per municipi
const BASIC = ['primaria', 'farmacia', 'salut_primaria', 'biblioteca_publica', 'osm_supermarket', 'osm_bank_o_atm', 'estacio_tren', 'eso'];
const hist = {}; for (const m of munis) { m.basics = BASIC.filter(k => m.n[k]).length; const h = (hist[m.basics] ??= { munis: 0, pob: 0, km2: 0 }); h.munis++; h.pob += m.pob; h.km2 += m.km2; }
for (const h of Object.values(hist)) h.km2 = +h.km2.toFixed(0);
out.cistella = { serveis: BASIC, histograma: hist };

fs.writeFileSync(D + 'resultats.json', JSON.stringify(out, null, 1));
const cols = ['codi', 'nom', 'comarca', 'pob', 'km2', 'alt', 'lon', 'lat', 'basics', ...cats.map(k => 'n_' + k), ...distCats.map(k => 'd_' + k)];
fs.writeFileSync(D + 'serveis-municipis.csv', cols.join(';') + '\n' + munis.map(m => cols.map(c =>
  c === 'lon' ? m.ref[0].toFixed(5) : c === 'lat' ? m.ref[1].toFixed(5) : c.startsWith('n_') ? (m.n[c.slice(2)] || 0) : m[c]).join(';')).join('\n') + '\n');
const pts = {}; for (const k of cats) pts[k] = P[k].map(p => [+p.lon.toFixed(5), +p.lat.toFixed(5), p.c6]);
fs.writeFileSync(D + 'punts-serveis.json', JSON.stringify(pts));

console.log('checks', JSON.stringify(out.checks));
console.log('pesos', out.pesos);
console.table(Object.fromEntries(Object.entries(out.cats).map(([k, v]) => [k, { tot: v.total, sense: v.munis_sense, pctS: v.pct_munis_sense, pobSense: v.pob_sense, pctKm2S: v.pct_km2_sense, p10kMet: v.per10k_metro, p10kResta: v.per10k_resta, pctBcnes: v.pct_barcelones, pctBCN: v.pct_bcn_ciutat }])));
console.table(out.per_trams);
for (const [k, v] of Object.entries(out.distancies)) { const { mes_lluny, ...r } = v; console.log(k, JSON.stringify(r)); console.log('   ', mes_lluny.slice(0, 5).map(x => `${x.nom}(${x.comarca},${x.pob}h):${x.km}km→${x.mes_proper}`).join(' | ')); }
console.log('cistella', JSON.stringify(out.cistella));
