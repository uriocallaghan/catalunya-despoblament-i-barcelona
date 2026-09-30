fetch("data/catalunya.json").then(r=>r.json()).then(function(D){
"use strict";
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s=>document.querySelector(s), $$ = s=>Array.from(document.querySelectorAll(s));
function fmt(n,d){ d=d||0; let s=Math.abs(n).toFixed(d).split('.'); s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (n<0?'−':'')+s[0]+(s[1]?','+s[1]:''); }
function pct(x,d){ if(d===undefined) d = x*100<1?2:1; return fmt(x*100,d)+'%'; }
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const R=[0,1,2,3,4,5,6,7].map(i=>tok('--r'+i)); const LAND=tok('--land'), BG=tok('--bg'), INK=tok('--ink'), MUTED=tok('--muted'), LINE=tok('--line'), PANEL=tok('--panel'), RED=tok('--red');
const rgba=(hex,a)=>{ const c=d3.rgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; };

/* ---------- municipal data ---------- */
const W=D.W, H=D.H;
const MUN=D.mun.map((r,i)=>({i,n:r[0],c:r[1],com:D.coms[r[1]],p:r[2],a:r[3],alt:r[4],cx:r[5],cy:r[6],dx:r[7],dy:r[8],dr:r[9],d:r[2]/r[3]}));
const TP=d3.sum(MUN,m=>m.p), TA=d3.sum(MUN,m=>m.a);
const byName=new Map(MUN.map(m=>[m.n.toLowerCase(),m]));
const proj=d3.geoMercator().scale(D.scale).translate(D.translate);
const gp=d3.geoPath(proj);
const OBJ=D.topo.objects.m;
const feats=topojson.feature(D.topo,OBJ).features;
const PD=new Array(MUN.length); feats.forEach(f=>{ PD[f.id]=gp(f); });
const OUTLINE=gp(topojson.mesh(D.topo,OBJ,(a,b)=>a===b));
const MUNMESH=gp(topojson.mesh(D.topo,OBJ,(a,b)=>a!==b));
const COMMESH=gp(topojson.mesh(D.topo,OBJ,(a,b)=>a!==b && MUN[a.id].c!==MUN[b.id].c));
const BINS=[10,25,50,100,250,1000,5000];
const dcls=d=>{ for(let i=0;i<BINS.length;i++) if(d<BINS[i]) return i; return 7; };
const dcol=d=>R[dcls(d)];
const muniHTML=m=>`<b>${m.n}</b> <span class="m">${m.com}</span><br><span class="num">${fmt(m.p)} habitants en ${fmt(m.a,2)} km²: ${fmt(m.d,m.d<10?2:(m.d<100?1:0))} per km²</span>`;
function baseMap(sel){ return d3.select(sel).attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','xMidYMid meet'); }
// Ressaltat en passar per sobre: desapareix en sortir del gràfic amb el ratolí o en tocar fora.
const CLEARS=[];
document.addEventListener('pointerdown',e=>CLEARS.forEach(([n,f])=>{ if(!n.contains(e.target)) f(); }));
function hoverable(svg, ps, onHover, onClear){
  let last=null;
  const act=function(e,m){ if(last===this) return; if(last) d3.select(last).classed('hl',false); last=this; d3.select(this).classed('hl',true).raise(); onHover && onHover(m); };
  const clear=()=>{ if(!last) return; d3.select(last).classed('hl',false); last=null; onClear && onClear(); };
  ps.on('pointerenter',act).on('click',act);
  svg.on('pointerleave.hv',e=>{ if(e.pointerType==='mouse') clear(); });
  CLEARS.push([svg.node(),clear]);
  return {act,clear};
}
function muniLayer(svg, fill, onHover, onClear){
  const g=svg.append('g');
  const ps=paint(g.selectAll('path').data(MUN).join('path').attr('class','mp').attr('d',m=>PD[m.i]),fill);
  const h=hoverable(svg,ps,onHover,onClear);
  return {g, ps, clear:h.clear, select:(m)=>{ const el=ps.filter(d=>d===m).node(); if(el) h.act.call(el,null,m); }};
}
// Els elements vermells apareixen quan entren a la pantalla.
function onView(el, fn, th){
  if(RM || !('IntersectionObserver' in window)){ fn(); return; }
  const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); fn(); } },{threshold:th||.3});
  io.observe(el);
}
// Pinta els municipis des del gris fins al seu color, amb un retard aleatori per a cadascun.
function revealFill(ps, fill){ paint(ps.style('transition-delay',()=>RM?'0ms':Math.round(Math.random()*1100)+'ms'),fill); setTimeout(()=>ps.style('transition-delay',null),2200); }
// Els límits comarcals porten una línia fosca subtil per sota perquè es vegin també sobre els colors clars.
const meshLayer=(svg,cls,d)=>{ if(cls==='mesh') svg.append('path').attr('class','mesh-u').attr('d',d); return svg.append('path').attr('class',cls).attr('d',d); };
// Vora dels municipis: del color del fons, excepte en els colors molt clars, on seria invisible i passa a ser un to més fosc del mateix color.
const edge=f=>{ if(!f||f===LAND) return BG; const c=d3.lab(f); return c.l>80 ? d3.lab(c.l-17,c.a*1.1,c.b*1.1).formatHex() : BG; };
function paint(sel,fill){ return sel.attr('fill',fill).style('--edge',function(d,i){ return edge(this.getAttribute('fill')); }); }

/* =========== 1. HERO =========== */
const BCN=MUN.find(m=>m.n==='Barcelona');
const asc=[...MUN].sort((a,b)=>a.p-b.p); const SMALL=new Set(); { let s=0; for(const m of asc){ if(s>=BCN.p) break; s+=m.p; SMALL.add(m); } }
const smallArea=d3.sum([...SMALL],m=>m.a), smallPop=d3.sum([...SMALL],m=>m.p);
$('#h1').textContent=`Barcelona té tants habitants com ${fmt(SMALL.size)} municipis catalans junts.`;
$('#lead').textContent=`Aquests ${fmt(SMALL.size)} pobles i viles sumen ${fmt(smallPop)} persones i ocupen el ${pct(smallArea/TA,0)} del territori. Barcelona, ${fmt(BCN.p)} persones en el ${pct(BCN.a/TA,2)}.`;
$('#heroSmallBtn').textContent=`Els ${fmt(SMALL.size)} municipis`;
let heroMode='both';
const heroFill=m=> m===BCN ? (heroMode!=='small'?R[6]:LAND) : SMALL.has(m) ? (heroMode!=='bcn'?R[2]:LAND) : LAND;
const hSvg=baseMap('#mHero');
const hL=muniLayer(hSvg,()=>LAND,m=>{ $('#rHero').innerHTML=muniHTML(m)+(m===BCN?'':SMALL.has(m)?'<br><span class="m">Forma part dels '+fmt(SMALL.size)+' municipis que, junts, sumen tanta gent com Barcelona.</span>':'<br><span class="m">És un dels '+fmt(947-SMALL.size-1)+' municipis restants.</span>'); },()=>heroRead());
meshLayer(hSvg,'mesh',COMMESH); meshLayer(hSvg,'outline',OUTLINE);
function heroPaint(stagger){
  hL.ps.style('transition-delay',m=> stagger&&!RM ? (m===BCN?'1900ms':(SMALL.has(m)?Math.round(Math.random()*1500)+'ms':'0ms')) : '0ms'); paint(hL.ps,heroFill);
  heroRead();
}
function heroRead(){
  $('#rHero').innerHTML = heroMode==='bcn' ? `<b>Barcelona</b>: ${fmt(BCN.p)} habitants en ${fmt(BCN.a,2)} km².` :
    heroMode==='small' ? `<b>${fmt(SMALL.size)} municipis</b>: ${fmt(smallPop)} habitants en ${fmt(smallArea)} km².` :
    `<b>Vermell fosc</b>: Barcelona. <b>Vermell clar</b>: els ${fmt(SMALL.size)} municipis que, junts, tenen la mateixa gent. <span class="m">Toca un municipi.</span>`;
}
$$('[data-hero]').forEach(b=>b.addEventListener('click',()=>{ heroMode=b.dataset.hero; $$('[data-hero]').forEach(x=>x.setAttribute('aria-pressed',x===b)); heroPaint(false); }));

/* =========== 2. DENSITAT =========== */
const low=MUN.filter(m=>m.d<10);
$('#densLede').textContent=`${fmt(low.length)} municipis tenen menys de 10 habitants per km². Ocupen el ${pct(d3.sum(low,m=>m.a)/TA)} de Catalunya i hi viu el ${pct(d3.sum(low,m=>m.p)/TP)} de la població. A l’altre extrem, l’Hospitalet de Llobregat passa de 23.000.`;
const dSvg=baseMap('#mDens');
const DENS0='Passa per sobre d’un municipi o toca’l.';
const dL=muniLayer(dSvg,()=>LAND,m=>{ $('#rDens').innerHTML=muniHTML(m)+`<br><span class="m">És el municipi número ${fmt(rankD.get(m))} de 947 per densitat.</span>`; },()=>{ $('#rDens').textContent=DENS0; });
onView($('#mDens'),()=>revealFill(dL.ps,m=>dcol(m.d)));
meshLayer(dSvg,'mesh',COMMESH); meshLayer(dSvg,'outline',OUTLINE);
const rankD=new Map([...MUN].sort((a,b)=>b.d-a.d).map((m,i)=>[m,i+1]));
const labs=['0','10','25','50','100','250','1.000','5.000'];
$('#legDens').innerHTML=R.map((c,i)=>`<div><i style="background:${c}"></i><span>${labs[i]}</span></div>`).join('')+'<span style="font-size:11px;color:var(--muted);align-self:flex-end;margin-left:.5rem;white-space:nowrap">hab/km²</span>';
$('#munlist').innerHTML=[...MUN].sort((a,b)=>a.n.localeCompare(b.n,'ca')).map(m=>`<option value="${m.n.replace(/"/g,'&quot;')}">`).join('');
$('#q').addEventListener('change',e=>{ const m=byName.get(e.target.value.trim().toLowerCase()); if(m) dL.select(m); });

/* =========== 3. PUNTS =========== */
const DOTS=(()=>{ const b=atob(D.dots); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Uint16Array(u.buffer); })();
$('#dotsNote').textContent=`${fmt(DOTS.length/2)} punts. Els municipis de menys de 500 habitants reben un punt amb una probabilitat proporcional a la seva població.`;
const DORD=(()=>{ const n=DOTS.length/2, o=new Uint32Array(n), rr=d3.randomLcg(7); for(let i=0;i<n;i++) o[i]=i; for(let i=n-1;i>0;i--){ const j=Math.floor(rr()*(i+1)); const t=o[i]; o[i]=o[j]; o[j]=t; } return o; })();
let dotsP=0;
function drawDots(){
  const cv=$('#cDots'); const cw=cv.clientWidth; if(!cw) return; const ch=cw*H/W; const dpr=devicePixelRatio||1;
  cv.width=Math.round(cw*dpr); cv.height=Math.round(ch*dpr); cv.style.height=ch+'px';
  const ctx=cv.getContext('2d'); const s=cw/W; ctx.setTransform(dpr*s,0,0,dpr*s,0,0);
  ctx.fillStyle=LAND;
  const land=new Path2D(); feats.forEach(f=>land.addPath(new Path2D(PD[f.id])));
  ctx.fill(land); ctx.strokeStyle=BG; ctx.lineWidth=.5/s; ctx.stroke(new Path2D(MUNMESH)); ctx.strokeStyle='#fff'; ctx.lineWidth=1.1/s; ctx.stroke(new Path2D(COMMESH));
  ctx.fillStyle=rgba(RED,.6); const r=(cw<500?.95:1.25)/s;
  const n=Math.round(DORD.length*dotsP);
  for(let k=0;k<n;k++){ const i=DORD[k]*2; ctx.beginPath(); ctx.arc(DOTS[i]/8, DOTS[i+1]/8, r, 0, 6.2832); ctx.fill(); }
}
onView($('#cDots'),()=>{ const t0=performance.now(), dur=RM?0:1800; const st=now=>{ const k=dur?Math.min(1,(now-t0)/dur):1; dotsP=d3.easeCubicOut(k); drawDots(); if(k<1) requestAnimationFrame(st); }; requestAnimationFrame(st); });

/* =========== 4. CARTOGRAMA CONTINU =========== */
// data/cartograma.json: arcs en projecció d'àrea igual (a0) i un cartograma per any (a), de scripts/build-data.mjs.
function labName(m){ return ({"L'Hospitalet de Llobregat":"L’Hospitalet","Santa Coloma de Gramenet":"Sta. Coloma","Sant Cugat del Vallès":"Sant Cugat","Cornellà de Llobregat":"Cornellà","Sant Boi de Llobregat":"Sant Boi"}[m.n]||m.n); }
const bSvg=baseMap('#mDor').attr('viewBox',`0 0 ${W} ${W}`);
fetch('data/cartograma.json').then(r=>r.json()).then(CA=>{
const Q=CA.q||10, dec=a=>{ const o=new Float32Array(a.length); let x=0,y=0; for(let i=0;i<a.length;i+=2){ x+=a[i]; y+=a[i+1]; o[i]=x/Q; o[i+1]=y/Q; } return o; };
const YR=CA.years, NY=YR.length, V=[CA.a0.map(dec),...CA.a.map(v=>v.map(dec))]; // V[0] mapa, V[k+1] cartograma de YR[k]
const KT=V[0].map(a=>new Float32Array(a)), KS=V[0].map(a=>new Float32Array(a));
const MERGED=CA.merged.map(l=>new Set(l));
const GEO=OBJ.geometries.map(g=> g.type==='Polygon' ? [g.arcs] : g.type==='MultiPolygon' ? g.arcs : []);
const own=KT.map(()=>[]); GEO.forEach((polys,i)=>polys.forEach(p=>p.forEach(r=>r.forEach(a=>own[a<0?~a:a].push(i)))));
const arcPts=(a,rev)=>{ const k=KT[a], n=k.length/2; let s=''; for(let j=0;j<n;j++){ const q=rev?n-1-j:j; s+=(j?'L':'')+k[2*q].toFixed(1)+','+k[2*q+1].toFixed(1); } return s; };
const ringD=r=>'M'+r.map((a,j)=>{ const s=a<0?arcPts(~a,true):arcPts(a,false); return j? s.slice(s.indexOf('L')+1) : s; }).join('L')+'Z';
const geoD=i=>GEO[i].map(p=>p.map(ringD).join('')).join('');
const arcsD=list=>list.map(a=>'M'+arcPts(a,false)).join('');
const COMARC=own.map((o,a)=>o.length===2&&MUN[o[0]].c!==MUN[o[1]].c?a:-1).filter(a=>a>=0), OUTARC=own.map((o,a)=>o.length===1?a:-1).filter(a=>a>=0);
const st={mode:'map', yi:NY-1, timer:null, shown:false, play:null};
$('#dorYear').max=NY-1; $('#dorYear').value=NY-1;
const bPs=bSvg.append('g').selectAll('path').data(MUN).join('path').attr('class','mp').attr('fill-rule','evenodd').attr('fill',LAND);
const bMu=bSvg.append('path').attr('class','mesh-u'), bMesh=bSvg.append('path').attr('class','mesh'), bOut=bSvg.append('path').attr('class','outline');
const BIGL=[...MUN].sort((a,b)=>b.p-a.p).slice(0,14);
const blab=bSvg.append('g').selectAll('text').data(BIGL).join('text').attr('class','blab').attr('dy','.35em').attr('opacity',0).text(m=>labName(m));
const popY=(m,yi)=>CA.pop[yi][m.i], totY=yi=>d3.sum(CA.pop[yi]);
const densNow=m=> st.mode==='map' ? m.d : popY(m,st.yi)/m.a;
function draw(){ const m=bMesh.attr('d',arcsD(COMARC)).attr('d'); bPs.attr('d',d=>geoD(d.i)); bMu.attr('d',m); bOut.attr('d',arcsD(OUTARC)); }
draw();
function recolor(){ if(st.shown) paint(bPs,m=>dcol(densNow(m))); }
// Etiquetes: només les que caben dins el municipi i no en trepitgen una de més gran.
function labels(delay){
  const cartOn=st.mode==='cart', yi=st.yi, sc=($('#mDor').clientWidth||400)/W, tot=totY(yi);
  const side=m=>Math.sqrt(popY(m,yi)/tot*W*W), lfs=m=>Math.min(24/Math.max(sc,.5),Math.max(10/sc,side(m)*.8/(labName(m).length*.56)));
  const boxes=[], vis=new Set(); if(cartOn) [...BIGL].sort((a,b)=>popY(b,yi)-popY(a,yi)).forEach(m=>{ const f=lfs(m), w=labName(m).length*f*.56, [x,y]=CA.cen[yi][m.i], b=[x-w/2,y-f*.6,x+w/2,y+f*.6];
    if(side(m)*.95<=w || boxes.some(o=>b[0]<o[2]&&b[2]>o[0]&&b[1]<o[3]&&b[3]>o[1])) return; boxes.push(b); vis.add(m); });
  blab.interrupt().attr('opacity',0).filter(m=>vis.has(m)).attr('x',m=>CA.cen[yi][m.i][0]).attr('y',m=>CA.cen[yi][m.i][1]).attr('font-size',lfs).attr('fill',m=>dcls(densNow(m))>=5?BG:INK)
    .transition().delay(RM?0:delay).duration(RM?0:450).attr('opacity',1);
}
// Transició de la forma actual a la versió k (0 = mapa real).
function morph(k,dur){
  if(st.timer) st.timer.stop();
  KT.forEach((a,i)=>KS[i].set(a)); const T=V[k];
  const step=e=>{ for(let a=0;a<KT.length;a++){ const s=KS[a],t=T[a],o=KT[a]; for(let j=0;j<o.length;j++) o[j]=s[j]+(t[j]-s[j])*e; } draw(); };
  if(RM||!dur){ step(1); return; }
  st.timer=d3.timer(el=>{ const q=Math.min(1,el/dur); step(d3.easeCubicInOut(q)); if(q>=1) st.timer.stop(); });
}
const READ0=()=>{ if(st.mode==='map') return '<span class="m">Toca un municipi o passa al cartograma.</span>';
  const yi=st.yi, y=YR[yi], tot=totY(yi), bcn=popY(BCN,yi);
  return `L’any <b>${y}</b> Catalunya tenia ${fmt(tot)} habitants. Barcelona n’era el ${pct(bcn/tot,0)} i ocupa el mateix tros del mapa. <span class="m">Toca un municipi.</span>`; };
const bH=hoverable(bSvg,bPs,m=>{
  if(st.mode==='map'){ $('#rDor').innerHTML=muniHTML(m)+`<br><span class="m">Al mapa real ocupa el ${pct(m.a/TA)} de Catalunya; al cartograma del 2025, el ${pct(m.p/TP)}.</span>`; return; }
  const yi=st.yi, y=YR[yi], v=popY(m,yi);
  $('#rDor').innerHTML=`<b>${m.n}</b> <span class="m">${m.com}</span><br>`+(MERGED[yi].has(m.i)
    ? `<span class="m">El ${y} encara formava part d’un altre municipi. Es compta amb aquell, amb la mateixa densitat.</span>`
    : `<span class="num">${fmt(v)} habitants el ${y}: ocupa el ${pct(v/totY(yi))} del cartograma i el ${pct(m.a/TA)} del territori.</span>`);
},()=>{ $('#rDor').innerHTML=READ0(); });
function setYear(yi,dur){ st.yi=yi; $('#dorYear').value=yi; $('#dorYearOut').textContent=YR[yi]; morph(yi+1,dur); recolor(); labels(dur*.8); bH.clear(); $('#rDor').innerHTML=READ0(); }
function setMode(mode){
  st.mode=mode; $$('[data-dor]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.dor===mode)); $('#dorYearBox').hidden=mode!=='cart'; stopPlay();
  const dur=2200; if(mode==='cart') setYear(st.yi,dur); else { morph(0,dur); recolor(); labels(0); bH.clear(); $('#rDor').innerHTML=READ0(); }
}
function stopPlay(){ if(st.play){ clearTimeout(st.play); st.play=null; } $('#dorPlay').setAttribute('aria-pressed','false'); $('#dorPlay').textContent='▶'; }
$('#dorPlay').addEventListener('click',()=>{
  if(st.play){ stopPlay(); return; }
  $('#dorPlay').setAttribute('aria-pressed','true'); $('#dorPlay').textContent='❚❚';
  let yi=st.yi===NY-1?0:st.yi; const next=()=>{ setYear(yi,1000); if(yi>=NY-1){ st.play=setTimeout(stopPlay,1000); return; } yi++; st.play=setTimeout(next,1350); }; next();
});
$$('[data-dor]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.dor)));
$('#dorYear').addEventListener('input',e=>{ stopPlay(); setYear(+e.target.value,900); });
$('#rDor').innerHTML=READ0();
onView($('#mDor'),()=>{ st.shown=true; revealFill(bPs,m=>dcol(densNow(m))); });
const errs=CA.err.map(e=>e*100);
$('#cartNote').textContent=`Mètode: cartograma de difusió de Gastner i Newman (PNAS, 2004) sobre una projecció azimutal d’àrea igual de Lambert, en una malla de 512 × 512 cel·les i refinat en fins a 5 iteracions. Error d’àrea mitjà, ponderat per població: entre el ${fmt(d3.min(errs),1)}% i el ${fmt(d3.max(errs),1)}% segons l’any. Fins al 1991, població de fet dels censos; des del 2001, padró municipal (Idescat). Els municipis que encara no existien es compten amb el d’on es van segregar. Tots els anys ocupen la mateixa superfície total: el que canvia és com es reparteix. El color és la densitat de cada any.`;
}).catch(e=>console.error(e));

/* =========== 5. PICS =========== */
const sSvg=d3.select('#mSpk').attr('viewBox',`0 -150 ${W} ${H+150}`);
sSvg.append('g').selectAll('path').data(MUN).join('path').attr('d',m=>PD[m.i]).attr('fill',LAND).attr('stroke','#fff').attr('stroke-width',.3).style('vector-effect','non-scaling-stroke');
meshLayer(sSvg,'mesh',COMMESH);
const maxP=d3.max(MUN,m=>m.p);
const spikes=sSvg.append('g').selectAll('path').data([...MUN].sort((a,b)=>a.cy-b.cy)).join('path')
  .attr('fill',rgba(RED,.18)).attr('stroke',RED).attr('stroke-width',.9).style('vector-effect','non-scaling-stroke').attr('stroke-linejoin','round');
const spkPath=(m,h)=>{ const w=7; return `M${(m.cx-w/2).toFixed(1)},${m.cy.toFixed(1)}L${m.cx.toFixed(1)},${(m.cy-h).toFixed(1)}L${(m.cx+w/2).toFixed(1)},${m.cy.toFixed(1)}`; };
const spkH=m=>(m.p/maxP)*(BCN.cy+120);
let spkShown=false;
function spkPaint(anim){ spikes.attr('opacity',m=>spkShown&&spkH(m)<2?.35:1); spikes.transition().duration(RM||!anim?0:1200).ease(d3.easeCubicOut).attr('d',m=>spkPath(m,spkShown?spkH(m):0));
  const sc=($('#mSpk').clientWidth||400)/W; d3.select('#bcnLab').style('font-size',(13/sc)+'px').style('stroke-width',(3/sc)+'px').transition().duration(RM||!anim?0:1200).attr('y',BCN.cy-spkH(BCN)-6/sc).attr('opacity',spkShown?1:0); }
spikes.attr('d',m=>spkPath(m,0));
sSvg.append('text').attr('class','lab').attr('x',BCN.cx).attr('text-anchor','middle').attr('y',BCN.cy).attr('opacity',0).attr('font-size',22).text('Barcelona').attr('id','bcnLab');

/* =========== 6. TRAMS =========== */
const TR=[500,2000,5000,10000,50000]; const TRL=['fins a 500','501–2.000','2.001–5.000','5.001–10.000','10.001–50.000','més de 50.000'];
const tcls=p=>{ for(let i=0;i<TR.length;i++) if(p<=TR[i]) return i; return 5; };
const TC=[R[1],R[2],R[3],R[4],R[5],R[7]];
const tram=TRL.map((l,i)=>{ const ms=MUN.filter(m=>tcls(m.p)===i); return {l,n:ms.length,a:d3.sum(ms,m=>m.a),p:d3.sum(ms,m=>m.p)}; });
$('#tramTitle').textContent=`Un de cada tres ajuntaments governa un poble de 500 habitants o menys`;
let tramF=null;
const tSvg=baseMap('#mTram');
let tramShown=false;
const tL=muniLayer(tSvg,()=>LAND,m=>{ $('#rTram').innerHTML=muniHTML(m); },()=>tramRead());
const tramFill=m=> tramF===null ? TC[tcls(m.p)] : (tcls(m.p)===tramF ? RED : LAND);
onView($('#mTram'),()=>{ tramShown=true; revealFill(tL.ps,tramFill); });
meshLayer(tSvg,'mesh',COMMESH); meshLayer(tSvg,'outline',OUTLINE);
function triHTML(){
  const rows=[['Municipis','n',947],['Territori','a',TA],['Població','p',TP]];
  return rows.map(([lab,k,T])=>`<div class="row"><span>${lab}</span><div class="bar">${tram.map((t,i)=>`<div style="flex:${t[k]/T} 1 0;background:${tramF===null?TC[i]:(i===tramF?RED:PANEL)};${i?'border-left:1px solid var(--bg)':''}" title="${t.l}"></div>`).join('')}</div></div>`).join('');
}
function tramPaint(){
  $('#tri').innerHTML=triHTML();
  if(tramShown) paint(tL.ps,tramFill);
  $('#tramChips').innerHTML=TRL.map((l,i)=>`<button class="chip" data-t="${i}" aria-pressed="${tramF===i}"><i style="background:${TC[i]}"></i>${l}</button>`).join('');
  $$('[data-t]').forEach(b=>b.addEventListener('click',()=>{ const t=+b.dataset.t; tramF=tramF===t?null:t; tramPaint(); }));
  tramRead();
}
function tramRead(){
  const t=tramF===null?tram[0]:tram[tramF];
  $('#rTram').innerHTML = `<b>${fmt(t.n)} municipis ${tramF===null?'de 500 habitants o menys':'de '+t.l+' habitants'}</b>: el ${pct(t.n/947)} dels ajuntaments, el ${pct(t.a/TA)} del territori i el ${pct(t.p/TP)} de la població.`;
}

/* =========== 7. LORENZ =========== */
const LZ=(()=>{ const s=[...MUN].sort((a,b)=>b.d-a.d); let ca=0,cp=0; const pts=[[0,0,0]]; s.forEach((m,i)=>{ ca+=m.a; cp+=m.p; pts.push([ca/TA,cp/TP,i+1]); }); return pts; })();
const lzAt=q=>{ for(const p of LZ) if(p[1]>=q) return p; return LZ[LZ.length-1]; };
{ const h=lzAt(.5); $('#lorTitle').textContent=`La meitat de la gent viu en el ${pct(h[0])} del territori`; }
let lorShown=false;
function drawLor(){
  const svg=d3.select('#lor'); const Wd=Math.min(svg.node().parentNode.clientWidth,476), Hd=Wd; const m={l:34,r:8,t:10,b:30};
  svg.attr('viewBox',`0 0 ${Wd} ${Hd}`).attr('width',Wd).attr('height',Hd); svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([0,1]).range([m.l,Wd-m.r]), y=d3.scaleLinear().domain([0,1]).range([Hd-m.b,m.t]);
  [0,.25,.5,.75,1].forEach(v=>{ svg.append('line').attr('x1',x(0)).attr('x2',x(1)).attr('y1',y(v)).attr('y2',y(v)).attr('stroke',LINE);
    svg.append('text').attr('class','ax').attr('x',m.l-6).attr('y',y(v)).attr('dy','.32em').attr('text-anchor','end').text(v*100+'%');
    svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',Hd-10).attr('text-anchor',v===0?'start':v===1?'end':'middle').text(v*100+'%'); });
  svg.append('text').attr('class','ax').attr('x',x(1)).attr('y',Hd-m.b-6).attr('text-anchor','end').text('territori →');
  svg.append('text').attr('class','ax').attr('x',x(0)+6).attr('y',y(1)+12).text('↑ població');
  svg.append('line').attr('x1',x(0)).attr('y1',y(0)).attr('x2',x(1)).attr('y2',y(1)).attr('stroke',MUTED).attr('stroke-dasharray','3 4');
  const ar=svg.append('path').datum(LZ).attr('fill',rgba(RED,.1)).attr('d',d3.area().x(p=>x(p[0])).y0(p=>y(p[0])).y1(p=>y(p[1]))).attr('opacity',lorShown?1:0);
  const ln=svg.append('path').datum(LZ).attr('fill','none').attr('stroke',RED).attr('stroke-width',2.2).attr('d',d3.line().x(p=>x(p[0])).y(p=>y(p[1])));
  const g=svg.append('g').attr('id','lzMark').attr('opacity',lorShown?1:0);
  if(!lorShown){ const L=ln.node().getTotalLength(); ln.attr('stroke-dasharray',L).attr('stroke-dashoffset',L);
    svg.node()._rv=()=>{ ln.transition().duration(1600).ease(d3.easeCubicInOut).attr('stroke-dashoffset',0).on('end',()=>ln.attr('stroke-dasharray',null)); ar.transition().delay(900).duration(900).attr('opacity',1); g.transition().delay(1400).duration(500).attr('opacity',1); }; }
  g.append('line').attr('class','lx').attr('stroke',INK).attr('stroke-width',1);
  g.append('line').attr('class','ly').attr('stroke',INK).attr('stroke-width',1);
  g.append('circle').attr('r',5).attr('fill',INK);
  svg.node()._s={x,y};
  updLor();
}
function updLor(){
  const q=+$('#lorIn').value/100; const p=lzAt(q); const svg=d3.select('#lor'); const {x,y}=svg.node()._s;
  const g=svg.select('#lzMark'); g.select('circle').attr('cx',x(p[0])).attr('cy',y(p[1]));
  g.select('.lx').attr('x1',x(p[0])).attr('x2',x(p[0])).attr('y1',y(0)).attr('y2',y(p[1]));
  g.select('.ly').attr('x1',x(0)).attr('x2',x(p[0])).attr('y1',y(p[1])).attr('y2',y(p[1]));
  $('#rLor').innerHTML=`El <b>${pct(p[1],0)}</b> de la població viu en el <b>${pct(p[0])}</b> del territori, repartit en ${fmt(p[2])} municipis. <span class="m">Mou el control.</span>`;
}
$('#lorIn').addEventListener('input',updLor);

/* =========== 8. ALTITUD =========== */
const ALTB=[[0,100,'< 100 m'],[100,500,'100–500 m'],[500,1000,'500–1.000 m'],[1000,3000,'> 1.000 m']];
const altS=ALTB.map(([a,b,l])=>{ const ms=MUN.filter(m=>m.alt>=a&&m.alt<b); return {l,n:ms.length,a:d3.sum(ms,m=>m.a),p:d3.sum(ms,m=>m.p)}; });
$('#altTitle').textContent=`El ${pct(altS[0].p/TP,0)} de la gent viu per sota dels 100 metres`;
function drawAlt(){
  const svg=d3.select('#alt'); const Wd=Math.min(svg.node().parentNode.clientWidth,697), Hd=Math.round(Math.max(320,Math.min(520,Wd*.66))); const m={l:44,r:10,t:40,b:34};
  svg.attr('viewBox',`0 0 ${Wd} ${Hd}`).attr('width',Wd).attr('height',Hd); svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([0,1600]).range([m.l,Wd-m.r]), y=d3.scaleLog().domain([.5,40000]).range([Hd-m.b,m.t]);
  const r=d3.scaleSqrt().domain([0,maxP]).range([1.4,Wd<500?16:26]);
  [1,10,100,1000,10000].forEach(v=>{ svg.append('line').attr('x1',m.l).attr('x2',Wd-m.r).attr('y1',y(v)).attr('y2',y(v)).attr('stroke',LINE);
    svg.append('text').attr('class','ax').attr('x',m.l-6).attr('y',y(v)).attr('dy','.32em').attr('text-anchor','end').text(fmt(v)); });
  [0,400,800,1200,1600].forEach(v=>svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',Hd-12).attr('text-anchor',v===0?'start':(v===1600?'end':'middle')).text(fmt(v)+' m'));
  svg.append('text').attr('class','ax').attr('x',0).attr('y',12).text('Habitants per km² (escala logarítmica)');
  const cs=svg.append('g').selectAll('circle').data([...MUN].sort((a,b)=>b.p-a.p)).join('circle')
    .attr('cx',d=>x(Math.min(d.alt,1600))).attr('cy',d=>y(Math.max(d.d,.5))).attr('r',d=>altShown?r(d.p):0)
    .attr('fill',rgba(RED,.22)).attr('stroke',RED).attr('stroke-width',.7).style('cursor','pointer');
  hoverable(svg,cs,d=>{ $('#rAlt').innerHTML=muniHTML(d)+`<br><span class="m">Altitud del nucli: ${fmt(d.alt)} m</span>`; },()=>{ $('#rAlt').innerHTML=ALT0; });
  svg.node()._rv=()=>cs.transition().duration(900).delay(d=>x(Math.min(d.alt,1600))/Wd*1100).ease(d3.easeBackOut).attr('r',d=>r(d.p));
}
let altShown=false; const ALT0='<span class="m">Toca un cercle.</span>';
$('#rAlt').innerHTML=ALT0;

/* =========== 8b. HIPSOMETRIA =========== */
// Territori: Copernicus DEM GLO-90 per franges de 100 m (scripts/hipsometria.mjs). Població: altitud del nucli de cada municipi.
const HIP=D.hipso, HTA=d3.sum(HIP), HB=HIP.length;
const hipPop=new Array(HB).fill(0); MUN.forEach(m=>{ hipPop[Math.min(HB-1,Math.floor(m.alt/100))]+=m.p; });
const hipTop=HIP.reduce((k,a,i)=>a>0?i:k,0);
const hipMed=(()=>{ let c=0; for(let i=0;i<HB;i++){ c+=HIP[i]; if(c>=HTA/2) return (i+(HTA/2-(c-HIP[i]))/HIP[i])*100; } })();
const hip1000=d3.sum(HIP.slice(10))/HTA, popLow=hipPop[0]/TP;
$('#hipTitle').textContent=`Però només el ${pct(HIP[0]/HTA,0)} del territori és per sota dels 100 metres`;
$('#hipLede').textContent=`La meitat del sòl de Catalunya és per sobre dels ${fmt(Math.round(hipMed/10)*10)} metres i el ${pct(hip1000,0)} passa dels 1.000. A l’esquerra, quanta terra hi ha a cada altitud; a la dreta, quanta gent hi viu.`;
$('#hipNote').textContent=`Territori: model digital d’elevacions Copernicus GLO-90 (ESA), ${fmt(HTA)} km² en píxels de 90 m dins del límit de Catalunya. Població: cada municipi, a l’altitud del seu nucli (Idescat). Franges de 100 metres.`;
let hipShown=false;
function drawHip(){
  const svg=d3.select('#hip'); const Wd=Math.min(svg.node().parentNode.clientWidth,646), rows=hipTop+1, rh=Wd<500?9:11, top=26, Hd=top+rows*rh+8;
  svg.attr('viewBox',`0 0 ${Wd} ${Hd}`).attr('width',Wd).attr('height',Hd); svg.selectAll('*').remove();
  const mid=Wd/2, gap=Wd<500?30:42, maxV=Math.max(d3.max(HIP)/HTA,d3.max(hipPop)/TP);
  const x=d3.scaleLinear().domain([0,maxV]).range([0,mid-gap]);
  const yy=i=>top+(hipTop-i)*rh;
  svg.append('text').attr('class','ax').attr('x',mid-gap).attr('y',12).attr('text-anchor','end').text('Territori');
  svg.append('text').attr('class','ax').attr('x',mid+gap).attr('y',12).text('Població');
  const bars=[];
  for(let i=0;i<=hipTop;i++){
    const a=HIP[i]/HTA, p=hipPop[i]/TP;
    bars.push(svg.append('rect').attr('x',mid-gap).attr('y',yy(i)).attr('height',rh-1.5).attr('width',0).attr('fill',R[2]).datum({w:x(a),left:true,i}));
    bars.push(svg.append('rect').attr('x',mid+gap).attr('y',yy(i)).attr('height',rh-1.5).attr('width',0).attr('fill',R[5]).datum({w:x(p),left:false,i}));
    if(i%5===0) svg.append('text').attr('class','ax').attr('x',mid).attr('y',yy(i)+rh/2).attr('dy','.32em').attr('text-anchor','middle').text(i?fmt(i*100)+' m':'0 m');
  }
  const lab=(i,v,left)=>svg.append('text').attr('class','lab').attr('x',left?mid-gap-x(v)-6:mid+gap+x(v)+6).attr('y',yy(i)+rh/2).attr('dy','.34em').attr('text-anchor',left?'end':'start').text(pct(v,0)).attr('opacity',hipShown?1:0).attr('class','lab hl0');
  lab(0,HIP[0]/HTA,true); lab(0,popLow,false);
  const set=(sel,anim)=>sel.forEach((b,k)=>{ const d=b.datum(); (anim?b.transition().delay(d.i*28).duration(700).ease(d3.easeCubicOut):b).attr('width',d.w).attr('x',d.left?mid-gap-d.w:mid+gap); });
  if(hipShown) set(bars,false);
  svg.node()._rv=()=>{ set(bars,true); svg.selectAll('.hl0').transition().delay(900).duration(500).attr('opacity',1); };
}
/* =========== COMARQUES DATA =========== */
const YEARS=[1857,1860,1877,1887,1900,1910,1920,1930,1936,1940,1945,1950,1955,1960,1965,1970,1975,1981,1986,1991,2025];
const RAW=[
["Alt Camp","Alt Camp","l",47138,538,87.6,41.33,1.29,[38507,38822,36989,37917,33769,33117,31601,30368,29597,28492,28506,28475,28169,27314,28636,29573,30821,32522,33725,34244]],
["Alt Empordà","A. Empordà","l",150044,1358,110.5,42.30,2.93,[74231,72691,75213,72549,66810,70509,70269,66464,67052,63892,64024,63643,60867,63725,72701,72111,77901,81852,87842,93285]],
["Alt Penedès","A. Penedès","l",116098,593,195.9,41.40,1.72,[36497,38076,39298,44545,41362,42904,45778,47681,47496,46799,46713,46091,46244,47281,51432,56415,60893,64834,66824,69960]],
["Alt Urgell","Alt Urgell","l",21477,1447,14.8,42.25,1.40,[28296,28896,23643,21897,19083,19709,20181,20933,20074,19274,22089,22134,22963,20948,19825,19897,19232,19828,19444,19829]],
["Alta Ribagorça","Ribagorça","l",4051,427,9.5,42.47,0.80,[4600,4756,4264,4069,3497,3728,3699,3333,3476,3198,3450,5296,7172,6444,5699,4590,3890,4344,3415,3276]],
["Anoia","Anoia","l",129956,866,150.0,41.62,1.60,[44304,42186,41377,40097,35753,37495,40997,41945,43226,41904,42405,43905,44737,48695,57249,66002,72555,78031,78908,83215]],
["Aran","Aran","",10651,634,16.8,42.73,0.85,[9908,11272,7957,7410,6389,6650,6608,6182,5942,4681,4839,6555,7439,6525,6096,5055,5484,5923,7011,7443]],
["Bages","Bages","el",187620,1092,171.8,41.82,1.80,[58852,60133,61289,66223,67381,67832,77460,88976,101355,96718,96734,102846,114906,127718,136849,137299,147705,150360,150134,152333]],
["Baix Camp","Baix Camp","el",207529,697,297.7,41.15,1.00,[58763,57887,58487,61637,58061,55985,60410,61342,57071,60657,63107,63213,64472,68963,83894,92874,107933,119564,125902,132683]],
["Baix Ebre","Baix Ebre","el",84077,1003,83.9,40.90,0.55,[40946,40797,43098,44443,46353,50438,55641,57751,58826,58866,63070,66426,69909,62400,62954,65267,65467,62528,64804,64683]],
["Baix Empordà","B. Empordà","el",144818,702,206.4,41.95,3.05,[50458,49833,50360,53095,55397,61674,60087,56094,55846,51653,50885,52103,55662,58799,66260,71198,76955,81454,83712,89723]],
["Baix Llobregat","Baix Llob.","el",856867,486,1763.1,41.38,1.98,[40659,40860,42952,46228,48349,52122,58561,84113,97414,93477,95768,103874,129004,174155,262221,389979,510461,572823,580775,609632]],
["Baix Penedès","B. Penedès","el",120720,296,407.2,41.23,1.55,[16680,17019,17507,18565,18752,18424,17930,17582,17129,16157,15953,16229,16480,17341,20414,22258,27483,29607,32970,37927]],
["Barcelonès","Barcelonès","el",2398280,146,16454.8,41.42,2.17,[250253,266240,373147,428085,570253,625957,767391,1106951,1183697,1206368,1340611,1438921,1604887,1821324,2041425,2281171,2412086,2453317,2361827,2336215]],
["Berguedà","Berguedà","el",41523,1185,35.0,42.13,1.82,[31759,30667,25292,22406,27217,30047,33615,39600,40140,38064,39248,41933,44575,47953,47155,45843,43995,42152,41441,39046]],
["Cerdanya","Cerdanya","la",20111,547,36.8,42.38,1.83,[14609,13505,12801,12724,11932,11891,11298,10692,11355,10035,11467,11582,11104,11850,12164,12465,12548,12456,12219,12528]],
["Conca de Barberà","Conca","la",20748,650,31.9,41.43,1.18,[30124,30202,28805,30591,27987,26721,26504,25763,25790,23085,22899,22720,21874,20403,19759,19004,18298,18141,18399,17819]],
["Garraf","Garraf","el",164223,185,887.2,41.27,1.78,[19351,20020,20857,21157,18905,18828,21090,26822,28970,27699,29016,31440,34882,39869,46493,54539,62590,68846,71396,76978]],
["Garrigues","Garrigues","les",19268,798,24.2,41.42,0.85,[24895,25569,27157,26677,28082,29802,30101,28830,28364,25827,25983,25656,25066,24036,23362,21870,20758,20212,20148,18740]],
["Garrotxa","Garrotxa","la",63339,735,86.2,42.17,2.50,[42891,43597,36591,38126,35944,38900,41048,40480,40664,40739,40605,39775,40890,40777,42255,44001,44235,44929,45096,45796]],
["Gironès","Gironès","el",208967,576,363.0,41.98,2.83,[44394,44427,44692,46751,45889,49083,51831,59026,61930,66151,65087,67239,70339,76470,86035,97282,107477,116739,122869,127664]],
["Lluçanès","Lluçanès","el",5723,227,25.3,42.02,2.05,null],
["Maresme","Maresme","el",477375,399,1197.8,41.58,2.52,[71855,70720,70117,69845,71671,76385,84301,97056,100873,99649,99856,104163,110512,125660,158319,190949,230795,252952,273673,293838]],
["Moianès","Moianès","el",14864,338,44.0,41.80,2.10,null],
["Montsià","Montsià","el",72825,735,99.0,40.65,0.50,[24946,26050,29263,29277,33027,35800,40094,39639,41303,39515,41756,42988,43169,43484,44789,45854,48516,52625,53455,53767]],
["Noguera","Noguera","la",39957,1784,22.4,41.93,1.00,[46103,48048,43127,42834,42130,41314,43451,42444,41473,39229,40924,39820,39234,39239,39429,38425,36332,35589,35598,34303]],
["Osona","Osona","",165946,1019,162.9,41.95,2.27,[66052,63791,60685,58450,60127,63800,68260,75396,77622,75175,77065,79036,83138,88462,95859,102330,107195,114612,115050,117653]],
["Pallars Jussà","P. Jussà","el",13593,1343,10.1,42.20,0.95,[28861,29086,25285,25622,20295,18996,20485,22108,20575,19991,19930,19792,20729,19985,18631,16210,15134,15633,15052,13832]],
["Pallars Sobirà","P. Sobirà","el",7332,1378,5.3,42.55,1.20,[18762,20112,15322,13878,12990,12475,13634,12507,12369,10483,11315,10223,10553,10240,9201,7700,6017,5247,5438,5046]],
["Pla d'Urgell","Pla d'Urgell","el",38529,305,126.3,41.63,0.85,[11330,11767,11727,14064,16783,19130,23558,23505,22586,23015,23859,24741,25261,26565,27254,28078,27937,28445,28437,28375]],
["Pla de l'Estany","Estany","el",33828,263,128.7,42.12,2.78,[15825,16357,14717,15188,14398,15096,15476,15992,16445,15863,15825,15879,16294,16682,17104,18140,19367,20696,21505,20961]],
["Priorat","Priorat","el",9415,499,18.9,41.20,0.80,[25040,24992,24857,27461,22635,22041,20688,18173,17789,15623,15341,14660,14446,14088,13528,12045,10918,10335,9940,8928]],
["Ribera d'Ebre","Ribera","la",22361,827,27.0,41.15,0.60,[25687,25465,26753,27628,29891,29321,30349,27362,28578,24420,27941,26050,25889,27647,28047,24774,24714,25125,23653,22734]],
["Ripollès","Ripollès","el",25914,957,27.1,42.25,2.18,[23331,23869,21828,23450,26180,27894,29504,30119,30918,27610,26650,29500,30788,30920,30866,30261,29417,29469,27957,26989]],
["Segarra","Segarra","la",22853,563,40.6,41.72,1.33,[26136,25384,22859,24144,21645,20759,21635,22311,22421,21470,21807,21593,20733,19662,19507,17933,17544,17285,16890,16644]],
["Segrià","Segrià","el",221630,1397,158.7,41.55,0.55,[55668,56345,57451,58055,59443,66698,84211,84585,82620,84278,93426,99377,104790,113748,122954,142444,152856,159434,162198,169472]],
["Selva","Selva","la",187308,995,188.2,41.80,2.70,[50149,51524,47633,48148,45803,47567,48737,48924,50422,48659,49262,50602,51544,54517,62938,71145,76116,82241,91326,105340]],
["Solsonès","Solsonès","el",15578,1161,13.4,42.02,1.50,[16182,15577,12768,12032,9649,9662,10113,11562,11642,11486,11660,12219,11163,11936,11089,10910,11235,10856,10577,10676]],
["Tarragonès","Tarragonès","el",279332,319,874.6,41.15,1.35,[40829,41184,44989,50071,44557,43849,48566,51253,51453,54913,55129,57525,58797,64898,86444,105545,136585,152050,155087,159296]],
["Terra Alta","Terra Alta","la",11385,743,15.3,41.03,0.42,[19071,19468,19357,20989,22932,22789,23365,21435,21457,17571,18389,18525,17198,16141,15535,14767,13848,13581,13346,12556]],
["Urgell","Urgell","l",39294,580,67.8,41.68,1.10,[28343,30222,27556,28938,29428,30870,32166,31808,32797,30454,31593,31762,31239,30471,30705,30345,29589,29618,29631,29163]],
["Vallès Occidental","Vallès Occ.","el",970228,583,1663.8,41.57,2.05,[50633,49853,58078,62660,69807,78058,99514,129298,142883,138126,149212,169492,218700,268386,356602,450721,545391,596893,619072,649280]],
["Vallès Oriental","Vallès Or.","el",431351,735,586.9,41.65,2.33,[46511,46573,45885,45623,45826,50548,54512,64887,69576,69708,69855,72310,78366,90058,116435,155298,194862,226382,240262,263887]]
];
const C=RAW.map(r=>({n:r[0],s:r[1],art:r[2],p:r[3],a:r[4],d:r[5],lat:r[6],lon:r[7],h:r[8]}));
const byC=Object.fromEntries(C.map(c=>[c.n,c]));
const CTA=d3.sum(C,c=>c.a), CTP=d3.sum(C,c=>c.p);
function withArt(c){ switch(c.art){case 'el':return 'el '+c.n; case 'la':return 'la '+c.n; case 'l':return "l’"+c.n; case 'les':return 'les '+c.n; default:return c.n;} }
function de(c){ switch(c.art){case 'el':return 'del '+c.n; case 'la':return 'de la '+c.n; case 'l':return "de l’"+c.n; case 'les':return 'de les '+c.n; default:return /^[AEIOUÀÈÉÍÒÓÚ]/.test(c.n)?"d’"+c.n:'de '+c.n;} }
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

/* =========== 9. BALANÇA =========== */
let balSel='Barcelonès';
$('#balTitle').textContent=`El ${pct(146/32108)} del territori acull el ${pct(2398280/8124126)} de la gent`;
let balShown=false;
function drawBal(){
  const svg=d3.select('#bal'); const Wd=Math.min(svg.node().parentNode.clientWidth,646); const Hd=Math.round(Math.max(470,Math.min(700,Wd*1.2)));
  svg.attr('viewBox',`0 0 ${Wd} ${Hd}`).attr('width',Wd).attr('height',Hd); svg.selectAll('*').remove();
  const top=26,bw=10,gap=1,xR=Wd-bw,mx=Wd/2; const data=[...C].sort((a,b)=>b.d-a.d); const avail=Hd-top-gap*(data.length-1);
  let yl=top,yr=top; data.forEach(d=>{ d.l0=yl; d.l1=yl+avail*d.a/CTA; yl=d.l1+gap; d.r0=yr; d.r1=yr+avail*d.p/CTP; yr=d.r1+gap; });
  svg.append('text').attr('class','ax').attr('x',0).attr('y',13).text('Superfície');
  svg.append('text').attr('class','ax').attr('x',Wd).attr('y',13).attr('text-anchor','end').text('Població');
  const g=svg.selectAll('g.rb').data(data).join('g').attr('class','rb').style('cursor','pointer').attr('tabindex',0).attr('role','button').attr('aria-label',d=>d.n)
    .on('click',(e,d)=>{balSel=d.n;updBal();}).on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();balSel=d.n;updBal();} })
    .style('opacity',balShown?1:0);
  svg.node()._rv=()=>g.transition().delay((d,i)=>i*35).duration(700).style('opacity',1);
  g.append('path').attr('d',d=>{ const r1=Math.max(d.r1,d.r0+.3), l1=Math.max(d.l1,d.l0+.3); return `M${bw},${d.l0}C${mx},${d.l0} ${mx},${d.r0} ${xR},${d.r0}L${xR},${r1}C${mx},${r1} ${mx},${l1} ${bw},${l1}Z`; }).attr('fill',d=>dcol(d.d));
  g.append('rect').attr('x',0).attr('y',d=>d.l0).attr('width',bw).attr('height',d=>Math.max(.6,d.l1-d.l0)).attr('fill',d=>dcol(d.d));
  g.append('rect').attr('x',xR).attr('y',d=>d.r0).attr('width',bw).attr('height',d=>Math.max(.6,d.r1-d.r0)).attr('fill',d=>dcol(d.d));
  data.forEach(d=>{ if(d.l1-d.l0>=14) svg.append('text').attr('class','lab').attr('x',bw+6).attr('y',(d.l0+d.l1)/2).attr('dy','.35em').text(d.n);
    if(d.r1-d.r0>=14) svg.append('text').attr('class','lab').attr('x',xR-6).attr('y',(d.r0+d.r1)/2).attr('dy','.35em').attr('text-anchor','end').text(d.s+'  '+pct(d.p/CTP)); });
  updBal();
}
function updBal(){
  d3.selectAll('#bal g.rb path').attr('opacity',d=>d.n===balSel?1:.5); d3.selectAll('#bal g.rb rect').attr('opacity',d=>d.n===balSel?1:.6);
  const c=byC[balSel]; $('#rBal').innerHTML=`<b>${cap(withArt(c))}</b> ocupa el ${pct(c.a/CTA)} del territori i hi viu el ${pct(c.p/CTP)} de la gent. <span class="m">${fmt(c.d,c.d<100?1:0)} habitants per km².</span>`;
}

/* =========== 10. CARTOGRAMA COMARCAL =========== */
const YOPTS=[1857,1900,1930,1950,1970,1991,2025];
const cart={mode:'area',yi:6,sel:null,W:0,H:0,cache:{},shown:false};
const popAt=(c,y)=> y===2025?c.p:(c.h?c.h[YEARS.indexOf(y)]:0);
const cYear=()=>cart.mode==='area'?null:YOPTS[cart.yi];
function cproj(c){ const lon0=.12,lon1=3.36,lat0=40.5,lat1=42.9,k=Math.cos(41.7*Math.PI/180); const gw=(lon1-lon0)*k,gh=lat1-lat0,pad=cart.W*.07; const s=Math.min((cart.W-2*pad)/gw,(cart.H-2*pad)/gh); const ox=(cart.W-gw*s)/2,oy=(cart.H-gh*s)/2; return [ox+(c.lon-lon0)*k*s, oy+(lat1-c.lat)*s]; }
function cLayout(){
  const y=cYear(); const key=y===null?'a':'p'+y; if(cart.cache[key]) return cart.cache[key];
  const WH=cart.W*cart.H, kA=Math.sqrt(.34*WH/(Math.PI*CTA)), kP=Math.sqrt(.34*WH/(Math.PI*CTP));
  const nodes=C.map(c=>{ const v=y===null?c.a:popAt(c,y); const r=Math.sqrt(v)*(y===null?kA:kP); const g=cproj(c); return {id:c.n,r,gx:g[0],gy:g[1],x:g[0],y:g[1]}; });
  const sim=d3.forceSimulation(nodes).force('x',d3.forceX(d=>d.gx).strength(.22)).force('y',d3.forceY(d=>d.gy).strength(.22)).force('c',d3.forceCollide(d=>d.r>0?d.r+1.2:0).iterations(3)).stop();
  for(let i=0;i<380;i++){ sim.tick(); nodes.forEach(d=>{ d.x=Math.max(d.r,Math.min(cart.W-d.r,d.x)); d.y=Math.max(d.r,Math.min(cart.H-d.r,d.y)); }); }
  const o={}; nodes.forEach(d=>o[d.id]=d); cart.cache[key]=o; return o;
}
const cDens=(c,y)=>{ if(y===null||y===2025) return c.d; const v=popAt(c,y); return v?v/c.a:c.d; };
const fsFor=(c,r)=>Math.min(15,(2*r*.88)/(c.s.length*.52));
function drawCart(){
  const svg=d3.select('#cart'); const Wd=Math.min(svg.node().parentNode.clientWidth,646); let instant=false;
  if(Wd!==cart.W){ cart.W=Wd; cart.H=Math.round(Math.max(320,Wd*.98)); cart.cache={}; instant=true; }
  svg.attr('viewBox',`0 0 ${cart.W} ${cart.H}`);
  const L=cLayout(), y=cYear();
  let g=svg.selectAll('g.b').data(C,d=>d.n);
  const ge=g.enter().append('g').attr('class','b').style('cursor','pointer').attr('tabindex',0).attr('role','button').attr('aria-label',d=>d.n)
    .on('click',(e,d)=>{cart.sel=d.n;cRead();drawCart();}).on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();cart.sel=d.n;cRead();drawCart();} });
  ge.append('circle').attr('cx',d=>L[d.n].x).attr('cy',d=>L[d.n].y).attr('r',0);
  ge.append('text').attr('class','blab').attr('dy','.36em').attr('x',d=>L[d.n].x).attr('y',d=>L[d.n].y).attr('opacity',0);
  g=ge.merge(g);
  const t=svg.transition().duration(instant||RM?0:1150).ease(d3.easeCubicInOut);
  g.select('circle').transition(t).attr('cx',d=>L[d.n].x).attr('cy',d=>L[d.n].y).attr('r',d=>cart.shown?L[d.n].r:0).attr('fill',d=>dcol(cDens(d,y)))
    .attr('stroke',d=>d.n===cart.sel?INK:BG).attr('stroke-width',d=>d.n===cart.sel?2.2:.8);
  g.select('text').text(d=>d.s).attr('fill',d=>dcls(cDens(d,y))>=4?BG:INK).transition(t).attr('x',d=>L[d.n].x).attr('y',d=>L[d.n].y)
    .attr('font-size',d=>Math.max(6,fsFor(d,L[d.n].r))).attr('opacity',d=>cart.shown&&fsFor(d,L[d.n].r)>=8.5?1:0);
}
function cRead(){
  const y=cYear(), c=cart.sel?byC[cart.sel]:null; let s;
  if(!c) s = cart.mode==='area' ? '<span class="m">Mida segons els km² de cada comarca. Toca una bombolla.</span>' : (y===2025 ? 'El Barcelonès engoleix el mapa. L’Alta Ribagorça és un punt.' : `Catalunya l’any ${y}: ${fmt(d3.sum(C,cc=>popAt(cc,y)))} habitants.`);
  else if(y===null) s=`<b>${cap(withArt(c))}</b>: ${fmt(c.a)} km² i ${fmt(c.p)} habitants.`;
  else { const v=popAt(c,y); s = v ? `<b>${cap(withArt(c))}</b> l’any ${y}: ${fmt(v)} habitants.` + (y!==2025&&c.h ? ` <span class="m">Avui: ${fmt(c.p)} (${c.p>=v?'+':'−'}${fmt(Math.abs(c.p/v-1)*100)}%).</span>` : '') : `El ${y}, els municipis ${de(c)} formaven part d’altres comarques.`; }
  $('#rCart').innerHTML=s;
}
$$('[data-cart]').forEach(b=>b.addEventListener('click',()=>{ cart.mode=b.dataset.cart; $$('[data-cart]').forEach(x=>x.setAttribute('aria-pressed',x===b)); $('#yearBox').hidden=cart.mode!=='pop'; cRead(); drawCart(); }));
$('#yearIn').addEventListener('input',e=>{ cart.yi=+e.target.value; $('#yearOut').textContent=YOPTS[cart.yi]; cRead(); drawCart(); });

/* =========== 11. FANTASMES =========== */
// Comarques amb menys habitants avui que el 1900. Cada punt són 500 persones del 1900: les que ja no hi són queden buides.
const GH=C.filter(c=>c.h).map(c=>{ let now=c.p; if(c.n==='Bages') now+=byC['Moianès'].p; if(c.n==='Osona') now+=byC['Lluçanès'].p;
  return {c,series:[...c.h,now],now,y1900:c.h[4]}; }).filter(g=>g.now<g.y1900).sort((a,b)=>a.now/a.y1900-b.now/b.y1900);
$('#ghostTitle').textContent=`${GH.length} comarques tenen avui menys habitants que l’any 1900`;
$('#ghostLede').textContent=`Mentrestant, Catalunya ha passat d’${fmt(1.966382,2)} a ${fmt(8.124126,2)} milions de persones, i el Barcelonès, de ${fmt(570253)} a ${fmt(2398280)}.`;
const GPER=500, GCOLS=10, GD=11;
$('#ghosts').innerHTML=GH.map((g,k)=>{
  const n=Math.round(g.y1900/GPER), keep=n-Math.max(1,Math.round((g.y1900-g.now)/GPER)), rows=Math.ceil(n/GCOLS), w=GCOLS*GD, h=rows*GD;
  const dots=d3.range(n).map(i=>`<circle cx="${(i%GCOLS)*GD+GD/2}" cy="${Math.floor(i/GCOLS)*GD+GD/2}" r="4" fill="${RED}" stroke="${RED}" stroke-width="1.2"${i>=keep?' class="lost"':''}/>`).join('');
  const sw=w, sh=34, xs=d3.scaleLinear().domain([1857,2025]).range([2,sw-2]), ys=d3.scaleLinear().domain([0,d3.max(g.series)]).range([sh-3,3]);
  const line=d3.line().x((v,i)=>xs(YEARS[i])).y(v=>ys(v)).curve(d3.curveMonotoneX)(g.series);
  return `<div class="gc"><h3>${g.c.n}</h3><div class="pc" data-v="${(g.now/g.y1900-1)*100}">0%</div><div class="yrs">${fmt(g.y1900)} el 1900 · ${fmt(g.now)} avui</div>
    <svg class="w" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${dots}</svg>
    <svg width="${sw}" height="${sh+12}" viewBox="0 0 ${sw} ${sh+12}" aria-hidden="true"><line x1="${xs(1900)}" x2="${xs(1900)}" y1="0" y2="${sh}" stroke="${LINE}"/><path d="${line}" fill="none" stroke="${MUTED}" stroke-width="1.2"/><circle cx="${xs(1900)}" cy="${ys(g.y1900)}" r="2.4" fill="${MUTED}"/><circle cx="${xs(2025)}" cy="${ys(g.now)}" r="3" fill="${RED}"/><text class="ax" x="${xs(1900)}" y="${sh+11}" text-anchor="middle">1900</text><text class="ax" x="${sw-2}" y="${sh+11}" text-anchor="end">2025</text></svg></div>`;
}).join('');
$$('#ghosts .gc').forEach(el=>onView(el,()=>{
  const lost=Array.from(el.querySelectorAll('circle.lost')).reverse(), pc=el.querySelector('.pc'), v=+pc.dataset.v, dur=RM?0:Math.max(900,lost.length*45);
  lost.forEach((c,i)=>setTimeout(()=>{ c.setAttribute('fill','transparent'); c.setAttribute('stroke',MUTED); },RM?0:400+i*45));
  const t0=performance.now()+ (RM?0:400); const st=now=>{ const k=dur?Math.max(0,Math.min(1,(now-t0)/dur)):1; pc.textContent=(k?'−':'')+fmt(Math.abs(v)*k)+'%'; if(k<1) requestAnimationFrame(st); }; requestAnimationFrame(st);
},.6));

/* =========== 12. KM² =========== */
function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const hash=s=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; };
let kmA=BCN, kmB=byName.get('gisclareny'), kmP=0;
$('#kA').value=kmA.n; $('#kB').value=kmB.n;
function paintKm(cv,m){
  const S=cv.clientWidth; if(!S) return; const dpr=devicePixelRatio||1; cv.width=Math.round(S*dpr); cv.height=Math.round(S*dpr);
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,S,S);
  // Mateixa mida de punt per a tots els municipis: la comparació és de densitat, no de mida.
  const N=Math.max(1,Math.round(m.d)), n=Math.round(N*kmP); const rr=mulberry(hash(m.n)); ctx.fillStyle=RED;
  const r=Math.max(.6,S/340);
  for(let i=0;i<n;i++){ const x=r+rr()*(S-2*r), y=r+rr()*(S-2*r); ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fill(); }
}
onView($('#cvA'),()=>{ const t0=performance.now(), dur=RM?0:1600; const st=now=>{ const k=dur?Math.min(1,(now-t0)/dur):1; kmP=d3.easeCubicOut(k); paintKm($('#cvA'),kmA); paintKm($('#cvB'),kmB); if(k<1) requestAnimationFrame(st); }; requestAnimationFrame(st); });
function pr(p,n){ const rules=[["El ","del ","al "],["Els ","dels ","als "],["La ","de la ","a la "],["Les ","de les ","a les "],["L'","de l'","a l'"]];
  for(const [a,d,t] of rules) if(n.startsWith(a)) return (p==='de'?d:t)+n.slice(a.length);
  return p==='de' ? (/^[AEIOUÀÈÉÍÒÓÚH]/.test(n)?"d'"+n:'de '+n) : 'a '+n; }
const fitTxt=k=> k>=1 ? fmt(k,k<10?1:0)+' km²' : (k>=.01 ? fmt(k*100,1)+' hectàrees' : fmt(k*1e6)+' m²');
const space=m=>{ const m2=1e6/m.d; return m2<10000?`${fmt(m2)} m²`:`${fmt(m2/1e4,1)} hectàrees (uns ${fmt(m2/7140)} camps de futbol)`; };
function drawKm(){
  paintKm($('#cvA'),kmA); paintKm($('#cvB'),kmB);
  const dh=m=>`${fmt(m.d,m.d<10?2:(m.d<100?1:0))}<small>persones per km² ${pr('a',m.n)}</small>`;
  $('#dA').innerHTML=dh(kmA); $('#dB').innerHTML=dh(kmB);
  if(kmA===kmB){ $('#kmText').innerHTML='<span class="m">Tria dos municipis diferents.</span>'; return; }
  const [hi,lo]=kmA.d>=kmB.d?[kmA,kmB]:[kmB,kmA]; const r=hi.d/lo.d; const fit=lo.p/hi.d;
  $('#kmText').innerHTML=`Per cada persona que viu en un km² <b>${pr('de',lo.n)}</b>, n’hi ha <b>${fmt(r,r<10?1:0)}</b> ${pr('a',hi.n)}.<br><span class="m">Si es repartís el sòl, a cada habitant ${pr('de',hi.n)} li tocarien ${space(hi)}; a cada habitant ${pr('de',lo.n)}, ${space(lo)}. Tota la gent ${pr('de',lo.n)} cabria en ${fitTxt(fit)} ${pr('de',hi.n)}.</span>`;
}
['A','B'].forEach(k=>$('#k'+k).addEventListener('change',e=>{ const m=byName.get(e.target.value.trim().toLowerCase()); if(m){ if(k==='A') kmA=m; else kmB=m; drawKm(); } }));

/* =========== 13. GRAELLA =========== */
const GC=200,GR=165,NC=32915,CN=[23763,5580,2398,985,185,4],CL=['cap habitant','1–99','100–999','1.000–9.999','10.000–49.999','50.000 o més'];
const GCOL=[LAND,R[1],R[2],R[4],R[6],R[7]];
const sx=new Float32Array(NC),sy=new Float32Array(NC),tx=new Float32Array(NC),ty=new Float32Array(NC),dl=new Float32Array(NC); const byCat=[[],[],[],[],[],[]];
(function(){ const rr=mulberry(20250101); const gauss=()=>{ let u=0; while(!u) u=rr(); return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*rr()); };
  const occ=new Uint8Array(NC); let id=0; for(let c=5;c>=0;c--) for(let k=0;k<CN[c];k++){ byCat[c].push(id++); }
  const free=()=>{ let s; do{ s=Math.floor(rr()*NC); }while(occ[s]); return s; };
  const put=(cid,cx,cy,sg)=>{ let s=-1; for(let t=0;t<40;t++){ const x=Math.round(cx+gauss()*sg), y=Math.round(cy+gauss()*sg); if(x<0||y<0||x>=GC||y>=GR) continue; const k=y*GC+x; if(k>=NC||occ[k]) continue; s=k; break; } if(s<0) s=free(); occ[s]=1; sx[cid]=s%GC; sy[cid]=Math.floor(s/GC); };
  const east=()=>[GC*(1-Math.pow(rr(),1.7)*.95),GR*(.12+rr()*.84)], any=()=>[rr()*GC,rr()*GR], me=[GC*.8,GR*.6];
  byCat[5].forEach(c=>put(c,me[0],me[1],1.3));
  const s4=d3.range(11).map(east); byCat[4].forEach((c,i)=>{ if(i<112) put(c,me[0],me[1],4.6); else { const s=s4[i%11]; put(c,s[0],s[1],1.7);} });
  const s3=d3.range(58).map(()=>rr()<.72?east():any()); byCat[3].forEach((c,i)=>{ if(rr()<.2) put(c,me[0],me[1],11); else { const s=s3[i%58]; put(c,s[0],s[1],2.6);} });
  const s2=d3.range(180).map(()=>rr()<.5?east():any()); byCat[2].forEach((c,i)=>{ const s=s2[i%180]; put(c,s[0],s[1],3.3); });
  const s1=d3.range(430).map(any); byCat[1].forEach((c,i)=>{ const s=s1[i%430]; put(c,s[0],s[1],4.6); });
  let e=0; for(let s=0;s<NC;s++) if(!occ[s]){ const c=byCat[0][e++]; sx[c]=s%GC; sy[c]=Math.floor(s/GC); }
  let k=0; for(let c=5;c>=0;c--) byCat[c].forEach(cid=>{ tx[cid]=k%GC; ty[cid]=Math.floor(k/GC); k++; });
  for(let i=0;i<NC;i++) dl[i]=rr()*.35; })();
let gT=0,gTo=0,gMode='all',gRaf=0;
const GTXT={all:`${fmt(NC-CN[0])} cel·les habitades i ${fmt(CN[0])} de buides.`, empty:`${fmt(CN[0])} cel·les sense ningú: el ${pct(CN[0]/NC)} del territori.`,
  most:`Les ${fmt(CN[2]+CN[3]+CN[4]+CN[5])} cel·les amb 100 habitants o més, el ${pct((CN[2]+CN[3]+CN[4]+CN[5])/NC)} del territori, apleguen el 98,5% de la població.`,
  half:`Només ${fmt(CN[4]+CN[5])} cel·les, el ${pct((CN[4]+CN[5])/NC)} del territori, apleguen el 50,6% de la població.`};
const gSt=c=>{ if(gMode==='all') return [GCOL[c],1]; if(gMode==='empty') return c===0?[R[3],1]:[GCOL[c],.14];
  if(gMode==='most') return c===0?[LAND,.5]:(c===1?[GCOL[1],.3]:[GCOL[c],1]); return c>=4?[R[5],1]:(c===0?[LAND,.45]:[GCOL[c],.14]); };
const eIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function drawGrid(){
  const cv=$('#grid'); const Wd=cv.clientWidth; if(!Wd) return; const cell=Wd/GC, Hd=cell*GR, dpr=devicePixelRatio||1;
  if(cv.width!==Math.round(Wd*dpr)){ cv.width=Math.round(Wd*dpr); cv.height=Math.round(Hd*dpr); cv.style.height=Hd+'px'; }
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,Wd,Hd); const sz=cell>=3?cell-.7:cell+.05;
  const set=a=>{ for(let j=0;j<a.length;j++){ const i=a[j]; let l=(gT-dl[i])/.65; l=l<0?0:l>1?1:l; l=eIO(l); ctx.fillRect((sx[i]+(tx[i]-sx[i])*l)*cell,(sy[i]+(ty[i]-sy[i])*l)*cell,sz,sz); } };
  for(let c=0;c<6;c++){ const s=gSt(c); ctx.fillStyle=s[0]; ctx.globalAlpha=s[1]; set(byCat[c]); } ctx.globalAlpha=1;
}
function animGrid(){ cancelAnimationFrame(gRaf); if(RM){ gT=gTo; drawGrid(); return; } const f=gT,to=gTo,t0=performance.now(),dur=1900*Math.abs(to-f);
  const st=now=>{ const k=Math.min(1,(now-t0)/Math.max(dur,1)); gT=f+(to-f)*k; drawGrid(); if(k<1) gRaf=requestAnimationFrame(st); }; gRaf=requestAnimationFrame(st); }
$('#gridLeg').innerHTML=CL.map((l,i)=>`<span><i style="background:${GCOL[i]};${i===0?'outline:1px solid '+LINE:''}"></i>${l}</span>`).join('');
$$('[data-g]').forEach(b=>b.addEventListener('click',()=>{ gMode=b.dataset.g; $$('[data-g]').forEach(x=>x.setAttribute('aria-pressed',x===b)); $('#rGrid').textContent=GTXT[gMode]; drawGrid(); }));
$('#sortBtn').addEventListener('click',()=>{ gTo=gTo?0:1; $('#sortBtn').textContent=gTo?'Escampa-les':'Ajunta-les';
  if(gTo&&gMode==='all'){ gMode='half'; $$('[data-g]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.g==='half')); $('#rGrid').textContent=GTXT.half+' Mira la primera fila.'; } animGrid(); });
$('#rGrid').textContent=GTXT.all;

/* =========== 14. SERVEIS =========== */
// data/serveis.json (scripts/serveis/dades.mjs): recomptes i distàncies per municipi, temps a urgències, alumnat.
const svReady=fetch('data/serveis.json').then(r=>r.json()).then(SV=>{
const METRO=new Set(['Barcelonès','Baix Llobregat','Vallès Occidental','Vallès Oriental','Maresme']);
/* --- 14a. El llindar: quins serveis té un municipi segons la mida --- */
const SVS=[['primaria','Escola primària','escola'],['farmacia','Farmàcia','farmàcia'],['biblioteca_publica','Biblioteca pública','biblioteca'],['eso','Institut (ESO)','institut'],
  ['batxillerat','Batxillerat','batxillerat'],['piscina_coberta','Piscina coberta','piscina coberta'],['estacio_tren','Estació de tren','estació de tren'],['cinema','Cinema','cinema'],['hospital','Hospital públic','hospital']];
const has=(k,m)=>SV.n[k][m.i]>0;
const byLogP=[...MUN].sort((a,b)=>a.p-b.p);
// Regressió logística: probabilitat que un municipi tingui el servei segons log10(habitants). Ajust per Newton-Raphson.
const XS=d3.range(1,6.26,.05);
function logit(k){ let a=0,b=0; for(let it=0;it<40;it++){ let g0=0,g1=0,h00=1e-6,h01=0,h11=1e-6;
    for(const m of MUN){ const x=Math.log10(Math.max(m.p,1)), p=1/(1+Math.exp(-(a+b*x))), y=has(k,m)?1:0, w=p*(1-p); g0+=y-p; g1+=(y-p)*x; h00+=w; h01+=w*x; h11+=w*x*x; }
    const det=h00*h11-h01*h01; a+=( h11*g0-h01*g1)/det; b+=(-h01*g0+h00*g1)/det; } return {a,b}; }
const FIT={}; const curve=k=>{ const f=FIT[k]=logit(k); return XS.map(x=>1/(1+Math.exp(-(f.a+f.b*x)))); };
const CUR=Object.fromEntries(SVS.map(([k])=>[k,curve(k)]));
const at=(k,x)=>{ const i=Math.max(0,Math.min(XS.length-1,Math.round((x-1)/.05))); let v=CUR[k][i]; for(let j=i;v==null&&j>=0;j--) v=CUR[k][j]; return v==null?0:v; };
// Població a partir de la qual la meitat dels municipis tenen el servei.
const half=k=>Math.pow(10,-FIT[k].a/FIT[k].b);
const u1000=MUN.filter(m=>m.p<1000);
$('#svTitle').textContent='Cada servei necessita un mínim de gent';
$('#svLede').textContent=`La meitat dels municipis tenen farmàcia a partir d’uns ${fmt(Math.round(half('farmacia')/100)*100)} habitants, institut a partir de ${fmt(Math.round(half('eso')/500)*500)} i cinema a partir de ${fmt(Math.round(half('cinema')/5000)*5000)}. Però el ${pct(u1000.length/947,0)} dels municipis catalans no arriba als 1.000 habitants. Mou el control o busca el teu municipi.`;
let svX=3, svM=null;
function drawLad(){
  const svg=d3.select('#svLad'); const Wd=Math.min(svg.node().parentNode.clientWidth,646), Hd=Math.round(Math.max(300,Math.min(400,Wd*.62))), m={l:36,r:Wd<500?8:96,t:14,b:34};
  svg.attr('viewBox',`0 0 ${Wd} ${Hd}`).attr('width',Wd).attr('height',Hd); svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([1,6.25]).range([m.l,Wd-m.r]), y=d3.scaleLinear().domain([0,1]).range([Hd-m.b,m.t]);
  [0,.5,1].forEach(v=>{ svg.append('line').attr('x1',m.l).attr('x2',Wd-m.r).attr('y1',y(v)).attr('y2',y(v)).attr('stroke',LINE);
    svg.append('text').attr('class','ax').attr('x',m.l-6).attr('y',y(v)).attr('dy','.32em').attr('text-anchor','end').text(v*100+'%'); });
  [[1,'10'],[2,'100'],[3,'1.000'],[4,'10.000'],[5,'100.000'],[6,'1 milió']].forEach(([v,l])=>svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',Hd-14).attr('text-anchor',v===1?'start':'middle').text(l));
  svg.append('text').attr('class','ax').attr('x',Wd-m.r).attr('y',Hd-1).attr('text-anchor','end').text('habitants del municipi →');
  // Distribució dels municipis per mida (franja inferior).
  svg.append('g').selectAll('line').data(byLogP).join('line').attr('x1',d=>x(Math.log10(Math.max(d.p,10)))).attr('x2',d=>x(Math.log10(Math.max(d.p,10)))).attr('y1',Hd-m.b+3).attr('y2',Hd-m.b+9).attr('stroke',MUTED).attr('stroke-opacity',.25);
  const col=i=>R[Math.min(7,1+Math.round(i*6/(SVS.length-1)))];
  const g=svg.append('g');
  SVS.forEach(([k,l],i)=>{ const pts=XS.map((xx,j)=>[xx,CUR[k][j]]).filter(p=>p[1]!=null);
    const pth=g.append('path').datum(pts).attr('fill','none').attr('stroke',col(i)).attr('stroke-width',2).attr('stroke-linejoin','round').attr('d',d3.line().x(p=>x(p[0])).y(p=>y(p[1])).curve(d3.curveMonotoneX));
    if(!svShown){ const L=pth.node().getTotalLength(); pth.attr('stroke-dasharray',L).attr('stroke-dashoffset',L).attr('data-l',L); }
    // Número de cada servei on la seva corba creua el 50% (o el 75%, alternant, perquè no es trepitgin).
    const lv=i%2?.75:.5, xl=(Math.log(lv/(1-lv))-FIT[k].a)/FIT[k].b; if(xl>=1&&xl<=6.25){ const gl=svg.append('g').attr('class','svl').attr('opacity',svShown?1:0).attr('transform',`translate(${x(xl)},${y(lv)})`);
      gl.append('circle').attr('r',8.5).attr('fill',col(i)).attr('stroke',BG).attr('stroke-width',1.5); gl.append('text').attr('text-anchor','middle').attr('dy','.35em').style('font-size','10.5px').style('font-weight',650).attr('fill',i<3?INK:BG).text(i+1); } });
  const mk=svg.append('g').attr('id','svMark');
  mk.append('line').attr('y1',m.t).attr('y2',Hd-m.b).attr('stroke',INK).attr('stroke-width',1);
  mk.selectAll('circle').data(SVS).join('circle').attr('r',3.5).attr('fill',(d,i)=>col(i)).attr('stroke',BG).attr('stroke-width',1.2);
  svg.node()._s={x,y,col};
  svg.node()._rv=()=>{ svg.selectAll('path[data-l]').transition().duration(1400).delay((d,i)=>i*120).ease(d3.easeCubicInOut).attr('stroke-dashoffset',0); svg.selectAll('.svl').transition().delay(1200).duration(500).attr('opacity',1); };
  updLad();
}
let svShown=false;
function updLad(){
  const svg=d3.select('#svLad'), S=svg.node()._s; if(!S) return; const {x,y}=S;
  const mk=svg.select('#svMark'); mk.select('line').attr('x1',x(svX)).attr('x2',x(svX)); mk.selectAll('circle').attr('cx',x(svX)).attr('cy',d=>y(at(d[0],svX)));
  const N=Math.round(Math.pow(10,svX)); $('#svNout').textContent=fmt(svM?svM.p:(N<1000?Math.round(N/10)*10:N<10000?Math.round(N/100)*100:Math.round(N/1000)*1000));
  const smaller=MUN.filter(m=>m.p<(svM?svM.p:N));
  let html;
  if(svM){ const m=svM;
    html=`<div class="hd"><b>${m.n}</b> <span class="m">· ${m.com} · ${fmt(m.p)} habitants</span></div>`+SVS.map(([k,l])=>{ const y1=has(k,m), dk=SV.d[k]&&SV.d[k][m.i];
      const extra = y1 ? (SV.n[k][m.i]>1?`${fmt(SV.n[k][m.i])} al municipi`:'al municipi') : (k==='hospital' ? `urgències a ${fmt(SV.min[m.i])} min en cotxe` : (dk?`el més proper, a ${fmt(dk,1)} km`:'no n’hi ha'));
      return `<div class="it"><i style="background:${y1?RED:'transparent'}"></i><span><b>${SVS.findIndex(d=>d[0]===k)+1}. ${l}</b><small>${extra}</small></span></div>`; }).join('');
  } else {
    html=`<div class="hd">Dels municipis d’uns <b>${$('#svNout').textContent} habitants</b>, quants tenen…</div>`+SVS.map(([k,l])=>{ const v=at(k,svX);
      return `<div class="it"><i style="background:${rgba(RED,v)}"></i><span><b>${SVS.findIndex(d=>d[0]===k)+1}. ${l}</b><small>${pct(v,0)}</small></span></div>`; }).join('')+
      `<div class="hd" style="margin:.5rem 0 0;font-size:13px;color:var(--muted)">${fmt(smaller.length)} municipis són més petits: el ${pct(d3.sum(smaller,m=>m.a)/TA,0)} del territori i el ${pct(d3.sum(smaller,m=>m.p)/TP)} de la gent.</div>`;
  }
  $('#svCard').innerHTML=html;
}
$('#svN').addEventListener('input',e=>{ svX=+e.target.value; svM=null; $('#svQ').value=''; updLad(); });
$('#svQ').addEventListener('change',e=>{ const m=byName.get(e.target.value.trim().toLowerCase()); if(!m) return; svM=m; svX=Math.log10(Math.max(m.p,10)); $('#svN').value=svX; updLad(); });
$('#svNote').textContent='Corbes de regressió logística: probabilitat que un municipi tingui el servei segons el seu nombre d’habitants, ajustada amb els 947 municipis. Els números marquen on cada corba passa del 50% (o del 75%). Les ratlletes de sota són els municipis. Centres docents del curs 2025/26; farmàcies i hospitals de la xarxa pública, 2026; biblioteques i cinemes, 2025; estacions de Renfe i FGC (sense metro). Les distàncies són en línia recta des de l’ajuntament.';

/* --- 14b. Temps fins a urgències --- */
let hoT=30, hoShown=false;
const HB=[10,20,30,45,60], HC=[R[0],R[1],R[3],R[4],R[5],R[7]];
const hcls=v=>{ for(let i=0;i<HB.length;i++) if(v<HB[i]) return i; return HB.length; };
const hoFill=m=>{ const v=SV.min[m.i]; return v>hoT ? HC[hcls(v)] : LAND; };
const over=t=>MUN.filter(m=>SV.min[m.i]>t);
{ const o=over(30); $('#hoTitle').textContent=`${fmt(Math.round(d3.sum(o,m=>m.p)/1000)*1000)} persones viuen a més de mitja hora d’unes urgències`; }
const hSvg2=baseMap('#mHosp');
const hoRead=()=>{ const o=over(hoT), p=d3.sum(o,m=>m.p);
  return `<b>${fmt(p)} persones</b> (${pct(p/TP)}) viuen a més de ${hoT} minuts. Els seus ${fmt(o.length)} municipis ocupen el <b>${pct(d3.sum(o,m=>m.a)/TA,0)}</b> del territori. <span class="m">Toca un municipi.</span>`; };
const hoL=muniLayer(hSvg2,()=>LAND,m=>{ const h=MUN[SV.hosp[m.i]];
  $('#rHosp').innerHTML=`<b>${m.n}</b> <span class="m">${m.com}</span><br><span class="num">${fmt(SV.min[m.i])} minuts en cotxe (${fmt(SV.km[m.i])} km) fins a l’hospital ${h===m?'del mateix municipi':pr('de',h.n)}.</span>`; },()=>{ $('#rHosp').innerHTML=hoRead(); });
meshLayer(hSvg2,'mesh',COMMESH); meshLayer(hSvg2,'outline',OUTLINE);
const hosDots=hSvg2.append('g').style('pointer-events','none').selectAll('circle').data(SV.hospitals).join('circle').attr('transform',d=>`translate(${proj([d[0],d[1]])})`).attr('r',0).attr('fill',INK).attr('stroke',BG).attr('stroke-width',1.5).style('vector-effect','non-scaling-stroke');
function hoPaint(){ $('#hoTout').textContent=hoT+'′'; if(hoShown) paint(hoL.ps,hoFill); $('#rHosp').innerHTML=hoRead(); }
$('#hoT').addEventListener('input',e=>{ hoT=+e.target.value; hoL.clear(); hoPaint(); });
$('#legHosp').innerHTML=HC.map((c,i)=>`<div><i style="background:${c}"></i><span>${i?HB[i-1]+'′':''}</span></div>`).join('')+'<span style="font-size:11px;color:var(--muted);align-self:flex-end;margin-left:.5rem;white-space:nowrap">minuts · ● hospital</span>';
hoPaint();
onView($('#mHosp'),()=>{ hoShown=true; revealFill(hoL.ps,hoFill); hosDots.transition().delay((d,i)=>RM?0:600+i*20).duration(RM?0:400).attr('r',3.2*W/Math.max(300,$('#mHosp').clientWidth)); });
{ const cw={}; MUN.forEach(m=>{ (cw[m.com]=cw[m.com]||[0,0]); cw[m.com][0]+=SV.min[m.i]*m.p; cw[m.com][1]+=m.p; }); const cm=Object.entries(cw).map(([c,[a,p]])=>[c,a/p]).sort((a,b)=>b[1]-a[1]);
  $('#hoNote').textContent=`De mitjana, ponderant per població: ${fmt(cw['Barcelonès'][0]/cw['Barcelonès'][1],0)} minuts al Barcelonès i ${fmt(cm[0][1],0)} ${de(byC[cm[0][0]])}. Hospitals de la xarxa pública (SISCAT) amb urgències 24 h; no hi ha els privats ni els de fora de Catalunya. Ruta per carretera amb OSRM i dades d’OpenStreetMap, sense trànsit: és un temps optimista. Surt de l’ajuntament o del punt de la carretera principal més proper, a menys de 700 m.`; }

/* --- 14c. Universitat --- */
const UNI=Object.fromEntries(SV.uni), UT=d3.sum(SV.uni,d=>d[1]);
const UC=C.map(c=>({c, p:c.p/CTP, u:(UNI[c.n]||0)/UT})).filter(d=>d.p>=.012||d.u>=.01).sort((a,b)=>b.u-a.u);
const rest={c:{n:'Resta de comarques',s:'Resta'}, p:1-d3.sum(UC,d=>d.p), u:1-d3.sum(UC,d=>d.u)};
{ const bv=(UNI['Barcelonès']+UNI['Vallès Occidental'])/UT; $('#unTitle').textContent=`El ${pct(bv,0)} dels universitaris estudien al Barcelonès o al Vallès Occidental`; }
let uniSel='Baix Llobregat', uniShown=false;
function drawUni(){
  const svg=d3.select('#uni'); const Wd=Math.min(svg.node().parentNode.clientWidth,560), Hd=Math.round(Math.max(360,Math.min(480,Wd*.85))), m={l:Wd<440?84:128,r:Wd<440?84:128,t:28,b:12};
  svg.attr('viewBox',`0 0 ${Wd} ${Hd}`).attr('width',Wd).attr('height',Hd); svg.selectAll('*').remove();
  const y=d3.scaleSqrt().domain([0,.55]).range([Hd-m.b,m.t]), x0=m.l, x1=Wd-m.r;
  svg.append('text').attr('class','ax').attr('x',x0).attr('y',12).attr('text-anchor','middle').text('Població');
  svg.append('text').attr('class','ax').attr('x',x1).attr('y',12).attr('text-anchor','middle').text('Universitaris');
  [x0,x1].forEach(xx=>svg.append('line').attr('x1',xx).attr('x2',xx).attr('y1',m.t-6).attr('y2',Hd-m.b).attr('stroke',LINE));
  const data=[...UC,rest];
  const g=svg.selectAll('g.un').data(data).join('g').attr('class','un').style('cursor','pointer').attr('tabindex',0).attr('role','button').attr('aria-label',d=>d.c.n)
    .on('click pointerenter',(e,d)=>{ uniSel=d.c.n; updUni(); }).on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); uniSel=d.c.n; updUni(); } });
  g.append('line').attr('x1',x0).attr('x2',x1).attr('y1',d=>y(d.p)).attr('y2',d=>y(uniShown?d.u:d.p)).attr('stroke-width',2.2).attr('stroke',d=>d.u>d.p?RED:MUTED);
  g.append('circle').attr('cx',x0).attr('cy',d=>y(d.p)).attr('r',4).attr('fill',MUTED);
  g.append('circle').attr('class','u2').attr('cx',x1).attr('cy',d=>y(uniShown?d.u:d.p)).attr('r',4.5).attr('fill',d=>d.u>d.p?RED:MUTED).attr('opacity',uniShown?1:0);
  // Etiquetes dels extrems sense trepitjar-se.
  const lab=(side,key)=>{ const ys=[]; [...data].sort((a,b)=>b[key]-a[key]).forEach(d=>{ const yy=y(d[key]); if(ys.some(v=>Math.abs(v-yy)<12)) return; ys.push(yy);
    svg.append('text').attr('class','ax ul '+side).style('font-size',Wd<440?'10px':null).attr('x',side==='l'?x0-8:x1+8).attr('y',yy).attr('dy','.32em').attr('text-anchor',side==='l'?'end':'start').attr('data-n',d.c.n).attr('opacity',side==='r'&&!uniShown?0:1).text(`${d.c.s||d.c.n} ${pct(d[key],1)}`); }); };
  lab('l','p'); lab('r','u');
  svg.node()._rv=()=>{ g.select('line').transition().duration(1400).delay((d,i)=>i*60).ease(d3.easeCubicInOut).attr('y2',d=>y(d.u)); g.select('.u2').transition().duration(1400).delay((d,i)=>i*60).ease(d3.easeCubicInOut).attr('cy',d=>y(d.u)).attr('opacity',1); svg.selectAll('.ul.r').transition().delay(1300).duration(500).attr('opacity',1); };
  updUni();
}
function updUni(){
  d3.selectAll('#uni g.un').attr('opacity',d=>d.c.n===uniSel?1:.35); d3.selectAll('#uni .ul').attr('font-weight',function(){ return this.dataset.n===uniSel?600:null; }).style('fill',function(){ return this.dataset.n===uniSel?INK:null; });
  const d=[...UC,rest].find(v=>v.c.n===uniSel); if(!d) return; const nm=d.c.art!==undefined?cap(withArt(d.c)):d.c.n;
  $('#rUni').innerHTML=`<b>${nm}</b>: el ${pct(d.p)} de la població i el ${pct(d.u)} dels estudiants universitaris${d.u>d.p?`, ${fmt(d.u/d.p,1)} vegades el seu pes.`:d.u<d.p/5?`: ${fmt(Math.round(d.p/Math.max(d.u,.0001)))} vegades menys del que li tocaria per població.`:'.'}`;
}
$('#unNote').textContent=`Matrícula presencial de grau, màster i doctorat, curs ${SV.uniCurs} (${fmt(UT)} estudiants), per comarca del centre. No inclou la UOC ni les files amb secret estadístic. Es mostren les comarques amb almenys l’1% de la població o dels estudiants.`;

/* --- 14d. Per habitant o per km² --- */
const PKS=[['farmacia','Farmàcies'],['primaria','Escoles'],['biblioteca_publica','Biblioteques'],['esport_installacio','Instal·lacions esportives'],['estacio_tren','Estacions de tren']];
let pkS='farmacia', pkU='hab', pkShown=false;
const comN=C.map(c=>c.n), comIdx=Object.fromEntries(D.coms.map((n,i)=>[n,i]));
const CV=D.coms.map((n,ci)=>{ const ms=MUN.filter(m=>m.c===ci); return {n, c:byC[n], ms, p:d3.sum(ms,m=>m.p), a:d3.sum(ms,m=>m.a)}; });
const pkVal=(c,k,u)=>{ const n=d3.sum(c.ms,m=>SV.n[k][m.i]); return u==='hab' ? n/c.p*1e4 : n/c.a*100; };
const grp=(k,u,metro)=>{ const cs=CV.filter(c=>METRO.has(c.n)===metro); const n=d3.sum(cs,c=>d3.sum(c.ms,m=>SV.n[k][m.i])); return u==='hab'? n/d3.sum(cs,c=>c.p)*1e4 : n/d3.sum(cs,c=>c.a)*100; };
const pkSvg=baseMap('#mPk');
const comShapes=CV.map((c,ci)=>gp(topojson.merge(D.topo,OBJ.geometries.filter(g=>MUN[g.id].c===ci))));
const pkPs=pkSvg.append('g').selectAll('path').data(CV).join('path').attr('class','mp').attr('d',(c,i)=>comShapes[i]).attr('fill',LAND);
meshLayer(pkSvg,'outline',OUTLINE);
let pkBins=[];
const pkFill=c=>{ const v=pkVal(c,pkS,pkU); let i=0; while(i<pkBins.length&&v>=pkBins[i]) i++; return R[Math.min(7,i+1)]; };
const pkRead=()=>{ const a=grp(pkS,pkU,true), b=grp(pkS,pkU,false), l=PKS.find(d=>d[0]===pkS)[1].toLowerCase(), u=pkU==='hab'?'per 10.000 habitants':'per 100 km²';
  const r=a>b?a/b:b/a; return `<b>${cap(l)} ${u}</b>: ${fmt(a,a<10?1:0)} a l’àmbit metropolità i ${fmt(b,b<10?1:0)} a la resta de Catalunya. ${r>=1.15?`<b>${fmt(r,1)} vegades</b> més ${a>b?'a l’àrea metropolitana':'a la resta del país'}.`:'Pràcticament igual.'} <span class="m">Toca una comarca.</span>`; };
const pkH=hoverable(pkSvg,pkPs,c=>{ const v=pkVal(c,pkS,pkU); $('#rPk').innerHTML=`<b>${cap(withArt(c.c))}</b>: ${fmt(v,v<10?1:0)} ${PKS.find(d=>d[0]===pkS)[1].toLowerCase()} ${pkU==='hab'?'per 10.000 habitants':'per 100 km²'}. <span class="m">${fmt(d3.sum(c.ms,m=>SV.n[pkS][m.i]))} en total.</span>`; },()=>{ $('#rPk').innerHTML=pkRead(); });
function pkPaint(){
  const vs=CV.map(c=>pkVal(c,pkS,pkU)).sort((a,b)=>a-b); pkBins=[1,2,3,4,5,6].map(q=>d3.quantileSorted(vs,q/7));
  if(pkShown) paint(pkPs,pkFill); pkH.clear(); $('#rPk').innerHTML=pkRead();
  const f=v=>fmt(v,v<10?1:0); $('#legPk').innerHTML=[0,...pkBins].map((b,i)=>`<div><i style="background:${R[i+1]}"></i><span>${i?f(b):''}</span></div>`).join('')+`<span style="font-size:11px;color:var(--muted);align-self:flex-end;margin-left:.5rem;white-space:nowrap">${pkU==='hab'?'per 10.000 hab.':'per 100 km²'}</span>`;
  $('#pkS').innerHTML=PKS.map(([k,l])=>`<button class="chip" data-pks="${k}" aria-pressed="${k===pkS}">${l}</button>`).join('');
  $$('[data-pks]').forEach(b=>b.addEventListener('click',()=>{ pkS=b.dataset.pks; pkPaint(); }));
}
$$('[data-pk]').forEach(b=>b.addEventListener('click',()=>{ pkU=b.dataset.pk; $$('[data-pk]').forEach(x=>x.setAttribute('aria-pressed',x===b)); pkPaint(); }));
pkPaint();
onView($('#mPk'),()=>{ pkShown=true; revealFill(pkPs,pkFill); });

return {drawLad, drawUni, reveal:()=>{
  onView($('#svLad'),()=>{ svShown=true; const f=$('#svLad')._rv; f&&f(); },.3);
  onView($('#uni'),()=>{ uniShown=true; const f=$('#uni')._rv; f&&f(); },.3);
}};
}).catch(e=>{ console.error(e); return null; });

/* ---------- boot ---------- */
function layoutAll(){ svReady.then(sv=>{ if(sv){ sv.drawLad(); sv.drawUni(); } }); if(spkShown) spkPaint(false); drawDots(); drawLor(); drawAlt(); drawHip(); drawBal(); cart.W=0; drawCart(); drawKm(); drawGrid(); }
function boot(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>heroPaint(true)));
  tramPaint(); cRead(); layoutAll();
  onView($('#mSpk'),()=>{ spkShown=true; spkPaint(true); },.35);
  onView($('#lor'),()=>{ lorShown=true; const f=$('#lor')._rv; f&&f(); });
  onView($('#alt'),()=>{ altShown=true; const f=$('#alt')._rv; f&&f(); },.2);
  onView($('#hip'),()=>{ hipShown=true; const f=$('#hip')._rv; f&&f(); },.2);
  onView($('#bal'),()=>{ balShown=true; const f=$('#bal')._rv; f&&f(); },.15);
  onView($('#cart'),()=>{ cart.shown=true; drawCart(); },.25);
  svReady.then(sv=>sv&&sv.reveal());
  $$('.rv').forEach(el=>onView(el,()=>el.classList.add('in'),.15));
  // Scroll suau (Lenis), només amb roda o trackpad; al mòbil el scroll és el natiu.
  if(!RM && window.Lenis){ const lenis=new Lenis({lerp:.1, wheelMultiplier:.9}); const raf=t=>{ lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}
let lw=innerWidth, rt; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(Math.abs(innerWidth-lw)<2) return; lw=innerWidth; layoutAll(); },180); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(boot); else boot();
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
