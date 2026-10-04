/* «El nus»: els fils que han encarit l'habitatge. Llegeix data/diners.json, data/catalunya.json i data/nus.json. */
Promise.all(['../data/diners.json','../data/catalunya.json','../data/nus.json'].map(u=>fetch(u).then(r=>r.json()))).then(function(F){
"use strict";
const [D,CA,N]=F;
const {RM,$,$$,fmt,pct,C,cap,sizeOf,pw,drawOn,crosshair,yGrid,xAxis,ann,nearest,endLabels,seg,setClear,onView}=Comu;
const S=Comu.series(D), {R,RED,INK,MUTED,LINE,LAND,BG,TEXT}=C;
const YL=+D.sal[D.sal.length-1][0], Y0=+D.sal[0][0], YRS=d3.range(Y0,YL+1);
const ipcY=S.yAvg(S.ipc);
const GEO={bcn:{i:2,s:'ct',n:'província de Barcelona'},cat:{i:1,s:'ct',n:'Catalunya'},esp:{i:0,s:'es',n:'Espanya'}};
const price=(y,g)=>S.habY(y,GEO[g||'bcn'].i), sal=(y,g)=>{ const r=S.salY.get(y); return r?r[GEO[g||'bcn'].s]:null; };
const k1=v=>fmt(Math.round(v/1000))+'.000';
const x2=v=>'×'+fmt(v,v<10?1:0);
const QL=S.habQ[S.habQ.length-1];
$('#upd').textContent=`Dades fins al ${YL} · habitatge fins al ${['1r','2n','3r','4t'][+QL.slice(5)-1]} trimestre del ${QL.slice(0,4)}`;
const yr=f=>y=>{ const a=[]; for(let m=1;m<=12;m++){ const v=f(Comu.kMake(y,m)); if(v==null) return null; a.push(v); } return Comu.mean(a); };
const m3Y=yr(k=>S.m3.get(k));
const EB=new Map(D.ecbBal.map(d=>[d[0].replace('-','M'),d[1]])), ebY=yr(k=>EB.get(k));
const rentY=new Map(D.rent.map(r=>[r[0],r[1]]));

/* ---------- població (data/nus.json) ---------- */
const MUN=CA.mun.map((r,i)=>({i,n:r[0],c:r[1],com:CA.coms[r[1]],a:r[3]}));
const ME=new Set(['Alt Penedès','Baix Llobregat','Barcelonès','Garraf','Maresme','Vallès Occidental','Vallès Oriental'].map(n=>CA.coms.indexOf(n)));
const PY=N.years, NY=PY.length, P0=N.pop[0], PL=N.pop[NY-1];
const segT=t=>{ let k=0; while(k<NY-2&&PY[k+1]<=t) k++; return {k,f:Math.max(0,Math.min(1,(t-PY[k])/(PY[k+1]-PY[k])))}; };
const popT=(i,t)=>{ const {k,f}=segT(t); return N.pop[k][i]*(1-f)+N.pop[k+1][i]*f; };
const sumT=(t,f)=>MUN.reduce((s,m)=>s+(f(m)?popT(m.i,t):0),0);
const metro=m=>ME.has(m.c), all=()=>true;
const popMe=t=>sumT(t,metro);
const TA=d3.sum(MUN,m=>m.a), AME=d3.sum(MUN.filter(metro),m=>m.a);
const BCN=MUN.find(m=>m.n==='Barcelona');

/* =========== 0. ELS FILS =========== */
const TH=[
  {k:'hab',n:'Preu del pis',l:'pis',c:RED,w:3,f:y=>price(y)},
  {k:'rent',n:'Lloguer a Barcelona',l:'lloguer',c:R[6],w:2.4,f:y=>rentY.get(y)},
  {k:'bce',n:'Balanç del BCE',l:'balanç BCE',c:R[2],w:1.8,f:ebY},
  {k:'m3',n:'Diners en circulació (M3)',l:'diners M3',c:R[4],w:1.8,dash:'5 3',f:m3Y},
  {k:'ipc',n:'Preus de consum',l:'preus',c:MUTED,w:1.8,dash:'2 3',f:ipcY},
  {k:'sal',n:'Sou',l:'sou',c:INK,w:2.4,f:y=>sal(y)},
  {k:'pop',n:'Població metropolitana',l:'població',c:R[7],w:1.6,dash:'1 3',f:popMe,pts:true}
];
const T=Object.fromEntries(TH.map(t=>[t.k,t]));
const mult=(k,b,y)=>T[k].f(y)/T[k].f(b);
const RMIN=D.rent.reduce((p,c)=>c[1]<p[1]?c:p)[0];
$('#h1').textContent=`Des del ${Y0}, el preu del pis s’ha multiplicat per ${fmt(mult('hab',Y0,YL),1)}. El sou, per ${fmt(mult('sal',Y0,YL),1)}.`;
$('#lead').textContent=`En el mateix temps, els diners en circulació a la zona euro s’han multiplicat per ${fmt(mult('m3',Y0,YL),1)}, l’àrea metropolitana té ${fmt(Math.round((popMe(YL)-popMe(Y0))/1000))}.000 habitants més i, des del ${RMIN}, el lloguer dels contractes nous a Barcelona ha pujat un ${pct(rentY.get(YL)/rentY.get(RMIN)-1,0)}, mentre que el sou ho ha fet un ${pct(sal(YL)/sal(RMIN)-1,0)}. L’habitatge és el lloc on es creuen tots aquests fils. Els estirem un per un.`;
let base=2000; const hidden=new Set(), focus={k:null};
function thPts(t){ const yrs=t.pts?[base,...PY.filter(y=>y>base)]:d3.range(base,YL+1); const b=t.f(base); return b?yrs.map(y=>[y,t.f(y)/b]).filter(p=>p[1]!=null&&!isNaN(p[1])):[]; }
$('#thChips').innerHTML=TH.map(t=>`<button class="chip" data-th="${t.k}" aria-pressed="true"><i style="background:${t.c}"></i>${t.n}</button>`).join('');
$$('[data-th]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.th; hidden.has(k)?hidden.delete(k):hidden.add(k); b.setAttribute('aria-pressed',!hidden.has(k)); drawThreads({threads:true}); }));
function drawThreads(shown){
  const svg=d3.select('#threads'); const [W,H]=sizeOf(svg,820,.6,320,500); const t=16,b=24,lp=W<500?0:6,rp=W<500?92:130;
  const SER=TH.filter(s=>!hidden.has(s.k)).map(s=>({...s,p:thPts(s)})).filter(s=>s.p.length);
  const all=SER.flatMap(s=>s.p.map(p=>p[1])).concat([1]);
  const y=d3.scaleLog().domain([Math.min(.9,d3.min(all)*.96),d3.max(all)*1.06]).range([H-b,t]);
  const x=d3.scaleLinear().domain([base,YL]).range([lp,W-rp]);
  yGrid(svg,y,lp,W-rp,[.75,1,1.5,2,3,4,6,8,12].filter(v=>v>=y.domain()[0]&&v<=y.domain()[1]),v=>v===1?`${base} = 1`:'×'+fmt(v,v%1?1:0));
  svg.select('.grid').selectAll('line').filter(function(){ return Math.abs(+this.getAttribute('y1')-y(1))<.5; }).style('stroke',MUTED);
  xAxis(svg,x,H-b,W<500?[base,2015,YL].filter((v,i,a)=>a.indexOf(v)===i):d3.range(base,YL+1,5).concat(YL%5?[YL]:[]));
  const ln=d3.line().curve(d3.curveMonotoneX).x(p=>x(p[0])).y(p=>y(p[1]));
  const g=svg.append('g');
  const paths=SER.map(s=>{ const p=g.append('path').attr('class','line th').attr('d',ln(s.p)).attr('stroke',s.c).attr('stroke-width',s.w).attr('stroke-dasharray',s.dash||null); if(!shown.threads) p.attr('opacity',0); return p; });
  // Zona de contacte gruixuda per poder triar un fil amb el dit
  g.selectAll('path.hit').data(SER).join('path').attr('class','hit').attr('d',s=>ln(s.p)).attr('fill','none').attr('stroke','transparent').attr('stroke-width',16).style('cursor','pointer')
    .on('pointerenter click',(e,s)=>hl(s.k));
  const knot=svg.append('circle').attr('cx',x(base)).attr('cy',y(1)).attr('r',shown.threads?6:0).attr('fill',INK);
  const L=endLabels(svg,SER.map(s=>{ const e=s.p[s.p.length-1]; return {y:y(e[1]),c:s.c===MUTED?TEXT:s.c,n:W<500?({bce:'BCE',m3:'M3',pop:'gent'}[s.k]||s.l):s.l,v:x2(e[1])}; }),W-rp+8,14,shown.threads);
  L.forEach((l,i)=>l.datum(SER[i]).style('cursor','pointer').on('pointerenter click',(e,s)=>hl(s.k)));
  function hl(k){ focus.k=k; paths.forEach((p,i)=>p.attr('opacity',!k||SER[i].k===k?1:.13)); L.forEach((l,i)=>l.attr('opacity',!k||SER[i].k===k?1:.25));
    if(k){ const s=SER.find(s=>s.k===k), e=s.p[s.p.length-1]; $('#rThreads').innerHTML=`<b>${s.n}</b>: del ${s.p[0][0]} al ${e[0]}, <b>${x2(e[1])}</b>. <span class="m">${NOTE[k]}</span>`; } }
  const NOTE={hab:'Valor taxat mitjà, província de Barcelona.',rent:'Contractes nous, Barcelona ciutat.',bce:'Actius de l’Eurosistema: el que el BCE ha comprat i prestat.',m3:'Efectiu, dipòsits i actius a curt termini de la zona euro.',ipc:'IPC de Catalunya.',sou:'',sal:'Cost salarial per treballador, Catalunya, brut.',pop:'Alt Penedès, Baix Llobregat, Barcelonès, Garraf, Maresme i els Vallès.'};
  svg.node()._rv=()=>{ knot.transition().duration(RM?0:500).attr('r',6); paths.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1800,300+i*130); }); L.forEach(l=>l.transition().delay(RM?0:2300).attr('opacity',1)); };
  const dots=SER.map(s=>svg.append('circle').attr('r',3.5).attr('fill',s.c).style('display','none'));
  const R0=`<span class="m">Toca un fil o el gràfic.</span> Tots els fils surten del mateix nus: el ${base} valen 1.`;
  crosshair(svg,x,t,H-b,xv=>{ const yy=Math.round(xv); const out=SER.map((s,i)=>{ const p=s.p.find(p=>p[0]===yy)||(s.pts&&nearest(s.p,yy)); if(!p){ dots[i].style('display','none'); return ''; } dots[i].style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1])); return `${s.l} <b>${x2(p[1])}</b>${p[0]!==yy?` <span class="m">(${p[0]})</span>`:''}`; }).filter(Boolean);
    $('#rThreads').innerHTML=`<b>${yy}</b> respecte del ${base}: `+out.join(' · '); return yy; },
    ()=>{ dots.forEach(d=>d.style('display','none')); hl(null); $('#rThreads').innerHTML=R0; });
  svg.selectAll('path.hit').raise(); L.forEach(l=>l.raise());
  $('#rThreads').innerHTML=R0;
}
seg('base',v=>{ base=+v; drawThreads({threads:true}); });

/* ---------- índex dels fils ---------- */
const effY=y=>rentY.get(y)&&sal(y)?rentY.get(y)*12/sal(y):null;
const genY=(y,g)=>80*price(y,g)/sal(y,g);
const cashV=y0=>100*ipcY(y0)/ipcY(YL), flatV=y0=>100*price(YL)/price(y0)*ipcY(y0)/ipcY(YL);
const EM=D.eman, emL=EM.ES[EM.ES.length-1];
const FILS=[
  {id:'f1',t:'La gent',big:'+'+fmt(Math.round((PL.reduce((a,b)=>a+b,0)-P0.reduce((a,b)=>a+b,0))/1000))+'.000',s:`habitants des del ${PY[0]}`,sp:PY.map(y=>[y,sumT(y,all)])},
  {id:'f2',t:'Els diners',big:x2(mult('m3',Y0,YL)),s:`diners en circulació des del ${Y0}`,sp:d3.range(Y0,YL+1).map(y=>[y,m3Y(y)])},
  {id:'f3',t:'El sou',big:fmt(genY(YL),1),s:`anys de sou per un pis, ${YL}`,sp:YRS.map(y=>[y,genY(y)])},
  {id:'f4',t:'El lloguer',big:pct(effY(YL),0),s:`del sou brut se’n va en lloguer`,sp:D.rent.map(r=>[r[0],effY(r[0])])},
  {id:'f5',t:'Els estalvis',big:fmt(cashV(Y0))+' €',s:`valen avui 100 € del ${Y0}`,sp:YRS.map(y=>[y,100*ipcY(Y0)/ipcY(y)])},
  {id:'f6',t:'Els joves',big:fmt(emL[1],1).replace(',0',''),s:`anys per marxar de casa`,sp:EM.ES.map(r=>[r[0],r[1]])}
];
$('#fils').innerHTML=FILS.map((f,i)=>{ const xs=d3.scaleLinear().domain(d3.extent(f.sp,p=>p[0])).range([2,86]), ys=d3.scaleLinear().domain(d3.extent(f.sp,p=>p[1])).range([30,4]);
  const d=d3.line().x(p=>xs(p[0])).y(p=>ys(p[1]))(f.sp), e=f.sp[f.sp.length-1];
  return `<a href="#${f.id}" class="fil rv" style="transition-delay:${i*70}ms"><span class="fn">${String(i+1).padStart(2,'0')}</span><span class="ft">${f.t}</span><b>${f.big}</b><small>${f.s}</small><svg viewBox="0 0 92 34" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${xs(e[0])}" cy="${ys(e[1])}" r="2.6" fill="var(--red)"/></svg></a>`; }).join('');
onView($('#fils'),()=>$$('.fil').forEach(a=>a.classList.add('in')),.2);

/* =========== 1. LA GENT =========== */
const pop98=d3.sum(P0), popL=d3.sum(PL), dPop=popL-pop98, dMe=popMe(PY[NY-1])-popMe(PY[0]);
const grow=MUN.map(m=>PL[m.i]/P0[m.i]-1), bcnG=grow[BCN.i];
const fast=MUN.filter(m=>grow[m.i]>.5).length;
$('#popTitle').textContent=`Catalunya té ${fmt(dPop/1e6,2)} milions d’habitants més que el ${PY[0]}, i on hi ha la feina, hi falta lloc`;
$('#popLede').textContent=`L’àmbit metropolità, que ocupa el ${pct(AME/TA,0)} del territori, n’ha absorbit el ${pct(dMe/dPop,0)} i ja hi viuen ${fmt(popMe(PY[NY-1])/popL*10,1)} de cada 10 catalans. Però el mapa mostra una taca que s’escampa: Barcelona ciutat ha crescut un ${pct(bcnG,0)}, i ${fast} municipis, sobretot de les corones i de la costa, han crescut més d’un 50%. Una lectura possible: qui no troba pis a prop de la feina en busca més lluny, i hi porta la pressió.`;
const PBINS=[-.1,0,.1,.25,.5,1], PCOL=['#C9C9C2','#DCDCD5',R[1],R[2],R[3],R[5],R[7]];
const pcl=v=>{ for(let i=0;i<PBINS.length;i++) if(v<PBINS[i]) return i; return PBINS.length; };
const edge=f=>{ if(!f||f===LAND) return BG; const c=d3.lab(f); return c.l>80 ? d3.lab(c.l-17,c.a*1.1,c.b*1.1).formatHex() : BG; };
const paint=(sel,fill)=>sel.attr('fill',fill).style('--edge',function(){ return edge(this.getAttribute('fill')); });
$('#legPop').innerHTML=PCOL.map((c,i)=>`<div><i style="background:${c}"></i><span>${['−10%','0','+10%','+25%','+50%','+100%',''][i]}</span></div>`).join('');
const W=CA.W, H=CA.H, proj=d3.geoMercator().scale(CA.scale).translate(CA.translate), gp=d3.geoPath(proj), OBJ=CA.topo.objects.m;
const mSvg=d3.select('#mPop').attr('viewBox',`0 0 ${W} ${H}`);
const feats=topojson.feature(CA.topo,OBJ).features, PD=[]; feats.forEach(f=>PD[f.id]=gp(f));
const mps=mSvg.append('g').selectAll('path').data(MUN).join('path').attr('class','mp').attr('d',m=>PD[m.i]).attr('fill',LAND).style('--edge',BG);
mSvg.append('path').attr('class','mesh-u').attr('d',gp(topojson.mesh(CA.topo,OBJ,(a,b)=>a!==b&&MUN[a.id].c!==MUN[b.id].c)));
mSvg.append('path').attr('class','mesh').attr('d',gp(topojson.mesh(CA.topo,OBJ,(a,b)=>a!==b&&MUN[a.id].c!==MUN[b.id].c)));
mSvg.append('path').attr('class','metro').attr('d',gp(topojson.merge(CA.topo,OBJ.geometries.filter(g=>ME.has(MUN[g.id].c)))));
mSvg.append('path').attr('class','outline').attr('d',gp(topojson.mesh(CA.topo,OBJ,(a,b)=>a===b)));
let pt=PY[NY-1], pShown=false, pTimer=null, pSel=null;
const gT=(m,t)=>popT(m.i,t)/P0[m.i]-1;
function popRead(){ const t=pt, tot=sumT(t,all), me=popMe(t);
  if(pSel){ const m=pSel, v=gT(m,t); $('#rPop').innerHTML=`<b>${m.n}</b> <span class="m">${m.com}</span><br>${fmt(P0[m.i])} habitants el ${PY[0]} i ${fmt(Math.round(popT(m.i,t)))} el ${t}: <b>${v>=0?'+':''}${pct(v,0)}</b>`+(N.imputed[0].includes(m.i)?' <span class="m">(el 1998, població estimada per superfície)</span>':''); return; }
  $('#rPop').innerHTML=`<b>${t}</b>: ${fmt(Math.round(tot/1000))}.000 habitants, ${t>PY[0]?`${fmt(Math.round((tot-pop98)/1000))}.000 més que el ${PY[0]}; `:''}l’àmbit metropolità, <b>${pct(me/tot,0)}</b> de la població en el ${pct(AME/TA,0)} del territori. <span class="m">Toca un municipi.</span>`; }
function popPaint(instant){ $('#popYr').textContent=pt; $('#popT').value=pt; if(pShown) paint(mps.style('transition-duration',instant?'0s':null),m=>PCOL[pcl(gT(m,pt))]); popRead(); }
mps.on('pointerenter click',function(e,m){ pSel=m; mps.classed('hl',d=>d===m); mSvg.selectAll('path.hlo').remove(); mSvg.append('path').attr('class','hlo').attr('d',PD[m.i]); popRead(); });
const pClear=()=>{ pSel=null; mps.classed('hl',false); mSvg.selectAll('path.hlo').remove(); popRead(); };
mSvg.on('pointerleave',e=>{ if(e.pointerType==='mouse') pClear(); }); setClear(mSvg.node(),pClear);
function popPlay(){ const b=$('#popPlay');
  if(pTimer){ pTimer.stop(); pTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); return; }
  if(pt===PY[NY-1]) pt=PY[0]; const y0=pt, t0=performance.now(), dur=RM?0:(PY[NY-1]-y0)*260; b.textContent='❚❚'; b.setAttribute('aria-pressed',true);
  pTimer=d3.timer(()=>{ const k=dur?Math.min(1,(performance.now()-t0)/dur):1, ny=Math.round(y0+(PY[NY-1]-y0)*k); if(ny!==pt){ pt=ny; popPaint(); } if(k>=1){ pTimer.stop(); pTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); } }); }
$('#popT').addEventListener('input',e=>{ if(pTimer) popPlay(); pt=+e.target.value; popPaint(); });
$('#popPlay').addEventListener('click',popPlay);
onView($('#mPop'),()=>{ pShown=true; pt=PY[0]; popPaint(true); setTimeout(popPlay,RM?0:500); },.35);
popRead(); $('#popYr').textContent=pt;
const restG=(popL-popMe(PY[NY-1]))/(pop98-popMe(PY[0]))-1;
$('#popDuo').innerHTML=`<div><b>${pct(popMe(PY[NY-1])/popL,0)}</b><span>de la gent viu a l’àmbit metropolità</span></div><div><b>${pct(AME/TA,0)}</b><span>del territori ocupa aquest àmbit</span></div><div><b>+${pct(popMe(PY[NY-1])/popMe(PY[0])-1,0)}</b><span>hi ha crescut la població des del ${PY[0]}; a la resta de Catalunya, +${pct(restG,0)}</span></div>`;

/* =========== 2. ELS DINERS =========== */
const MY=d3.range(1996,YL+1).map(y=>({y,m:m3Y(y)/m3Y(y-1)-1,h:price(y)/price(y-1)-1})).filter(d=>!isNaN(d.m)&&!isNaN(d.h));
const hiM=MY.filter(d=>d.m>.07), loM=MY.filter(d=>d.m<.03), avgH=a=>d3.mean(a,d=>d.h);
const ebMin=D.ecbBal.filter(d=>d[0]>='2014'&&d[0]<'2016').reduce((a,b)=>b[1]<a[1]?b:a), ebMax=D.ecbBal.reduce((a,b)=>b[1]>a[1]?b:a);
const odd=MY.filter(d=>d.y>=2020&&d.m>.07);
$('#moneyTitle').textContent=`Quan els diners creixen de pressa, el pis sol pujar. Quan s’aturen, sol baixar.`;
$('#moneyLede').textContent=`Els ${hiM.length} anys en què els diners en circulació a la zona euro van créixer més d’un 7%, el valor taxat del pis a la província de Barcelona va pujar de mitjana un ${pct(avgH(hiM),1)}. Els ${loM.length} anys en què van créixer menys d’un 3%, va ${avgH(loM)<0?'baixar':'pujar'} un ${pct(Math.abs(avgH(loM)),1)} de mitjana. La majoria d’aquests diners els creen els bancs quan donen crèdit, i el crèdit hipotecari va ser el combustible de la bombolla. Però la relació no és mecànica: ${odd.length?`el ${odd.map(d=>d.y).join(' i el ')} els diners van créixer com en plena bombolla i el pis gairebé no es va moure. `:''}Després, entre el ${ebMin[0].slice(0,4)} i el ${ebMax[0].slice(0,4)}, el BCE va multiplicar el seu balanç per ${fmt(ebMax[1]/ebMin[1],1)}, i la pujada va tornar.`;
const ERA=y=>y<=2007?{c:RED,n:'bombolla'}:y<=2014?{c:MUTED,n:'crisi'}:{c:INK,n:'recuperació'};
function drawMoney(shown){
  const svg=d3.select('#money'); const [W,H]=sizeOf(svg,697,.72,320,520); const m={t:14,r:12,b:34,l:12};
  const x=d3.scaleLinear().domain([Math.min(-.02,d3.min(MY,d=>d.m))-.005,d3.max(MY,d=>d.m)+.01]).range([m.l,W-m.r]);
  const y=d3.scaleLinear().domain([d3.min(MY,d=>d.h)-.01,d3.max(MY,d=>d.h)+.015]).range([H-m.b,m.t]);
  const g=svg.append('g').attr('class','grid');
  x.ticks(6).forEach(v=>{ g.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',m.t).attr('y2',H-m.b).style('stroke',v===0?MUTED:null); svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',H-m.b+15).attr('text-anchor','middle').text((v>0?'+':'')+fmt(v*100)+'%'); });
  y.ticks(6).forEach(v=>{ g.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(v)).attr('y2',y(v)).style('stroke',v===0?MUTED:null); svg.append('text').attr('class','ax').attr('x',m.l+2).attr('y',y(v)-4).text((v>0?'+':'')+fmt(v*100)+'%'); });
  svg.append('text').attr('class','ax').attr('x',W-m.r).attr('y',H-4).attr('text-anchor','end').text('Diners en circulació (M3), variació anual →');
  svg.append('text').attr('class','ax').attr('x',m.l+2).attr('y',m.t+4).attr('dy','-.9em').text('↑ Preu del pis, variació anual');
  const path=svg.append('path').attr('class','line').attr('d',d3.line().curve(d3.curveCatmullRom.alpha(.5)).x(d=>x(d.m)).y(d=>y(d.h))(MY)).attr('stroke',LINE).attr('stroke-width',1.6);
  const dots=svg.append('g').selectAll('circle').data(MY).join('circle').attr('cx',d=>x(d.m)).attr('cy',d=>y(d.h)).attr('r',W<500?4.5:5.5).attr('fill',d=>ERA(d.y).c).attr('stroke',BG).attr('stroke-width',1.5);
  const LBL=new Set([1996,1999,2004,2007,2009,2012,2015,2020,2021,YL]);
  const labs=svg.append('g').selectAll('text').data(MY.filter(d=>LBL.has(d.y))).join('text').attr('class','lab').attr('x',d=>x(d.m)+8).attr('y',d=>y(d.h)).attr('dy','.35em').text(d=>d.y);
  if(!shown.money){ path.attr('opacity',0); dots.attr('r',0); labs.attr('opacity',0); }
  svg.node()._rv=()=>{ path.attr('opacity',1); drawOn(path,2600); dots.transition().delay((d,i)=>RM?0:i*2600/MY.length).duration(RM?0:300).attr('r',W<500?4.5:5.5); labs.transition().delay(d=>RM?0:MY.indexOf(d)*2600/MY.length+200).attr('opacity',1); };
  const ring=svg.append('circle').attr('r',10).attr('fill','none').attr('stroke',INK).attr('stroke-width',1.5).style('display','none');
  const del=d3.Delaunay.from(MY,d=>x(d.m),d=>y(d.h));
  const R0='<span class="m">Toca un punt: cada un és un any.</span> <span style="color:'+RED+'">●</span> fins al 2007 · <span style="color:'+MUTED+'">●</span> 2008–2014 · <span style="color:'+INK+'">●</span> des del 2015';
  const clear=()=>{ ring.style('display','none'); $('#rMoney').innerHTML=R0; };
  svg.append('rect').attr('width',W).attr('height',H).attr('fill','transparent').on('pointermove pointerdown',e=>{ const [px,py]=d3.pointer(e); const d=MY[del.find(px,py)];
    ring.style('display',null).attr('cx',x(d.m)).attr('cy',y(d.h));
    $('#rMoney').innerHTML=`<b>${d.y}</b> <span class="m">(${ERA(d.y).n})</span>: diners en circulació <b>${d.m>=0?'+':''}${pct(d.m,1)}</b>, preu del pis <b>${d.h>=0?'+':''}${pct(d.h,1)}</b>.`; }).on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); });
  setClear(svg.node(),clear); $('#rMoney').innerHTML=R0;
}

/* =========== 3. EL SOU: GENERACIONS =========== */
let gg='bcn';
function genText(){ const a=genY(Y0,gg), l=genY(YL,gg), mx=YRS.reduce((p,c)=>genY(c,gg)>genY(p,gg)?c:p), mn=YRS.filter(y=>y>2008).reduce((p,c)=>genY(c,gg)<genY(p,gg)?c:p);
  $('#genTitle').textContent=`Qui va néixer el ${Y0-30} va fer 30 anys amb el pis a ${fmt(a,1)} anys de sou. Qui va néixer el ${YL-30}, a ${fmt(l,1)}.`;
  $('#genLede').textContent=`Cada maó és un any de sou brut sencer, sense gastar res; cada columna, el que costava un pis de 80 m² l’any que aquella generació feia 30 anys, a la ${GEO[gg].n}. La generació nascuda el ${mx-30} ho va tenir més difícil, en plena bombolla: ${fmt(genY(mx,gg),1)} anys. La del ${mn-30}, després de la crisi, ${fmt(genY(mn,gg),1)}. Avui la columna torna a créixer, perquè el preu torna a anar més de pressa que el sou.`; }
function drawGen(shown){
  const svg=d3.select('#gen'); const [W,H]=sizeOf(svg,780,.5,280,400); const t=24,b=36;
  const V=YRS.map(y=>({y,v:genY(y,gg),p:price(y,gg)*80,s:sal(y,gg)}));
  const ymax=Math.ceil(d3.max(V,d=>d.v)+.5);
  const x=d3.scaleBand().domain(YRS).range([W<500?22:30,W]).paddingInner(W<500?.12:.2), y=d3.scaleLinear().domain([0,ymax]).range([H-b,t]);
  const bh=y(0)-y(1), gap=Math.min(2,bh*.15);
  yGrid(svg,y,0,W,d3.range(0,ymax+1,2).filter(v=>v),v=>v+(v>=ymax-1?' anys':''));
  const cols=svg.append('g').selectAll('g').data(V).join('g').attr('transform',d=>`translate(${x(d.y)},0)`);
  cols.each(function(d){ const g=d3.select(this), n=Math.ceil(d.v);
    for(let i=0;i<n;i++){ const f=Math.min(1,d.v-i); g.append('rect').attr('class','brick').attr('x',0).attr('width',x.bandwidth()).attr('y',y(i+f)+(i?0:0)).attr('height',Math.max(0,f*bh-gap)).attr('rx',1.5)
      .attr('fill',d.y===YL?RED:i>=Math.floor(genY(Y0,gg))?R[4]:R[2]).attr('opacity',shown.gen?1:0).attr('data-i',i); } });
  [Y0,YL].concat(W<500?[]:[YRS.reduce((p,c)=>genY(c,gg)>genY(p,gg)?c:p)]).forEach(yy=>{ const d=V.find(v=>v.y===yy); svg.append('text').attr('class','lab').attr('x',x(yy)+x.bandwidth()/2).attr('y',y(d.v)-6).attr('text-anchor','middle').text(fmt(d.v,1)); });
  const step=W<500?10:5; YRS.filter(y=>(y-Y0)%step===0||y===YL).forEach(yy=>{ svg.append('text').attr('class','ax').attr('x',x(yy)+x.bandwidth()/2).attr('y',H-b+14).attr('text-anchor','middle').text(yy-30); });
  svg.append('text').attr('class','ax').attr('x',W/2).attr('y',H-4).attr('text-anchor','middle').text('Any de naixement (fan 30 anys 30 anys després)');
  svg.node()._rv=()=>{ svg.selectAll('rect.brick').transition().delay(function(){ const i=+this.getAttribute('data-i'), c=YRS.indexOf(d3.select(this.parentNode).datum().y); return RM?0:c*45+i*70; }).duration(RM?0:260).attr('opacity',1); };
  const hl=svg.append('rect').attr('fill','none').attr('stroke',INK).attr('stroke-width',1.5).attr('rx',3).style('display','none');
  const R0='<span class="m">Toca una columna.</span>';
  const clear=()=>{ hl.style('display','none'); $('#rGen').innerHTML=R0; };
  svg.append('rect').attr('width',W).attr('height',H-b+4).attr('fill','transparent').on('pointermove pointerdown',e=>{ const [px]=d3.pointer(e); const i=Math.max(0,Math.min(YRS.length-1,Math.floor((px-x.range()[0])/x.step()))), d=V[i];
    hl.style('display',null).attr('x',x(d.y)-3).attr('width',x.bandwidth()+6).attr('y',y(d.v)-3).attr('height',y(0)-y(d.v)+6);
    $('#rGen').innerHTML=`<b>Nascuts el ${d.y-30}</b>: el ${d.y}, quan feien 30 anys, un pis de 80 m² valia ${k1(d.p)} € i el sou brut mitjà era de ${fmt(d.s)} € l’any. <b>${fmt(d.v,1)} anys de sou</b>.`; }).on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); });
  setClear(svg.node(),clear); $('#rGen').innerHTML=R0; genText();
}
seg('gg',v=>{ gg=v; drawGen({gen:true}); });

/* =========== 4. EL LLOGUER: ELS DOTZE MESOS =========== */
const RY=D.rent.map(r=>r[0]).filter(y=>effY(y)), RY0=RY[0], RYL=RY[RY.length-1];
const effMin=RY.reduce((p,c)=>effY(c)<effY(p)?c:p), rentMin=D.rent.reduce((p,c)=>c[1]<p[1]?c:p)[0];
const MES=['gen','febr','març','abr','maig','juny','jul','ag','set','oct','nov','des'];
$('#calTitle').textContent=`El lloguer d’un pis nou a Barcelona s’emporta ${fmt(effY(RYL)*12,1)} mesos de sou brut cada any`;
$('#calLede').textContent=`És el ${pct(effY(RYL),0)} del sou brut mitjà català del ${RYL}, molt per sobre del 30% que es considera el límit de l’esforç raonable. El ${effMin}, en el mínim, eren ${fmt(effY(effMin)*12,1)} mesos. Qui no pot reunir l’entrada d’un pis lloga, i aquesta demanda fa pujar el lloguer; com més lloguer paga, menys pot estalviar per a l’entrada. És el cercle més estret del nus.`;
$('#cal').innerHTML=MES.map((m,i)=>`<div class="mo"><i></i><span>${m}</span>${i===3?'<b class="th30" style="bottom:60%">30%</b>':''}</div>`).join('');
let cy=RYL, cTimer=null;
function calPaint(){ const v=effY(cy)*12; $$('#cal .mo').forEach((d,i)=>{ const f=Math.max(0,Math.min(1,v-i)); d.querySelector('i').style.height=(f*100)+'%'; d.classList.toggle('on',f>0); });
  $('#calYr').textContent=cy; $('#calT').value=cy;
  $('#rCal').innerHTML=`<b>${cy}</b>: lloguer mitjà de ${fmt(Math.round(rentY.get(cy)))} € al mes, ${fmt(Math.round(rentY.get(cy)*12))} € l’any, contra un sou brut de ${fmt(sal(cy))} €. <b>${fmt(v,1)} mesos de feina</b> per pagar-lo (${pct(effY(cy),0)}).`; }
function calPlay(){ const b=$('#calPlay');
  if(cTimer){ cTimer.stop(); cTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); return; }
  if(cy===RYL) cy=RY0; const y0=cy, t0=performance.now(), dur=RM?0:(RYL-y0)*330; b.textContent='❚❚'; b.setAttribute('aria-pressed',true);
  cTimer=d3.timer(()=>{ const k=dur?Math.min(1,(performance.now()-t0)/dur):1, ny=Math.round(y0+(RYL-y0)*k); if(ny!==cy){ cy=ny; calPaint(); } if(k>=1){ cTimer.stop(); cTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); } }); }
$('#calT').min=RY0; $('#calT').max=RYL;
$('#calT').addEventListener('input',e=>{ if(cTimer) calPlay(); cy=+e.target.value; calPaint(); });
$('#calPlay').addEventListener('click',calPlay);
onView($('#cal'),()=>{ cy=RY0; calPaint(); setTimeout(calPlay,RM?0:400); },.4);
function drawEff(shown){
  const svg=d3.select('#eff'); const [W,H]=sizeOf(svg,697,.36,190,260); const t=14,b=24,rp=W<500?44:56;
  const pts=RY.map(y=>[y,effY(y)]);
  const x=d3.scaleLinear().domain([RY0,RYL]).range([0,W-rp]), y=d3.scaleLinear().domain([0,Math.max(.5,Math.ceil(d3.max(pts,p=>p[1])*10)/10)]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,y.domain()[1]+.001,.1),v=>v?fmt(v*100)+'%':'0');
  xAxis(svg,x,H-b,W<500?[2010,2015,2020,2025]:d3.range(2008,RYL+1,2));
  svg.append('rect').attr('x',0).attr('width',W-rp).attr('y',t).attr('height',y(.3)-t).attr('fill',R[0]).attr('opacity',.8);
  svg.append('line').attr('x1',0).attr('x2',W-rp).attr('y1',y(.3)).attr('y2',y(.3)).attr('stroke',RED).attr('stroke-dasharray','3 3');
  svg.append('text').attr('class','ax').attr('x',W-rp+6).attr('y',y(.3)).attr('dy','.35em').style('fill',RED).text('30%');
  const p=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(pts)).attr('stroke',INK).attr('stroke-width',2.4);
  const e=pts[pts.length-1], el=svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',y(e[1])).attr('dy','.35em').text(pct(e[1],0)).attr('opacity',shown.eff?1:0);
  if(!shown.eff) p.attr('opacity',0);
  svg.node()._rv=()=>{ p.attr('opacity',1); drawOn(p,1500); el.transition().delay(RM?0:1500).attr('opacity',1); };
  const dot=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  crosshair(svg,x,t,H-b,xv=>{ const yy=Math.round(xv); dot.style('display',null).attr('cx',x(yy)).attr('cy',y(effY(yy))); if(cTimer) calPlay(); cy=yy; calPaint(); return yy; },()=>dot.style('display','none'));
}

/* =========== 5. ELS ESTALVIS =========== */
const SY0=+S.habQ[0].slice(0,4); let sy=Y0;
$('#saveT').min=SY0; $('#saveT').max=YL-1; $('#saveT').value=sy;
function saveText(){ $('#saveTitle').textContent=`100 € guardats el ${sy} avui compren el que llavors en compraven ${fmt(cashV(sy))}. En metres de pis, en valdrien ${fmt(flatV(sy))}.`;
  $('#saveLede').textContent=`La inflació es menja a poc a poc els diners quiets. Els metres quadrats, en canvi, han guanyat poder de compra. Per a qui té estalvis, el pis és un refugi; per a qui en busca un per viure-hi, aquesta demanda d’inversió és un competidor més. El pis deixa de ser només un lloc on viure i passa a ser també una guardiola.`; }
function drawSave(shown){
  const svg=d3.select('#save'); const W=pw(svg,560), cw=Math.min(150,W*.3), coin=W<420?6:7.5, per=5, maxV=Math.ceil((d3.max(d3.range(SY0,YL),flatV)+12)/5)*5, H=Math.round(maxV/per*coin+90);
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H).selectAll('*').remove();
  const cols=[{k:'cash',n:'En efectiu',x:W*.28},{k:'flat',n:'En metres de pis',x:W*.72}];
  const yb=H-40;
  cols.forEach(c=>{ const g=svg.append('g').attr('class','stack').attr('data-k',c.k);
    d3.range(maxV/per).forEach(i=>g.append('ellipse').attr('class','coin').attr('cx',c.x).attr('cy',yb-i*coin).attr('rx',cw/2).attr('ry',coin*.9).attr('data-i',i));
    svg.append('text').attr('class','ax').attr('x',c.x).attr('y',H-14).attr('text-anchor','middle').style('font-size','13px').style('fill',INK).text(c.n);
    g.append('text').attr('class','sv').attr('x',c.x).attr('text-anchor','middle'); });
  svg.append('line').attr('class','l100').attr('x1',W*.06).attr('x2',W*.94).attr('stroke',INK).attr('stroke-dasharray','3 3').attr('y1',yb-100/per*coin+coin*.1).attr('y2',yb-100/per*coin+coin*.1);
  svg.append('text').attr('class','ax').attr('x',W*.06).attr('y',yb-100/per*coin-6).text('els 100 € inicials');
  svg.node()._paint=instant=>{ const v={cash:cashV(sy),flat:flatV(sy)};
    cols.forEach(c=>{ const g=svg.select(`[data-k=${c.k}]`), n=v[c.k]/per;
      g.selectAll('ellipse').transition().duration(instant||RM?0:400).delay(function(){ return instant||RM?0:+this.getAttribute('data-i')*8; })
        .attr('fill',function(){ const i=+this.getAttribute('data-i'); return i<n?(i<100/per?R[3]:RED):'transparent'; })
        .attr('stroke',function(){ const i=+this.getAttribute('data-i'); return i<n?BG:(i<100/per?MUTED:'none'); }).attr('stroke-width',1.2).attr('stroke-dasharray',function(){ return +this.getAttribute('data-i')<n?null:'2 2'; });
      g.select('text.sv').transition().duration(instant||RM?0:400).attr('y',yb-Math.max(n,100/per)*coin-12).text(fmt(v[c.k])+' €').style('font-size','20px').style('font-weight',640).style('fill',c.k==='flat'?RED:INK); });
    $('#saveYr').textContent=sy; saveText();
    $('#rSave').innerHTML=`<b>${sy} → ${YL}</b>: els preus s’han multiplicat per ${fmt(ipcY(YL)/ipcY(sy),2)} i el valor taxat del pis per ${fmt(price(YL)/price(sy),2)}. <span class="m">Mou l’any.</span>`; };
  if(shown.save) svg.node()._paint(true); else { svg.selectAll('ellipse').attr('fill','transparent').attr('stroke',LINE).attr('stroke-dasharray','2 2'); svg.node()._rv=()=>svg.node()._paint(); }
}
$('#saveT').addEventListener('input',e=>{ sy=+e.target.value; const n=$('#save'); n._paint&&n._paint(); });
saveText(); $('#saveYr').textContent=sy;

/* =========== 6. ELS JOVES =========== */
const CN={DE:'Alemanya',DK:'Dinamarca',EL:'Grècia',ES:'Espanya',EU27_2020:'Unió Europea',FI:'Finlàndia',FR:'França',HR:'Croàcia',IT:'Itàlia',NL:'Països Baixos',PT:'Portugal',SE:'Suècia'};
const emAt=(g,y)=>{ const r=EM[g].find(r=>r[0]===y); return r?r[1]:null; };
const EYL=d3.max(Object.values(EM),a=>a[a.length-1][0]), EY0=EM.ES[0][0];
let ey=EY0;
$('#emT').min=EY0; $('#emT').max=EYL-1; $('#emT').value=ey;
const esL=emAt('ES',EYL), seL=emAt('SE',EYL), euL=emAt('EU27_2020',EYL);
$('#emTitle').textContent=`A Espanya, els joves marxen de casa als ${fmt(esL,1).replace(',0','')} anys. A Suècia, als ${fmt(seL,1).replace(',0','')}.`;
function emText(){ const e0=emAt('ES',ey);
  $('#emLede').textContent=`És el final de la cadena: si el lloguer s’emporta mig sou i l’entrada són anys d’estalvi, quedar-se a casa dels pares és la manera d’aguantar. El ${ey}, la mitjana a Espanya era de ${fmt(e0,1)} anys; el ${EYL}, de ${fmt(esL,1)}, ${fmt(esL-euL,1)} anys més tard que la mitjana de la Unió Europea. Cada any que s’endarrereix la sortida de casa s’endarrereix també formar una llar, tenir fills o començar a estalviar per a res que no sigui l’habitatge.`;
  $('#emK0').textContent=ey; $('#emK1').textContent=EYL; }
function drawEm(shown){
  const svg=d3.select('#em'); const keys=Object.keys(EM).filter(g=>emAt(g,EYL)!=null).sort((a,b)=>emAt(b,EYL)-emAt(a,EYL));
  const W=pw(svg,640), rh=W<500?27:30, t=10, b=26, lw=W<500?96:124, H=t+b+keys.length*rh;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H).selectAll('*').remove();
  const x=d3.scaleLinear().domain([18,34]).range([lw,W-34]);
  const g=svg.append('g').attr('class','grid'); [20,22,24,26,28,30,32,34].forEach(v=>{ g.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',t).attr('y2',H-b); svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',H-b+15).attr('text-anchor','middle').text(v+(v===34?' anys':'')); });
  const rows=svg.append('g').selectAll('g').data(keys).join('g').attr('transform',(k,i)=>`translate(0,${t+i*rh+rh/2})`);
  rows.append('text').attr('x',lw-12).attr('dy','.35em').attr('text-anchor','end').style('font-size','13px').style('font-weight',k=>k==='ES'?640:400).style('fill',k=>k==='ES'?RED:INK).text(k=>CN[k]);
  rows.append('line').attr('class','dl').attr('stroke',k=>k==='ES'?RED:MUTED).attr('stroke-width',k=>k==='ES'?2.5:1.5);
  rows.append('circle').attr('class','d0').attr('r',5).attr('fill',BG).attr('stroke',MUTED).attr('stroke-width',1.5);
  rows.append('circle').attr('class','d1').attr('r',k=>k==='ES'?7:5.5).attr('fill',k=>k==='ES'?RED:R[3]).attr('cx',k=>x(emAt(k,EYL)));
  rows.append('text').attr('class','dv').attr('dy','.35em').style('font-size','11.5px').style('fill',MUTED);
  svg.node()._paint=instant=>{ const tr=sel=>instant||RM?sel:sel.transition().duration(500);
    tr(rows.select('.d0')).attr('cx',k=>x(emAt(k,ey)??emAt(k,EYL))).attr('opacity',k=>emAt(k,ey)==null?0:1);
    tr(rows.select('.dl')).attr('x1',k=>x(emAt(k,ey)??emAt(k,EYL))).attr('x2',k=>x(emAt(k,EYL)));
    rows.select('.dv').attr('x',k=>x(emAt(k,EYL))+(emAt(k,EYL)>=(emAt(k,ey)??0)?10:-10)).attr('text-anchor',k=>emAt(k,EYL)>=(emAt(k,ey)??0)?'start':'end').text(k=>fmt(emAt(k,EYL),1));
    $('#emYr').textContent=ey; emText(); };
  if(shown.em) svg.node()._paint(true); else { rows.attr('opacity',0); svg.node()._rv=()=>{ rows.transition().delay((k,i)=>RM?0:i*60).duration(RM?0:400).attr('opacity',1); svg.node()._paint(); }; svg.node()._paint(true); }
  const R0='<span class="m">Toca un país.</span>';
  rows.append('rect').attr('x',0).attr('y',-rh/2).attr('width',W).attr('height',rh).attr('fill','transparent').on('pointerenter click',(e,k)=>{ rows.style('opacity',r=>r===k?1:.35);
    $('#rEm').innerHTML=`<b>${CN[k]}</b>: ${emAt(k,ey)!=null?`${fmt(emAt(k,ey),1)} anys el ${ey}, `:''}<b>${fmt(emAt(k,EYL),1)} anys</b> el ${EYL}.`; });
  const clear=()=>{ rows.style('opacity',null); $('#rEm').innerHTML=R0; };
  svg.on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); }); setClear(svg.node(),clear); $('#rEm').innerHTML=R0;
}
$('#emT').addEventListener('input',e=>{ ey=+e.target.value; const n=$('#em'); n._paint&&n._paint(); });
emText();

/* =========== 7. EL NUS: COM ES LLIGA TOT =========== */
const NODES=[
  {k:'feina',m:[0.15,0.02],n:'Feina concentrada',x:.06,y:.1,v:pct(popMe(YL)/popL,0),vs:'de la gent, a l’àmbit metropolità',f:'f1',d:'La feina, els serveis i les universitats es concentren a l’àrea de Barcelona. Qui hi treballa necessita viure-hi a prop, o tan a prop com pugui pagar.'},
  {k:'gent',m:[0.12,0.2],n:'Més gent a l’àrea',x:.3,y:.06,v:'+'+fmt(dMe/1e6,2)+' M',vs:`habitants metropolitans des del ${PY[0]}`,f:'f1',d:'Més població en el mateix espai vol dir més demanda de pisos, tant de compra com de lloguer, en un territori on construir és car i lent.'},
  {k:'llars',m:[0.38,0.2],n:'Llars més petites',x:.3,y:.28,dash:true,d:'Cada cop hi ha més gent que viu sola o en parella. Amb la mateixa població calen més habitatges. Aquesta pàgina encara no ho mesura.'},
  {k:'diners',m:[0.5,0.02],n:'Diners i crèdit abundants',x:.06,y:.5,v:x2(mult('m3',Y0,YL)),vs:`diners en circulació des del ${Y0}`,f:'f2',d:'Els bancs creen diners quan donen crèdit, i el BCE ha mantingut anys de tipus d’interès molt baixos. Els diners barats busquen on rendir.'},
  {k:'inflacio',m:[0.64,0.2],n:'Inflació',x:.3,y:.5,v:x2(mult('ipc',Y0,YL)),vs:`preus de consum des del ${Y0}`,f:'f5',d:'Els preus pugen i els diners quiets perden valor. Guardar estalvis en efectiu és perdre’ls a poc a poc.'},
  {k:'refugi',m:[0.62,0.38],n:'El pis, guardiola',x:.48,y:.38,v:fmt(flatV(Y0))+' €',vs:`valen avui 100 € del ${Y0} posats en pis`,f:'f5',d:'Si els diners es fonen i el pis guanya valor, qui té estalvis compra pisos per guardar-los. És demanda que no busca on viure.'},
  {k:'obra',m:[0.85,0.02],n:'Pocs pisos nous',x:.06,y:.88,dash:true,d:'Després del 2008 la construcció d’habitatges es va desplomar i no ha recuperat el ritme anterior. Aquesta pàgina encara no ho mesura.'},
  {k:'turistic',m:[0.88,0.2],n:'Pisos turístics',x:.3,y:.72,dash:true,d:'Els pisos que es lloguen a turistes o per temporades surten del mercat de lloguer habitual. Aquesta pàgina encara no ho mesura.'},
  {k:'social',m:[0.88,0.38],n:'Poc lloguer públic',x:.3,y:.94,dash:true,d:'El parc d’habitatge social és molt petit comparat amb el de molts països europeus, i no fa de fre als preus. Aquesta pàgina encara no ho mesura.'},
  {k:'preu',m:[0.18,0.56],n:'Preu de compra',x:.62,y:.2,v:x2(mult('hab',Y0,YL)),vs:`des del ${Y0}`,f:'f3',d:'El punt on conflueixen la demanda per viure-hi i la demanda per invertir-hi.',big:true},
  {k:'lloguer',m:[0.82,0.56],n:'Lloguer',x:.62,y:.8,v:x2(rentY.get(RYL)/rentY.get(rentMin)),vs:`a Barcelona des del mínim del ${rentMin}`,f:'f4',d:'Qui no pot comprar lloga, i aquesta demanda empeny el lloguer. Com més paga de lloguer, menys pot estalviar per comprar.',big:true},
  {k:'sou',m:[0.5,0.56],n:'Sou que s’endarrereix',x:.62,y:.5,v:x2(mult('sal',Y0,YL)),vs:`sou des del ${Y0}`,f:'f3',d:`El sou s’ha multiplicat per ${fmt(mult('sal',Y0,YL),2)} des del ${Y0}: menys que l’habitatge (${fmt(mult('hab',Y0,YL),2)}) i ${mult('sal',Y0,YL)<mult('ipc',Y0,YL)?'fins i tot menys que els preus de consum':'poc més que els preus de consum'} (${fmt(mult('ipc',Y0,YL),2)}).`},
  {k:'esforc',m:[0.5,0.76],n:'Esforç impossible',x:.82,y:.5,v:fmt(genY(YL),1),vs:'anys de sou per un pis',f:'f3',d:'Anys de sou per comprar, mesos de sou per llogar: la distància entre el que es guanya i el que costa viure.',big:true},
  {k:'joves',m:[0.5,0.95],n:'Joves a casa',x:.96,y:.5,v:fmt(esL,1),vs:'anys per marxar de casa (Espanya)',f:'f6',d:'El resultat final: la gent jove s’emancipa tard, forma llars tard i té menys marge per a tot el que no és habitatge.'}
];
const EDGES=[['feina','gent'],['gent','preu'],['gent','lloguer'],['llars','preu'],['llars','lloguer'],['diners','preu'],['diners','inflacio'],['inflacio','refugi'],['inflacio','sou'],['refugi','preu'],['obra','preu'],['obra','lloguer'],['turistic','lloguer'],['social','lloguer'],['preu','lloguer'],['preu','esforc'],['lloguer','esforc'],['sou','esforc'],['esforc','joves']];
const NK=Object.fromEntries(NODES.map(n=>[n.k,n]));
let kSel=null;
function kCard(){ const c=$('#kcard'); if(!kSel){ c.innerHTML='<p class="m">Toca un nus del diagrama.</p>'; c.classList.remove('on'); return; }
  const n=NK[kSel], up=EDGES.filter(e=>e[1]===kSel).map(e=>NK[e[0]].n.toLowerCase()), dn=EDGES.filter(e=>e[0]===kSel).map(e=>NK[e[1]].n.toLowerCase());
  const li=a=>a.length>1?a.slice(0,-1).join(', ')+' i '+a[a.length-1]:a[0];
  c.innerHTML=`<p class="kt">${n.n}</p>${n.v?`<p class="kv">${n.v} <small>${n.vs}</small></p>`:'<p class="kv nm">Encara sense mesurar aquí</p>'}<p>${n.d}</p>${up.length?`<p class="m">L’estreny: ${li(up)}.</p>`:''}${dn.length?`<p class="m">Estreny: ${li(dn)}.</p>`:''}${n.f?`<p><a class="back" href="#${n.f}">Veure el fil →</a></p>`:''}`; c.classList.add('on'); }
function drawKnot(shown){
  const svg=d3.select('#knot'); const W=pw(svg,820), nar=W<560, H=Math.round(nar?W*1.6:W*.7);
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H).selectAll('*').remove();
  const r=nar?17:24, pad=nar?{x:34,y:24}:{x:60,y:40};
  const P=n=>nar?[pad.x+n.m[0]*(W-2*pad.x), pad.y+n.m[1]*(H-2*pad.y)]:[pad.x+n.x*(W-2*pad.x), pad.y+n.y*(H-2*pad.y)];
  const rad=n=>n.big?r*1.25:r;
  svg.append('defs').html(`<marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1 9 5 0 9z" fill="${MUTED}"/></marker><marker id="ahr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1 9 5 0 9z" fill="${RED}"/></marker>`);
  const eg=svg.append('g').selectAll('path').data(EDGES).join('path').attr('class','kedge').attr('marker-end','url(#ah)').attr('d',([a,b])=>{
    const A=NK[a],B=NK[b],[x1,y1]=P(A),[x2,y2]=P(B), dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy), ux=dx/L, uy=dy/L;
    const sx=x1+ux*(rad(A)+3), sy=y1+uy*(rad(A)+3), ex=x2-ux*(rad(B)+6), ey=y2-uy*(rad(B)+6), bend=.12*L, mx=(sx+ex)/2-uy*bend, my=(sy+ey)/2+ux*bend;
    return `M${sx},${sy}Q${mx},${my} ${ex},${ey}`; });
  const ng=svg.append('g').selectAll('g').data(NODES).join('g').attr('class',n=>'knode'+(n.dash?' dash':'')).attr('transform',n=>`translate(${P(n)})`).attr('tabindex',0).attr('role','button').attr('aria-label',n=>n.n);
  ng.append('circle').attr('class','halo').attr('r',n=>rad(n)+7);
  ng.append('circle').attr('class','core').attr('r',n=>rad(n));
  ng.append('text').attr('class','kval').attr('dy','.35em').text(n=>n.v?(nar&&n.v.length>6?'':n.v):'?');
  ng.each(function(n){ const words=n.n.split(' '), lines=[]; let cur=''; words.forEach(w=>{ if((cur+' '+w).trim().length>(nar?11:14)&&cur){ lines.push(cur); cur=w; } else cur=(cur+' '+w).trim(); }); lines.push(cur);
    const t=d3.select(this).append('text').attr('class','kname').style('font-size',nar?'11px':null).attr('y',rad(n)+14); lines.forEach((l,i)=>t.append('tspan').attr('x',0).attr('dy',i?'1.1em':0).text(l)); });
  const ups=k=>{ const s=new Set([k]); let ch=true; while(ch){ ch=false; EDGES.forEach(([a,b])=>{ if(s.has(b)&&!s.has(a)){ s.add(a); ch=true; } }); } return s; };
  const dns=k=>{ const s=new Set([k]); let ch=true; while(ch){ ch=false; EDGES.forEach(([a,b])=>{ if(s.has(a)&&!s.has(b)){ s.add(b); ch=true; } }); } return s; };
  function sel(k){ kSel=k; const u=k?ups(k):null, d=k?dns(k):null;
    ng.classed('on',n=>!!k&&n.k===k).classed('dim',n=>!!k&&!u.has(n.k)&&!d.has(n.k)).classed('up',n=>!!k&&n.k!==k&&u.has(n.k)).classed('dn',n=>!!k&&n.k!==k&&d.has(n.k));
    eg.classed('hot',e=>!!k&&((u.has(e[0])&&u.has(e[1]))||(d.has(e[0])&&d.has(e[1])))).classed('dim',e=>!!k&&!((u.has(e[0])&&u.has(e[1]))||(d.has(e[0])&&d.has(e[1]))))
      .attr('marker-end',function(){ return this.classList.contains('hot')?'url(#ahr)':'url(#ah)'; });
    kCard(); }
  ng.on('click',(e,n)=>sel(kSel===n.k?null:n.k)).on('keydown',(e,n)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); sel(kSel===n.k?null:n.k); } });
  setClear(svg.node().parentNode,()=>{ if(kSel) sel(null); });
  if(!shown.knot){ ng.attr('opacity',0); eg.attr('opacity',0);
    svg.node()._rv=()=>{ ng.transition().delay(n=>RM?0:(n.x*900)).duration(RM?0:450).attr('opacity',1); eg.each(function(e,i){ const p=d3.select(this); p.attr('opacity',1); drawOn(p,700,RM?0:400+NK[e[0]].x*900); }); setTimeout(()=>{ if(!kSel) sel('preu'); },RM?0:2000); }; }
  sel(kSel);
}

/* =========== 8. DESFER EL NUS =========== */
const gS=Math.pow(sal(YL)/sal(Y0),1/(YL-Y0))-1, gP=Math.pow(price(YL)/price(Y0),1/(YL-Y0))-1, r0=genY(YL), rT=genY(Y0);
let uS=Math.round(gS*200)/2, uP=Math.round(gP*200)/2;
$('#uS').value=uS; $('#uP').value=uP;
$('#untieTitle').textContent=`Per tornar als ${fmt(rT,1)} anys de sou del ${Y0}, el sou hauria de guanyar terreny durant molt de temps`;
const yrsTo=(s,p)=>{ const q=(1+p)/(1+s); return q<1?Math.log(rT/r0)/Math.log(q):Infinity; };
$('#untieLede').textContent=`Des del ${Y0}, el sou ha crescut de mitjana un ${pct(gS,1)} l’any i el preu del pis, un ${pct(gP,1)}. Si el sou pugés un punt per any més que el pis, caldrien ${fmt(Math.ceil(yrsTo(.03,.02)))} anys per tornar-hi. Mou els controls.`;
function drawUntie(shown){
  const svg=d3.select('#untie'); const [W,H]=sizeOf(svg,697,.52,260,380); const t=16,b=24,rp=W<500?70:110, HZ=30;
  $('#uSV').textContent=(uS>0?'+':'')+fmt(uS,1)+'%'; $('#uPV').textContent=(uP>0?'+':'')+fmt(uP,1)+'%';
  const hist=YRS.map(y=>[y,genY(y)]), q=(1+uP/100)/(1+uS/100), proj=d3.range(0,HZ+1).map(i=>[YL+i,r0*Math.pow(q,i)]);
  const ymax=Math.min(40,Math.max(12,Math.ceil(d3.max(hist.concat(proj),p=>p[1])/2)*2));
  const x=d3.scaleLinear().domain([Y0,YL+HZ]).range([0,W-rp]), y=d3.scaleLinear().domain([0,ymax]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,ymax+1,ymax>20?5:2),v=>v?v+(v+(ymax>20?5:2)>ymax?' anys':''):'0');
  xAxis(svg,x,H-b,W<500?[2000,2025,2050]:[2000,2010,2020,2030,2040,2050]);
  svg.append('rect').attr('x',x(YL)).attr('width',W-rp-x(YL)).attr('y',t).attr('height',H-b-t).attr('fill',LAND).attr('opacity',.45);
  ann(svg,x,t,H-b,YL,'avui',false);
  svg.append('line').attr('x1',0).attr('x2',W-rp).attr('y1',y(rT)).attr('y2',y(rT)).attr('stroke',INK).attr('stroke-dasharray','3 3');
  svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',y(rT)).attr('dy','.35em').text(`com el ${Y0}`);
  const ph=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(Math.min(ymax,d[1])))(hist)).attr('stroke',RED).attr('stroke-width',2.6);
  const pp=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(Math.min(ymax,d[1])))(proj)).attr('stroke',RED).attr('stroke-width',2.2).attr('stroke-dasharray','5 4');
  const n=yrsTo(uS/100,uP/100);
  if(isFinite(n)&&n<=HZ){ const xx=x(YL+n); svg.append('circle').attr('cx',xx).attr('cy',y(rT)).attr('r',6).attr('fill',RED).attr('stroke',BG).attr('stroke-width',2); }
  const e=proj[proj.length-1]; svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',y(Math.min(ymax,e[1]))).attr('dy','.35em').style('fill',RED).text(e[1]>ymax?`>${ymax}`:fmt(e[1],1));
  if(!shown.untie){ ph.attr('opacity',0); pp.attr('opacity',0); svg.node()._rv=()=>{ ph.attr('opacity',1); pp.attr('opacity',1); drawOn(ph,1300); drawOn(pp,1100,1300); }; }
  $('#rUntie').innerHTML= isFinite(n) ? `Amb el sou pujant un <b>${fmt(uS,1)}%</b> i el pis un <b>${fmt(uP,1)}%</b> l’any, el pis tornaria a costar ${fmt(rT,1)} anys de sou cap al <b>${Math.ceil(YL+n)}</b>, d’aquí a ${fmt(Math.ceil(n))} anys.`
    : `Amb el sou pujant un <b>${fmt(uS,1)}%</b> i el pis un <b>${fmt(uP,1)}%</b> l’any, ${uS===uP?'la distància es manté':'la distància no deixa de créixer'}: el ${YL+HZ}, el pis costaria <b>${fmt(e[1],1)} anys de sou</b>.`;
}
['uS','uP'].forEach(id=>$('#'+id).addEventListener('input',e=>{ if(id==='uS') uS=+e.target.value; else uP=+e.target.value; drawUntie({untie:true}); }));
const LEV=[
  ['Més habitatge on hi ha la demanda.','Construir i rehabilitar a l’àrea metropolitana afluixa el fil de la gent: és on es concentra el creixement.'],
  ['Lloguer públic i estable.','Un parc de lloguer fora del mercat fa de fre als preus i trenca el cercle entre lloguer i estalvi.'],
  ['Feina i serveis repartits pel territori.',`Avui, el ${pct(popMe(YL)/popL,0)} de la gent viu en el ${pct(AME/TA,0)} del territori. Si la feina i els serveis arriben més enllà, la pressió es reparteix. És l’altra cara del <a class="back" href="../">despoblament</a>.`],
  ['Que el sou recuperi terreny.','Sense això, qualsevol altra mesura va a contracorrent: el gràfic de dalt mostra quant de temps fa falta.']
];
$('#levers').innerHTML=LEV.map(([a,b])=>`<li><b>${a}</b> ${b}</li>`).join('');

/* ---------- tancament ---------- */
$('#close1').textContent=`El ${Y0}, un pis de 80 m² a la província de Barcelona costava ${fmt(rT,1)} anys de sou brut sencer i el lloguer no tenia la pressió d’avui. El ${YL}, el pis en costa ${fmt(r0,1)} i el lloguer d’un pis nou a Barcelona s’emporta el ${pct(effY(RYL),0)} del sou brut. Entremig, més gent s’ha concentrat on hi ha la feina, els diners han abundat i s’han abaratit, l’estalvi en efectiu ha perdut valor i el pis s’ha convertit també en una inversió.`;

Comu.boot([drawThreads,drawMoney,drawGen,drawEff,drawSave,drawEm,drawKnot,drawUntie],[['threads',.25],['money'],['gen'],['eff'],['save'],['em'],['knot',.25],['untie']]);
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
