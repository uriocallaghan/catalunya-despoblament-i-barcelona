import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { neighbors } from 'topojson-client';
import { historic } from './historic.mjs';

const atlas=JSON.parse(fs.readFileSync(new URL('../node_modules/es-atlas/es/municipalities.json',import.meta.url)));
const raw=new Map(fs.readFileSync(new URL('../data/raw/municipis-cens-2025.csv',import.meta.url),'utf8').trim().split('\n').slice(1).map(l=>{
  const [code,,,area,pop]=l.split(';'); return [code.slice(0,5),{a:+area,p:+pop}];
}));
const geoms=atlas.objects.municipalities.geometries.filter(g=>raw.has(g.id));
const M=geoms.map((g,i)=>({i,k:g.id,n:g.properties.name,...raw.get(g.id)}));
const byName=new Map(M.map(m=>[m.n,m.i]));
const H=historic(M,neighbors(geoms),[1857,1981,2025]);

test('el repartiment del Vallès conserva el total i marca també els municipis d’origen',()=>{
  const ids=['Vilanova del Vallès','Vallromanes','Montornès del Vallès','La Roca del Vallès'].map(n=>byName.get(n));
  assert.ok(ids.every(i=>H.merged[1857].includes(i)));
  assert.ok(Math.abs(ids.reduce((s,i)=>s+H.values[1857][i],0)-(1180+1775))<1e-9);
  // Martorelles pertany al grup separat de Santa Maria de Martorelles, no al de Vilanova/Vallromanes.
  assert.ok(Math.abs(['Martorelles','Santa Maria de Martorelles'].reduce((s,n)=>s+H.values[1857][byName.get(n)],0)-677)<1e-9);
});
test('Vilanova conserva la dada oficial reconstruïda del 1981',()=>{
  const i=byName.get('Vilanova del Vallès');
  assert.equal(H.values[1981][i],1322); assert.ok(!H.merged[1981].includes(i));
});
test('el cens del 2025 no s’imputa ni s’altera',()=>{
  assert.deepEqual(H.merged[2025],[]); assert.deepEqual(H.values[2025],M.map(m=>m.p));
});
