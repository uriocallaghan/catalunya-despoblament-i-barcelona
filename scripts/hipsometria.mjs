// Distribució del territori català per altitud (corba hipsomètrica).
// Descarrega el Copernicus DEM GLO-90 (ESA, dades obertes a AWS) a una carpeta temporal, compta la
// superfície de cada franja d'altitud dins el límit de Catalunya i escriu data/raw/hipsometria.csv.
// Les rajoles s'esborren en acabar. Ús: npm run build:hipso
import fs from 'fs'; import os from 'os'; import path from 'path';
import * as tc from 'topojson-client'; import { fromArrayBuffer } from 'geotiff';

const t = JSON.parse(fs.readFileSync(new URL('../node_modules/es-atlas/es/municipalities.json', import.meta.url)));
const geoms = t.objects.municipalities.geometries.filter(g => ['08','17','25','43'].includes(g.id.slice(0,2)));
const outline = tc.merge(t, geoms); // MultiPolygon en lon/lat
const rings = outline.coordinates.flat(); // anells exteriors i forats: regla parell-senar

// Talls d'altitud en metres (franges de 100 m fins als 3.200 m).
const STEP = 100, NB = 33;
const area = new Float64Array(NB); // km²
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dem-'));
const R = 6371.0088, D2R = Math.PI / 180;

// Interseccions de tots els anells amb una latitud, ordenades (scanline parell-senar).
function crossings(lat) {
  const xs = [];
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[i], [x2, y2] = r[j];
    if ((y1 > lat) !== (y2 > lat)) xs.push(x1 + (lat - y1) / (y2 - y1) * (x2 - x1));
  }
  return xs.sort((a, b) => a - b);
}

let pixels = 0;
try {
  for (let lat = 40; lat <= 42; lat++) for (let lon = 0; lon <= 3; lon++) {
    const id = `Copernicus_DSM_COG_30_N${lat}_00_E00${lon}_00_DEM`;
    const url = `https://copernicus-dem-90m.s3.amazonaws.com/${id}/${id}.tif`;
    const res = await fetch(url);
    if (!res.ok) { console.log('sense rajola (mar)', id); continue; }
    const buf = await res.arrayBuffer(); const f = path.join(tmp, id + '.tif'); fs.writeFileSync(f, Buffer.from(buf));
    const img = await (await fromArrayBuffer(buf)).getImage();
    const [w, h] = [img.getWidth(), img.getHeight()]; const [ox, oy] = img.getOrigin(); const [rx, ry] = img.getResolution();
    const [z] = await img.readRasters();
    for (let y = 0; y < h; y++) {
      const la = oy + (y + .5) * ry; const xs = crossings(la); if (!xs.length) continue;
      const cell = (R * Math.abs(ry) * D2R) * (R * rx * D2R * Math.cos(la * D2R)); // km² del píxel
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, Math.ceil((xs[k] - ox) / rx - .5)), x1 = Math.min(w - 1, Math.floor((xs[k + 1] - ox) / rx - .5));
        for (let x = x0; x <= x1; x++) { const e = Math.max(0, z[y * w + x]); area[Math.min(NB - 1, Math.floor(e / STEP))] += cell; pixels++; }
      }
    }
    console.log(id, w + '×' + h);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const TA = area.reduce((s, a) => s + a, 0);
console.log('píxels', pixels, 'superfície', TA.toFixed(0), 'km² (oficial 32.108)');
const out = ['min_m;max_m;km2', ...[...area].map((a, i) => `${i * STEP};${(i + 1) * STEP};${a.toFixed(2)}`)].join('\n') + '\n';
fs.writeFileSync(new URL('../data/raw/hipsometria.csv', import.meta.url), out);
console.log('<100 m:', (area[0] / TA * 100).toFixed(1) + '%', '| ≥1000 m:', (area.slice(10).reduce((s, a) => s + a, 0) / TA * 100).toFixed(1) + '%');
