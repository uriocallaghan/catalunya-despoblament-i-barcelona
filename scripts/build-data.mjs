// Genera data/catalunya.json a partir de data/raw/municipis-cens-2025.csv (Idescat) i els límits municipals d'es-atlas (IGN).
// Ús: npm install && npm run build:data
import fs from 'fs'; import * as tc from 'topojson-client'; import * as ts from 'topojson-server';
import * as geo from 'd3-geo'; import * as force from 'd3-force';
const t=JSON.parse(fs.readFileSync(new URL('../node_modules/es-atlas/es/municipalities.json', import.meta.url)));
const C={}; fs.readFileSync(new URL('../data/raw/municipis-cens-2025.csv', import.meta.url),'utf8').trim().split('\n').slice(1).forEach(l=>{const [c,com,alt,a,p]=l.split(';'); C[c.slice(0,5)]={com,alt:+alt,a:+a,p:+p};});
const geoms=t.objects.municipalities.geometries.filter(g=>['08','17','25','43'].includes(g.id.slice(0,2)));
const fc=tc.feature(t,{type:'GeometryCollection',geometries:geoms});
const COMS=[...new Set(Object.values(C).map(x=>x.com))].sort((a,b)=>a.localeCompare(b,'ca'));
const feats=fc.features.map((f,i)=>({type:'Feature',id:i,geometry:f.geometry,properties:{k:f.id,c:COMS.indexOf(C[f.id].com)}}));
const topo=ts.topology({m:{type:'FeatureCollection',features:feats}},3e4);
const W=1000;
const outline=tc.merge(topo,topo.objects.m.geometries);
const proj=geo.geoMercator().fitExtent([[8,8],[W-8,W-8]],outline);
const path=geo.geoPath(proj); const H=Math.ceil(path.bounds(outline)[1][1]+8);
let rs=20250101; const rnd=()=>{rs=(rs*1664525+1013904223)>>>0; return rs/4294967296;};
const M=feats.map((f,i)=>{ const d=C[f.properties.k]; const c=path.centroid(f); return {i,k:f.properties.k,n:fc.features[i].properties.name,...d,cx:c[0],cy:c[1],f}; });
const TP=M.reduce((s,m)=>s+m.p,0);
const k=Math.sqrt(0.30*W*H/(Math.PI*TP));
const nodes=M.map(m=>({m,r:Math.max(0.4,Math.sqrt(m.p)*k),x:m.cx,y:m.cy,gx:m.cx,gy:m.cy}));
const sim=force.forceSimulation(nodes).force('x',force.forceX(d=>d.gx).strength(.12)).force('y',force.forceY(d=>d.gy).strength(.12)).force('c',force.forceCollide(d=>d.r+.6).iterations(4)).stop();
for(let i=0;i<520;i++){ sim.tick(); nodes.forEach(d=>{ d.x=Math.max(d.r,Math.min(W-d.r,d.x)); d.y=Math.max(d.r,Math.min(H-d.r,d.y)); }); }
nodes.forEach(d=>{d.m.dx=d.x; d.m.dy=d.y; d.m.dr=d.r;});
const dots=[];
for(const m of M){ let n=Math.floor(m.p/500); if(rnd()<(m.p%500)/500) n++;
  const bb=path.bounds(m.f); let tries=0,placed=0;
  while(placed<n && tries<n*400+400){ tries++; const x=bb[0][0]+rnd()*(bb[1][0]-bb[0][0]), y=bb[0][1]+rnd()*(bb[1][1]-bb[0][1]);
    if(geo.geoContains(m.f,proj.invert([x,y]))){ dots.push(Math.round(x*8),Math.round(y*8)); placed++; } }
  while(placed<n){ dots.push(Math.round(m.cx*8+(rnd()-.5)*8),Math.round(m.cy*8+(rnd()-.5)*8)); placed++; } }
const b64=Buffer.from(new Uint16Array(dots).buffer).toString('base64');
// name fix: use es-atlas names (Catalan)
const MUN=M.map(m=>[m.n,m.c=COMS.indexOf(m.com),m.p,m.a,m.alt,+m.cx.toFixed(1),+m.cy.toFixed(1),+m.dx.toFixed(1),+m.dy.toFixed(1),+m.dr.toFixed(2)]);
topo.objects.m.geometries.forEach(g=>{delete g.properties;});
const data={W,H,scale:proj.scale(),translate:proj.translate(),coms:COMS,topo,mun:MUN,dots:b64};
const OUT=new URL('../data/catalunya.json', import.meta.url); fs.writeFileSync(OUT,JSON.stringify(data));
console.log('H',H,'dots',dots.length/2,'KB',(fs.statSync(OUT).size/1024).toFixed(0));
const TA=M.reduce((s,m)=>s+m.a,0);
const byP=[...M].sort((a,b)=>b.p-a.p); let cp=0,ca=0,n=0; for(const m of byP){cp+=m.p;ca+=m.a;n++; if(cp>=TP/2)break;} console.log('half pop',n,'munis',(ca/TA*100).toFixed(2)+'% area');
const byD=[...M].sort((a,b)=>b.p/b.a-a.p/a.a); console.log(byD.slice(0,5).map(m=>m.n+' '+Math.round(m.p/m.a)).join(' | ')); console.log(byD.slice(-5).map(m=>m.n+' '+(m.p/m.a).toFixed(2)).join(' | '));
let c2=0,a2=0,k2=0; for(const m of byD){c2+=m.p;a2+=m.a;k2++; if(c2>=TP/2)break;} console.log('half by density',k2,(a2/TA*100).toFixed(2));
const sm=M.filter(m=>m.p<=500); console.log('<=500',sm.length,(sm.reduce((s,m)=>s+m.a,0)/TA*100).toFixed(1),(sm.reduce((s,m)=>s+m.p,0)/TP*100).toFixed(2));
const hi=M.filter(m=>m.alt>=1000); console.log('>=1000m',hi.length,(hi.reduce((s,m)=>s+m.a,0)/TA*100).toFixed(1),(hi.reduce((s,m)=>s+m.p,0)/TP*100).toFixed(2));
const lo=M.filter(m=>m.alt<100); console.log('<100m',lo.length,(lo.reduce((s,m)=>s+m.a,0)/TA*100).toFixed(1),(lo.reduce((s,m)=>s+m.p,0)/TP*100).toFixed(2));
const d10=M.filter(m=>m.p/m.a<10); console.log('<10/km2',d10.length,(d10.reduce((s,m)=>s+m.a,0)/TA*100).toFixed(1),(d10.reduce((s,m)=>s+m.p,0)/TP*100).toFixed(2));
const bcn=M.find(m=>m.n==='Barcelona'); const small=[...M].sort((a,b)=>a.p-b.p); let s2=0,j=0; while(s2<bcn.p){s2+=small[j].p;j++;} const sa=small.slice(0,j).reduce((s,m)=>s+m.a,0); console.log('Barcelona pop equals',j,'smallest munis, area',sa.toFixed(0),(sa/TA*100).toFixed(1));
