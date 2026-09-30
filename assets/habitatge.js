fetch("../data/diners.json").then(r=>r.json()).then(function(D){
"use strict";
const {RM,$,$$,fmt,pct,C,cap,kParse,kMake,sizeOf,pw,drawOn,crosshair,yGrid,xAxis,ann,nearest,endLabels,seg,CLEARS}=Comu;
const S=Comu.series(D), {R,RED,INK,MUTED,LINE,LAND,BG}=C;
const YL=+D.sal[D.sal.length-1][0], Y0=+D.sal[0][0], YRS=d3.range(Y0,YL+1);
const ipcY=S.yAvg(S.ipc);
const QL=S.habQ[S.habQ.length-1];
const qName=q=>`${['1r','2n','3r','4t'][+q.slice(5)-1]} trimestre del ${q.slice(0,4)}`;
$('#upd').textContent=`Dades fins al ${qName(QL)}`;
const GEO={bcn:{i:2,s:'ct',n:'província de Barcelona'},cat:{i:1,s:'ct',n:'Catalunya'},esp:{i:0,s:'es',n:'Espanya'}};
const price=(y,g)=>S.habY(y,GEO[g].i), sal=(y,g)=>S.salY.get(y)[GEO[g].s];
const k1=v=>fmt(Math.round(v/1000))+'.000';

/* =========== 1. EL PLÀNOL: QUANTS m² COMPRA UN ANY DE SOU =========== */
let geo='bcn', py=YL, pTimer=null;
const M2=g=>YRS.map(y=>({y,m:sal(y,g)/price(y,g),p:price(y,g),s:sal(y,g)}));
const mb=M2('bcn'), mb0=mb[0], mbL=mb[mb.length-1], mbMin=mb.reduce((a,b)=>b.m<a.m?b:a);
$('#h1').textContent=`Un any sencer de sou, sense gastar ni un euro, compra ${fmt(mbL.m,1).replace(',0','')} m² de pis.`;
$('#lead').textContent=`És el que passa a la província de Barcelona el ${mbL.y}: un sou brut mitjà de ${fmt(mbL.s)} € contra ${fmt(mbL.p)} € el metre quadrat. El ${mb0.y} en comprava ${fmt(mb0.m,1)}, i el ${mbMin.y}, en plena bombolla, ${fmt(mbMin.m,1)}. Cada quadrat és un metre d’un pis de 80 m².`;
function drawPlan(){
  const svg=d3.select('#plan'); const W=pw(svg,560), cols=10, rows=8, s=W/cols, H=rows*s;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  // Omple per habitacions: el quadrat i-èssim segueix un ordre que recorre el pis des de l'entrada
  const cells=d3.range(80).map(i=>({i,c:i%cols,r:rows-1-Math.floor(i/cols)}));
  svg.append('g').selectAll('rect').data(cells).join('rect').attr('class','cell').attr('x',d=>d.c*s+1).attr('y',d=>d.r*s+1).attr('width',s-2).attr('height',s-2).attr('rx',1.5).attr('fill',LAND);
  svg.append('g').selectAll('rect').data(cells).join('rect').attr('class','fill').attr('x',d=>d.c*s+1).attr('y',d=>d.r*s+1).attr('height',s-2).attr('rx',1.5).attr('fill',RED).attr('width',0);
  // Envans d'un pis tipus (sala, cuina, dues habitacions, bany)
  const wall=[[0,4,4,4],[4,0,4,8],[4,5,10,5],[7,5,7,8],[7,0,7,2.5],[4,2.5,10,2.5]];
  svg.append('g').selectAll('line').data(wall).join('line').attr('x1',d=>d[0]*s).attr('y1',d=>d[1]*s).attr('x2',d=>d[2]*s).attr('y2',d=>d[3]*s).attr('stroke',INK).attr('stroke-width',2.2).attr('stroke-linecap','round');
  svg.append('rect').attr('x',1).attr('y',1).attr('width',W-2).attr('height',H-2).attr('fill','none').attr('stroke',INK).attr('stroke-width',3);
  [['sala',2,6.1],['cuina',2,2],['habitació',5.5,1.3],['bany',8.5,1.3],['menjador',7,3.85],['habitació',5.5,6.6],['habitació',8.5,6.6]].forEach(([t,x,y])=>svg.append('text').attr('class','lab').attr('x',x*s).attr('y',y*s).attr('text-anchor','middle').style('font-weight',500).style('font-size',W<420?'10px':'12px').style('fill',MUTED).text(t));
  paintPlan(true);
}
function paintPlan(instant){
  const d=M2(geo).find(o=>o.y===py), s=+d3.select('#plan').attr('width')/10;
  d3.select('#plan').selectAll('rect.fill').transition().duration(instant||RM?0:250).attr('width',c=>Math.max(0,Math.min(1,d.m-c.i))*(s-2));
  $('#planYr').textContent=py; $('#planT').value=py;
  $('#rPlan').innerHTML=`<b>${py}, ${GEO[geo].n}</b>: sou brut de ${fmt(d.s)} € l’any i ${fmt(d.p)} € el m². <b>${fmt(d.m,1)} m² per any de feina</b>: el pis sencer, ${fmt(80/d.m,1)} anys.`;
}
function playPlan(){
  const b=$('#planPlay');
  if(pTimer){ pTimer.stop(); pTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); return; }
  if(py===YL) py=Y0; const y0=py, t0=performance.now(), dur=RM?0:(YL-y0)*280;
  b.textContent='❚❚'; b.setAttribute('aria-pressed',true);
  pTimer=d3.timer(()=>{ const k=dur?Math.min(1,(performance.now()-t0)/dur):1; const ny=Math.round(y0+(YL-y0)*k); if(ny!==py){ py=ny; paintPlan(); } if(k>=1){ pTimer.stop(); pTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); } });
}
$('#planT').min=Y0; $('#planT').max=YL;
$('#planT').addEventListener('input',e=>{ if(pTimer) playPlan(); py=+e.target.value; paintPlan(); });
$('#planPlay').addEventListener('click',playPlan);
seg('geo',g=>{ geo=g; paintPlan(); });

/* =========== 2. EL PREU, EN EUROS DE CADA ANY O D'AVUI =========== */
const qT=q=>+q.slice(0,4)+(+q.slice(5)-.5)/4;
const ipcQ=S.qAvg(S.ipc), IPCBASE=ipcQ(QL)?QL:S.habQ[S.habQ.length-2], IPCQL=ipcQ(IPCBASE);
const HS=[['bcn','Província de Barcelona',RED],['cat','Catalunya',R[3]],['esp','Espanya',INK]].map(([g,n,c])=>({g,n,c,pts:S.habQ.map(q=>{ const v=S.hab.get(q)[GEO[g].i], iq=ipcQ(q); return [qT(q),v,iq?v*IPCQL/iq:null,q]; }).filter(p=>p[2]!=null)}));
const hb=HS[0], hbPeak=hb.pts.reduce((a,b)=>b[2]>a[2]?b:a), hbL=hb.pts[hb.pts.length-1], hbPeakN=hb.pts.filter(p=>p[0]<2012).reduce((a,b)=>b[1]>a[1]?b:a);
$('#realTitle').textContent= hbL[2]<hbPeak[2] ? `Descomptant la inflació, el pis encara val un ${pct(1-hbL[2]/hbPeak[2],0)} menys que el ${hbPeak[3].slice(0,4)}` : `Descomptant la inflació, el pis ja val més que en plena bombolla`;
$('#realLede').textContent=`En euros de cada any, el metre quadrat a la província de Barcelona ${hbL[1]>hbPeakN[1]?`ja ha superat el màxim nominal de la bombolla (${fmt(hbPeakN[1])} €, ${qName(hbPeakN[3])}): ara és a ${fmt(hbL[1])} €`:`és a ${fmt(hbL[1])} €, a prop del màxim nominal de la bombolla (${fmt(hbPeakN[1])} €)`}. En euros mitjans del ${qName(IPCBASE)}, aquell màxim equival a ${fmt(hbPeakN[2])} €; el màxim real, del ${qName(hbPeak[3])}, a ${fmt(hbPeak[2])} €. Els sous sí que han crescut, però menys que l’habitatge: entre el ${Y0} i el ${YL}, el sou mitjà català ha variat un ${pct(sal(YL,'bcn')/sal(Y0,'bcn')/(ipcY(YL)/ipcY(Y0))-1,1)} en poder de compra.`;
let hMode='nom';
function drawHReal(shown){
  const svg=d3.select('#hreal'); const [W,H]=sizeOf(svg,697,.58,290,420); const t=18,b=24,rp=W<500?84:120;
  const k=hMode==='nom'?1:2;
  const ymax=Math.ceil(d3.max(HS,s=>d3.max(s.pts,p=>p[k]))/1000)*1000;
  const x=d3.scaleLinear().domain([1995,qT(QL)]).range([0,W-rp]); const y=d3.scaleLinear().domain([0,ymax]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,ymax+1,1000),v=>v?fmt(v)+(v===ymax?' €/m²':''):'0');
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[1995,2000,2005,2010,2015,2020,2025]);
  ann(svg,x,t,H-b,2008.7,'2008\nLehman');
  const ln=d3.line().x(p=>x(p[0])).y(p=>y(p[k]));
  const paths=HS.map((s,i)=>{ const p=svg.append('path').attr('class','line').attr('d',ln(s.pts)).attr('stroke',s.c).attr('stroke-width',i===0?2.6:1.8); if(!shown.hreal) p.attr('opacity',0); return p; });
  const L=endLabels(svg,HS.map(s=>{ const e=s.pts[s.pts.length-1]; return {y:y(e[k]),c:s.c,n:W<500?{bcn:'Bcn',cat:'Cat.',esp:'Esp.'}[s.g]:s.n.replace('Província de ',''),v:fmt(e[k])}; }),W-rp+8,15,shown.hreal);
  svg.node()._rv=()=>{ paths.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1600,i*200); }); L.forEach(l=>l.transition().delay(RM?0:1800).attr('opacity',1)); };
  const dots=HS.map(s=>svg.append('circle').attr('r',3.5).attr('fill',s.c).style('display','none'));
  const R0=`<span class="m">Toca el gràfic.</span> ${hMode==='nom'?'En euros de cada any.':`En euros mitjans del ${qName(IPCBASE)}, descomptant l’IPC de Catalunya.`}`;
  crosshair(svg,x,t,H-b,xv=>{ const out=HS.map((s,i)=>{ const p=nearest(s.pts,xv); dots[i].style('display',null).attr('cx',x(p[0])).attr('cy',y(p[k])); return p; });
    $('#rHreal').innerHTML=`<b>${cap(qName(out[0][3]))}</b>: `+HS.map((s,i)=>`${s.n.replace('Província de ','')} <b>${fmt(out[i][k])} €/m²</b>`).join(' · '); return out[0][0]; },
    ()=>{ dots.forEach(d=>d.style('display','none')); $('#rHreal').innerHTML=R0; });
  $('#rHreal').innerHTML=R0;
}
seg('hm',m=>{ hMode=m; drawHReal({hreal:true}); });

/* =========== 3. SI EL PIS HAGUÉS PUJAT COM EL SOU =========== */
const CF=YRS.map(y=>({y,p:price(y,'bcn')*80,s:price(Y0,'bcn')*80*sal(y,'bcn')/sal(Y0,'bcn'),c:price(Y0,'bcn')*80*ipcY(y)/ipcY(Y0)}));
const cfL=CF[CF.length-1];
$('#cfTitle').textContent=`Si els pisos haguessin pujat com els sous, el ${YL} un de 80 m² costaria ${k1(cfL.s)} €. El valor taxat era de ${k1(cfL.p)}.`;
$('#cfLede').textContent=`El ${Y0}, el valor taxat equivalent a 80 m² a la província de Barcelona era de ${k1(CF[0].p)} €. Si des d’aleshores s’hagués apujat al mateix ritme que el sou mitjà català, el ${YL} valdria ${k1(cfL.s)} €; si ho hagués fet com els preus de consum, ${k1(cfL.c)} €. La diferència, ${k1(cfL.p-cfL.s)} €, és el que el valor taxat s’ha avançat al sou en aquesta comparació.`;
function drawCf(shown){
  const svg=d3.select('#cf'); const [W,H]=sizeOf(svg,697,.56,280,400); const t=18,b=24,rp=W<500?90:132;
  const x=d3.scaleLinear().domain([Y0,YL]).range([0,W-rp]); const y=d3.scaleLinear().domain([0,Math.ceil(d3.max(CF,d=>d.p)/50000)*50000]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,y.domain()[1]+1,50000),v=>v?fmt(v/1000)+'.000'+(v===y.domain()[1]?' €':''):'0');
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  const gap=svg.append('path').attr('d',d3.area().x(d=>x(d.y)).y0(d=>y(Math.min(d.s,d.p))).y1(d=>y(d.p))(CF)).attr('fill',R[0]);
  const ln=k=>d3.line().x(d=>x(d.y)).y(d=>y(d[k]));
  const pc=svg.append('path').attr('class','line').attr('d',ln('c')(CF)).attr('stroke',MUTED).attr('stroke-dasharray','4 3').attr('stroke-width',1.6);
  const ps=svg.append('path').attr('class','line').attr('d',ln('s')(CF)).attr('stroke',INK);
  const pp=svg.append('path').attr('class','line').attr('d',ln('p')(CF)).attr('stroke',RED).attr('stroke-width',2.8);
  const L=endLabels(svg,[{y:y(cfL.p),c:RED,n:'observat',v:k1(cfL.p)},{y:y(cfL.s),c:INK,n:W<500?'sou':'com el sou',v:k1(cfL.s)},{y:y(cfL.c),c:MUTED,n:W<500?'IPC':'com l’IPC',v:k1(cfL.c)}],W-rp+8,15,shown.cf);
  if(!shown.cf){ [pc,ps,pp,gap].forEach(p=>p.attr('opacity',0)); svg.node()._rv=()=>{ [pc,ps,pp].forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1500,i*200); }); gap.transition().delay(RM?0:1500).duration(700).attr('opacity',1); L.forEach(l=>l.transition().delay(RM?0:1700).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,H-b,xv=>{ const d=CF.find(o=>o.y===Math.round(xv)); d1.style('display',null).attr('cx',x(d.y)).attr('cy',y(d.p)); d2.style('display',null).attr('cx',x(d.y)).attr('cy',y(d.s));
    $('#rCf').innerHTML=`<b>${d.y}</b>: el pis valia <b>${k1(d.p)} €</b>; si hagués seguit el sou, ${k1(d.s)} €. <span class="m">${d.p>d.s?`${k1(d.p-d.s)} € de més.`:`${k1(d.s-d.p)} € de menys.`}</span>`; return d.y; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rCf').innerHTML=R0; });
  $('#rCf').innerHTML=R0;
}

/* =========== 4. EL PIS GUANYA MÉS QUE TU =========== */
let rate=.2;
const OWN=()=>{ let sv=0; return YRS.map(y=>{ if(y>Y0) sv+=rate*sal(y,'bcn'); return {y,g:(price(y,'bcn')-price(Y0,'bcn'))*80,sv}; }); };
const yrsBeat=YRS.slice(1).filter(y=>(price(y,'bcn')-price(y-1,'bcn'))*80>sal(y,'bcn'));
function ownText(){ const o=OWN(), l=o[o.length-1]; const yrs=l.g/(rate*sal(YL,'bcn'));
  $('#ownTitle').textContent=`El valor taxat de 80 m² ha pujat ${k1(l.g)} € des del ${Y0}`;
  $('#ownLede').textContent=`És l’augment nominal al valor taxat mitjà de la província de Barcelona, abans de costos: no el guany net d’un propietari concret. Un treballador amb el sou mitjà que hagués estalviat cada any el ${pct(rate,0)} del sou brut hauria acumulat ${k1(l.sv)} €. Per igualar aquest augment amb el ritme d’estalvi del ${YL} necessitaria ${fmt(yrs,0)} anys. ${yrsBeat.length?`I hi va haver ${yrsBeat.length===1?'un any':`${yrsBeat.length} anys`} (${yrsBeat.length>1?yrsBeat.slice(0,-1).join(', ')+' i '+yrsBeat[yrsBeat.length-1]:yrsBeat[0]}) en què l’augment del valor taxat equivalent a 80 m² va superar tot el sou brut d’un any.`:''}`; }
function drawOwn(shown){
  const svg=d3.select('#own'); const [W,H]=sizeOf(svg,697,.56,280,400); const t=18,b=24,rp=W<500?84:120;
  const o=OWN(), l=o[o.length-1];
  const x=d3.scaleLinear().domain([Y0,YL]).range([0,W-rp]); const y=d3.scaleLinear().domain([Math.min(0,d3.min(o,d=>d.g)),Math.ceil(d3.max(o,d=>Math.max(d.g,d.sv))/50000)*50000]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,y.domain()[1]+1,50000),v=>v?fmt(v/1000)+'.000'+(v===y.domain()[1]?' €':''):'0');
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  const ag=svg.append('path').attr('d',d3.area().x(d=>x(d.y)).y0(y(0)).y1(d=>y(d.g))(o)).attr('fill',R[1]).attr('opacity',.7);
  const pg=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d.g))(o)).attr('stroke',RED).attr('stroke-width',2.6);
  const ps=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d.sv))(o)).attr('stroke',INK);
  const L=endLabels(svg,[{y:y(l.g),c:RED,n:'el pis',v:k1(l.g)},{y:y(l.sv),c:INK,n:'estalvis',v:k1(l.sv)}],W-rp+8,15,shown.own);
  if(!shown.own){ [pg,ps,ag].forEach(p=>p.attr('opacity',0)); svg.node()._rv=()=>{ pg.attr('opacity',1); ps.attr('opacity',1); drawOn(pg,1600); drawOn(ps,1600,200); ag.transition().delay(RM?0:1500).duration(700).attr('opacity',.7); L.forEach(t=>t.transition().delay(RM?0:1700).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,H-b,xv=>{ const d=o.find(v=>v.y===Math.round(xv)); d1.style('display',null).attr('cx',x(d.y)).attr('cy',y(d.g)); d2.style('display',null).attr('cx',x(d.y)).attr('cy',y(d.sv));
    const dy=d.y>Y0?(price(d.y,'bcn')-price(d.y-1,'bcn'))*80:0;
    $('#rOwn').innerHTML=`<b>${d.y}</b>: el pis acumula ${d.g>=0?'':'−'}<b>${k1(Math.abs(d.g))} €</b> de plusvàlua; els estalvis, ${k1(d.sv)} €.`+(d.y>Y0?` <span class="m">Aquell any el pis ${dy>=0?'va guanyar':'va perdre'} ${fmt(Math.abs(Math.round(dy/100)*100))} €, i el sou brut va ser de ${fmt(sal(d.y,'bcn'))} €.</span>`:''); return d.y; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rOwn').innerHTML=R0; });
  $('#rOwn').innerHTML=R0;
}
seg('rate',v=>{ rate=+v; ownText(); drawOwn({own:true}); drawDown({down:true}); });

/* =========== 5. ANYS PER ESTALVIAR L'ENTRADA =========== */
// Entrada del 20% més un 10% d'impostos i despeses de compra
const DOWN=()=>['bcn','esp'].map(g=>({g,pts:YRS.map(y=>[y,.3*price(y,g)*80/(rate*sal(y,g))])}));
function downText(){ const d=DOWN()[0].pts, a=d[0], l=d[d.length-1], m=d.reduce((p,c)=>c[1]>p[1]?c:p);
  $('#downTitle').textContent=`Per reunir l’entrada d’un pis calen ${fmt(l[1],1).replace(',0','')} anys estalviant el ${pct(rate,0)} del sou`;
  $('#downLede').textContent=`Suposem una hipoteca del 80% del valor i un 10% addicional d’impostos i despeses: poden variar segons l’operació i el comprador. Amb el sou mitjà i estalviant el ${pct(rate,0)} del sou brut, el ${a[0]} calien ${fmt(a[1],1)} anys per reunir aquest 30% d’un pis de 80 m² a la província de Barcelona; el ${m[0]}, ${fmt(m[1],1)}, i el ${l[0]}, ${fmt(l[1],1)}. Tot això abans de començar a pagar la hipoteca.`; }
function drawDown(shown){
  const svg=d3.select('#down'); const [W,H]=sizeOf(svg,697,.5,260,360); const t=18,b=24,rp=W<500?84:150;
  const DS=DOWN(), cols={bcn:RED,esp:INK}, nm={bcn:W<500?'Barcelona':'Prov. de Barcelona',esp:'Espanya'};
  const x=d3.scaleLinear().domain([Y0,YL]).range([0,W-rp]); const ymax=Math.max(20,Math.ceil(d3.max(DS,s=>d3.max(s.pts,p=>p[1]))/5)*5); const y=d3.scaleLinear().domain([0,ymax]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,ymax+1,5),v=>v?v+(v===ymax?' anys':''):'0');
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  const ps=DS.map(s=>{ const p=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(s.pts)).attr('stroke',cols[s.g]).attr('stroke-width',s.g==='bcn'?2.6:1.8); if(!shown.down) p.attr('opacity',0); return p; });
  const L=endLabels(svg,DS.map(s=>{ const e=s.pts[s.pts.length-1]; return {y:y(e[1]),c:cols[s.g],n:nm[s.g],v:fmt(e[1],1)}; }),W-rp+8,15,shown.down);
  svg.node()._rv=()=>{ ps.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1500,i*200); }); L.forEach(l=>l.transition().delay(RM?0:1600).attr('opacity',1)); };
  const dots=DS.map(s=>svg.append('circle').attr('r',4).attr('fill',cols[s.g]).style('display','none'));
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,H-b,xv=>{ const yy=Math.round(xv); DS.forEach((s,i)=>{ const p=s.pts.find(p=>p[0]===yy); dots[i].style('display',null).attr('cx',x(yy)).attr('cy',y(p[1])); });
    const p=price(yy,'bcn')*80; $('#rDown').innerHTML=`<b>${yy}</b>: el 30% d’un pis de ${k1(p)} € són ${k1(.3*p)} €. Estalviant ${fmt(Math.round(rate*sal(yy,'bcn')))} € l’any, <b>${fmt(DS[0].pts.find(p=>p[0]===yy)[1],1)} anys</b>.`; return yy; },
    ()=>{ dots.forEach(d=>d.style('display','none')); $('#rDown').innerHTML=R0; });
  $('#rDown').innerHTML=R0; downText();
}

/* =========== 6. LLOGAR O COMPRAR =========== */
const RB=D.rent[0][0], rent0=D.rent[0][1];
const RS=[
  {k:'rent',n:'Lloguer (Barcelona ciutat)',c:RED,pts:D.rent.map(r=>[r[0],r[1]/rent0])},
  {k:'hab',n:'Preu de compra',c:R[3],pts:D.rent.map(r=>[r[0],price(r[0],'bcn')/price(RB,'bcn')]).filter(p=>!isNaN(p[1]))},
  {k:'sal',n:'Sou',c:INK,pts:D.rent.filter(r=>S.salY.get(r[0])).map(r=>[r[0],sal(r[0],'bcn')/sal(RB,'bcn')])},
  {k:'ipc',n:'Preus',c:MUTED,pts:D.rent.map(r=>[r[0],ipcY(r[0])/ipcY(RB)]).filter(p=>!isNaN(p[1]))},
];
const rBy=Object.fromEntries(RS.map(s=>{ s.end=s.pts[s.pts.length-1]; s.min=s.pts.reduce((a,b)=>b[1]<a[1]?b:a); return [s.k,s]; }));
$('#rbTitle').textContent=`Des del ${rBy.rent.min[0]}, el lloguer a Barcelona ha pujat un ${pct(rBy.rent.end[1]/rBy.rent.min[1]-1,0)}`;
$('#rbLede').textContent=`Qui no pot reunir l’entrada, sovint lloga. I, des del mínim del ${rBy.rent.min[0]}, el lloguer és el que més ha pujat d’aquests quatre indicadors: en conjunt, més de pressa que el preu de compra, que els preus de consum i que el sou, tot i que hi ha anys de baixada. Respecte del ${RB}, el lloguer s’ha multiplicat per ${fmt(rBy.rent.end[1],2)} i el sou, per ${fmt(rBy.sal.end[1],2)}.`;
function drawRb(shown){
  const svg=d3.select('#rb'); const [W,H]=sizeOf(svg,697,.56,280,400); const t=18,b=24,rp=W<500?104:150;
  const x=d3.scaleLinear().domain([RB,D.rent[D.rent.length-1][0]]).range([0,W-rp]); const y=d3.scaleLinear().domain([.6,1.6]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,[.6,.8,1,1.2,1.4,1.6],v=>v===1?String(RB):(v>1?'+':'−')+fmt(Math.abs(v-1)*100)+'%');
  svg.select('.grid').selectAll('line').filter((d,i)=>i===2).style('stroke',MUTED);
  xAxis(svg,x,H-b,W<500?[2010,2015,2020,2025]:d3.range(2008,2026,2));
  const ps=RS.map(s=>{ const p=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(s.pts)).attr('stroke',s.c).attr('stroke-width',s.k==='rent'?2.8:s.k==='sal'?2.2:1.8); if(!shown.rb) p.attr('opacity',0); return p; });
  const L=endLabels(svg,RS.map(s=>({y:y(s.end[1]),c:s.c,n:W<500&&s.k==='hab'?'Compra':s.n.replace(' (Barcelona ciutat)',''),v:(s.end[1]>=1?'+':'−')+fmt(Math.abs(s.end[1]-1)*100)+'%'})),W-rp+8,15,shown.rb);
  svg.node()._rv=()=>{ ps.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1500,i*200); }); L.forEach(l=>l.transition().delay(RM?0:1800).attr('opacity',1)); };
  const dots=RS.map(s=>svg.append('circle').attr('r',3.5).attr('fill',s.c).style('display','none'));
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,H-b,xv=>{ const yy=Math.round(xv); const out=RS.map((s,i)=>{ const p=s.pts.find(p=>p[0]===yy); if(!p){ dots[i].style('display','none'); return ''; } dots[i].style('display',null).attr('cx',x(yy)).attr('cy',y(p[1])); return `<span style="color:${s.c===MUTED?INK:s.c}">${s.n.replace(' (Barcelona ciutat)','').toLowerCase()} ${(p[1]>=1?'+':'−')+fmt(Math.abs(p[1]-1)*100)}%</span>`; }).filter(Boolean);
    $('#rRb').innerHTML=`<b>${yy}</b>, respecte del ${RB}: `+out.join(' · '); return yy; },
    ()=>{ dots.forEach(d=>d.style('display','none')); $('#rRb').innerHTML=R0; });
  $('#rRb').innerHTML=R0;
}

/* ---------- tancament ---------- */
const bL=mb[mb.length-1];
$('#close1').textContent=`El ${Y0}, un pis de 80 m² a la província de Barcelona costava ${fmt(80/mb0.m,1)} anys de sou brut sencer. El ${YL}, ${fmt(80/bL.m,1)}. En el mateix temps, els preus de consum s’han multiplicat per ${fmt(ipcY(YL)/ipcY(Y0),2)} i el sou per ${fmt(sal(YL,'bcn')/sal(Y0,'bcn'),2)}: els preus de consum han pujat una mica més que el sou, i la casa encara més. L’habitatge és alhora un lloc on viure i un actiu: quan es revalora més de pressa que els sous, reunir els diners per comprar-lo es fa més difícil.`;

ownText();
Comu.boot([drawPlan,drawHReal,drawCf,drawOwn,drawDown,drawRb],[['hreal'],['cf'],['own'],['down'],['rb']],
  ()=>{ py=Y0; paintPlan(true); Comu.onView($('#plan'),()=>setTimeout(playPlan,RM?0:400),.4); });
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
