fetch("../data/diners.json").then(r=>r.json()).then(function(D){
"use strict";
const {RM,$,$$,fmt,pct,C,cap,kParse,kMake,kAdd,kDiff,kT,kLabel,mean,OZ,sizeOf,pw,drawOn,crosshair,yGrid,xAxis,ann,nearest,endLabels,seg,CLEARS}=Comu;
const S=Comu.series(D), {R,RED,INK,MUTED,LINE,LAND,BG}=C;
const LASTK=S.IPCLAST<S.GOLDLAST?S.IPCLAST:S.GOLDLAST;                 // últim mes amb IPC i or
const YL=+D.sal[D.sal.length-1][0];                                     // últim any complet de sous
const gE=S.yAvg(S.goldEur), gU=S.yAvg(S.goldUsd), ipcY=S.yAvg(S.ipc);
const kg=eur=>y=>eur/(gE(y)/OZ*1000);                                   // euros → quilos d'or, a preu mitjà de l'any
$('#upd').textContent='Dades fins '+(/^[aeiou]/.test(Comu.MESOS[kParse(LASTK)[1]-1])?'a l’':'al ')+Comu.MESOS[kParse(LASTK)[1]-1]+' de '+kParse(LASTK)[0];
const times=(v,d)=>v>=1?'×'+fmt(v,d==null?(v<3?2:1):d):'÷'+fmt(1/v,d==null?(1/v<3?2:1):d);

/* =========== 1. EL PREU DE TOT, EN EUROS O EN OR =========== */
// Trimestral des del 2000 (sou: anual). Índex: mitjana del 2000 = 1, en la mateixa unitat.
const QS=S.habQ.filter(q=>q>='2000T1');
const qT=q=>+q.slice(0,4)+(+q.slice(5)-.5)/4;
const gQ=S.qAvg(S.goldEur);
const mk=(k,n,c,pts,base)=>({k,n,c,pts:pts.filter(p=>p[1]!=null&&p[2]!=null),base});
const DUAL=[
  mk('or','Or',R[7],QS.map(q=>[qT(q),gQ(q),gQ(q),q]),gE(2000)),
  mk('m3','Diners',R[5],QS.map(q=>[qT(q),S.qAvg(k=>S.m3.get(k))(q),gQ(q),q]),S.yAvg(k=>S.m3.get(k))(2000)),
  mk('hab','Habitatge',RED,QS.map(q=>[qT(q),S.hab.get(q)[2],gQ(q),q]),S.habY(2000,2)),
  mk('ipc','Preus',MUTED,QS.map(q=>[qT(q),S.qAvg(S.ipc)(q),gQ(q),q]),ipcY(2000)),
  mk('sal','Sou',INK,D.sal.map(r=>[r[0]+.5,r[1],gE(r[0]),String(r[0])]),S.salY.get(2000).ct),
];
DUAL.forEach(s=>{ s.eur=s.pts.map(p=>[p[0],p[1]/s.base,p[3]]); s.au=s.pts.map(p=>[p[0],p[1]/s.base/(p[2]/gE(2000)),p[3]]); s.endE=s.eur[s.eur.length-1]; s.endA=s.au[s.au.length-1]; });
const dBy=Object.fromEntries(DUAL.map(s=>[s.k,s]));
const qLab=q=>q.length===4?q:`${q.slice(5)}r trimestre del ${q.slice(0,4)}`;
$('#h1').textContent=`Comptat en or, un pis val un ${pct(1-dBy.hab.endA[1],0)} menys que l’any 2000. I el sou, un ${pct(1-dBy.sal.endA[1],0)} menys.`;
$('#lead').textContent=`En euros, des del 2000 els preus s’han multiplicat per ${fmt(dBy.ipc.endE[1],2)} i l’habitatge per ${fmt(dBy.hab.endE[1],1)}. Però si en lloc d’euros haguéssim fet servir or, gairebé tot seria més barat que llavors, perquè una unça d’or val ${fmt(dBy.or.endE[1],1)} vegades més euros. Canvia el regle i mira què passa.`;
let dMode='eur';
function drawDual(shown){
  const svg=d3.select('#dual'); const [W,H]=sizeOf(svg,697,.66,340,480); const t=18,b=24,rp=W<500?96:124;
  const x=d3.scaleLinear().domain([2000,qT(QS[QS.length-1])]).range([0,W-rp]); const y=d3.scaleLog().base(2).domain([1/20,20]).range([H-b,t]);
  const tk=W<500?[1/16,1/4,1,4,16]:[1/16,1/8,1/4,1/2,1,2,4,8,16];
  yGrid(svg,y,0,W-rp,tk,v=>v===1?'2000':times(v,0));
  svg.select('.grid').selectAll('line').filter((d,i)=>tk[i]===1).style('stroke',MUTED);
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  const ln=d3.line().x(p=>x(p[0])).y(p=>y(p[1]));
  const key=dMode==='eur'?'eur':'au';
  const paths=DUAL.map(s=>{ const p=svg.append('path').attr('class','line').attr('d',ln(s[key])).attr('stroke',s.c).attr('stroke-width',s.k==='sal'||s.k==='hab'?2.8:2); if(!shown.dual) p.attr('opacity',0); return p; });
  const labs=()=>endLabels(svg,DUAL.map(s=>{ const e=s[dMode==='eur'?'endE':'endA']; return {y:y(e[1]),c:s.c,n:s.n,v:times(e[1])}; }),W-rp+8,15,shown.dual);
  let L=labs();
  svg.node()._rv=()=>{ paths.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1800,i*200); }); L.forEach((t,i)=>t.transition().delay(RM?0:1800+i*200).duration(500).attr('opacity',1)); };
  svg.node()._mode=m=>{ const k=m==='eur'?'eur':'au'; paths.forEach((p,i)=>p.transition().duration(RM?0:1400).ease(d3.easeCubicInOut).attr('d',ln(DUAL[i][k])));
    L.forEach(t=>t.remove()); L=labs(); L.forEach(t=>t.attr('opacity',0).transition().delay(RM?0:1100).duration(400).attr('opacity',1)); rd(); };
  const dots=DUAL.map(s=>svg.append('circle').attr('r',3.5).attr('fill',s.c).style('display','none'));
  const rd=()=>$('#rDual').innerHTML= dMode==='eur'
    ? `<span class="m">En euros.</span> Tot puja: l’or, per ${fmt(dBy.or.endE[1],1)}; els diners, per ${fmt(dBy.m3.endE[1],1)}; l’habitatge, per ${fmt(dBy.hab.endE[1],1)}; els preus, per ${fmt(dBy.ipc.endE[1],2)}, i el sou, per ${fmt(dBy.sal.endE[1],2)}. <span class="m">Toca el gràfic.</span>`
    : `<span class="m">En or.</span> L’or queda pla, i tota la resta baixa: la cistella de la compra costa un ${pct(1-dBy.ipc.endA[1],0)} menys que el 2000; un pis, un ${pct(1-dBy.hab.endA[1],0)} menys. Però el sou també ha caigut un ${pct(1-dBy.sal.endA[1],0)}. <span class="m">Toca el gràfic.</span>`;
  crosshair(svg,x,t,H-b,xv=>{ const k=dMode==='eur'?'eur':'au'; const out=[]; DUAL.forEach((s,i)=>{ const p=nearest(s[k],xv); if(Math.abs(p[0]-xv)>.6){ dots[i].style('display','none'); return; } dots[i].style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1])); out.push(`<span style="color:${s.c===MUTED?INK:s.c}">${s.n.toLowerCase()} ${times(p[1])}</span>`); });
    const yy=Math.floor(xv); $('#rDual').innerHTML=`<b>${yy}</b>, ${dMode==='eur'?'en euros':'en or'}, respecte del 2000: `+out.join(' · '); return xv; },
    ()=>{ dots.forEach(d=>d.style('display','none')); rd(); });
  rd();
}
seg('dual',m=>{ dMode=m; const n=$('#dual'); n._mode&&n._mode(m); });

/* =========== 2. EL CALAIX: 100 € EN EFECTIU O EN OR =========== */
const START=d3.range(1999,YL+1);
const realCash=(k0,k)=>100*S.ipc(k0)/S.ipc(k);
const realGold=(k0,k)=>100*S.goldEur(k)/S.goldEur(k0)*S.ipc(k0)/S.ipc(k);
const FIN=START.map(y=>{ const k0=kMake(y,1); return {y,g:realGold(k0,LASTK),c:realCash(k0,LASTK)}; });
let sy=2000;
const f2000=FIN.find(d=>d.y===2000);
$('#boxTitle').textContent=`Si el gener del 2000 haguessis guardat 100 € en or, avui compraries el que llavors valien ${fmt(f2000.g)} €`;
$('#boxLede').textContent=`Els mateixos 100 € en bitllets, al calaix, compren avui el que llavors en compraven ${fmt(f2000.c)}. Tot és en euros del mes de partida, descomptant la inflació de Catalunya. Però l’any en què comences ho canvia tot: tria’l a sota.`;
function drawBox(shown){
  const svg=d3.select('#box'); const [W,H]=sizeOf(svg,697,.56,280,400); const t=18,b=24;
  const k0=kMake(sy,1), n=kDiff(k0,LASTK), pts=d3.range(0,n+1).map(i=>{ const k=kAdd(k0,i); return [kT(k),realGold(k0,k),realCash(k0,k),k]; });
  const x=d3.scaleLinear().domain([sy,kT(LASTK)]).range([0,W-8]);
  const ymax=Math.max(150,d3.max(pts,p=>p[1])); const step=ymax>500?200:ymax>250?100:50;
  const y=d3.scaleLinear().domain([0,Math.ceil(ymax/step)*step]).range([H-b,t]);
  yGrid(svg,y,0,W,d3.range(0,y.domain()[1]+1,step),v=>fmt(v)+(v===y.domain()[1]?' €':''));
  svg.append('line').attr('x1',0).attr('x2',W).attr('y1',y(100)).attr('y2',y(100)).attr('stroke',MUTED).attr('stroke-dasharray','2 3');
  const span=kT(LASTK)-sy; xAxis(svg,x,H-b,d3.range(Math.ceil(sy/5)*5,kT(LASTK),span>14?(W<500?10:5):span>5?(W<500?4:2):1).filter(v=>v>sy+.4));
  svg.append('text').attr('class','ax').attr('x',0).attr('y',H-b+15).text(sy);
  const ln=k=>d3.line().x(p=>x(p[0])).y(p=>y(p[k]));
  const pc=svg.append('path').attr('class','line').attr('d',ln(2)(pts)).attr('stroke',INK);
  const pg=svg.append('path').attr('class','line').attr('d',ln(1)(pts)).attr('stroke',RED).attr('stroke-width',2.6);
  const e=pts[pts.length-1];
  const lb=endLabels(svg,[{y:y(e[1]),c:RED,n:'en or',v:fmt(e[1])+' €'},{y:y(e[2]),c:INK,n:'en bitllets',v:fmt(e[2])+' €'}].map(o=>o),0,15,true);
  lb.forEach(t=>t.attr('x',W).attr('text-anchor','end').attr('dy','-.6em'));
  if(!shown.box){ pc.attr('opacity',0); pg.attr('opacity',0); lb.forEach(l=>l.attr('opacity',0)); svg.node()._rv=()=>{ pc.attr('opacity',1); pg.attr('opacity',1); drawOn(pc,1500); drawOn(pg,1500,150); lb.forEach(l=>l.transition().delay(RM?0:1500).attr('opacity',1)); }; }
  else if(!RM){ drawOn(pc,900); drawOn(pg,900); }
  const dot=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), dc=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const oz=100/S.goldEur(k0);
  const R0=`<b>Gener ${sy}</b>: 100 € compraven ${fmt(oz*OZ,1)} grams d’or (${fmt(oz,2)} unces). ${cap(kLabel(LASTK))}, aquest or val <b>${fmt(100*S.goldEur(LASTK)/S.goldEur(k0))} €</b>, que compren el que llavors ${fmt(e[1])} €. Els bitllets, ${fmt(e[2])} €.`;
  crosshair(svg,x,t,H-b,xv=>{ const p=nearest(pts,xv); dot.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1])); dc.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[2]));
    $('#rBox').innerHTML=`<b>${cap(kLabel(p[3]))}</b>: l’or val <b>${fmt(p[1])} €</b> de ${sy}; els bitllets, ${fmt(p[2])} €.`+(p[1]<100?' <span class="m">L’or perd poder de compra.</span>':''); return p[0]; },
    ()=>{ dot.style('display','none'); dc.style('display','none'); $('#rBox').innerHTML=R0; });
  $('#rBox').innerHTML=R0;
  drawStarts();
}
function drawStarts(){
  const svg=d3.select('#starts'); const [W,H]=sizeOf(svg,697,.3,150,200); const t=14,b=22;
  const lw=W<500?30:36;
  const x=d3.scaleBand().domain(START).range([lw,W]).padding(.18); const y=d3.scaleLog().domain([Math.min(80,d3.min(FIN,d=>d.g)*.9),d3.max(FIN,d=>d.g)*1.1]).range([H-b,t]);
  const TK=[100,200,400,800].filter(v=>v<y.domain()[1]);
  TK.forEach(v=>svg.append('line').attr('x1',lw).attr('x2',W).attr('y1',y(v)).attr('y2',y(v)).attr('stroke',v===100?MUTED:LINE).attr('stroke-dasharray',v===100?'2 3':null));
  const g=svg.append('g').selectAll('g').data(FIN).join('g').style('cursor','pointer');
  g.append('rect').attr('x',d=>x(d.y)).attr('width',x.bandwidth()).attr('y',t).attr('height',H-b-t).attr('fill','transparent');
  g.append('rect').attr('x',d=>x(d.y)).attr('width',x.bandwidth()).attr('rx',1.5).attr('y',d=>Math.min(y(d.g),y(100))).attr('height',d=>Math.abs(y(d.g)-y(100))).attr('fill',d=>d.y===sy?RED:d.g<100?MUTED:R[2]);
  TK.forEach(v=>svg.append('text').attr('class','ax').attr('x',lw-5).attr('y',y(v)).attr('dy','.35em').attr('text-anchor','end').text(fmt(v)+' €'));
  xAxis(svg,d=>x(d)+x.bandwidth()/2,H-b,START.filter(v=>v%(W<500?5:2)===0||v===sy));
  g.on('click',(e,d)=>{ sy=d.y; $('#boxY').value=sy; $('#boxYr').textContent=sy; drawBox({box:true}); });
}
$('#boxY').min=START[0]; $('#boxY').max=START[START.length-1]; $('#boxY').value=sy; $('#boxYr').textContent=sy;
$('#boxY').addEventListener('input',e=>{ sy=+e.target.value; $('#boxYr').textContent=sy; drawBox({box:true}); });
// El pitjor moment pel camí: la caiguda real més gran respecte dels 100 € inicials, per a cada any de compra
const DIP=START.map(y=>{ const k0=kMake(y,1); let m={v:100,k:k0}; for(let i=1;i<=kDiff(k0,LASTK);i++){ const k=kAdd(k0,i), v=realGold(k0,k); if(v<m.v) m={v,k}; } let back=null; if(m.v<100) for(let i=kDiff(k0,m.k);i<=kDiff(k0,LASTK);i++){ const k=kAdd(k0,i); if(realGold(k0,k)>=100){ back=k; break; } } return {y,...m,back}; });
const mesDel=k=>Comu.MESOS[kParse(k)[1]-1]+' del '+kParse(k)[0];
const dW=DIP.reduce((a,b)=>b.v<a.v?b:a);
$('#startsLede').textContent=`Cada barra és el que valen avui, descomptant la inflació, 100 € posats en or el gener de cada any. ${FIN.every(d=>d.g>100)?'Com que l’or és a prop del seu màxim, totes guanyen. Però':'I'} pel camí no sempre ha estat així: qui va comprar el gener del ${dW.y} va arribar a perdre un ${pct(1-dW.v/100,0)} de poder de compra (${mesDel(dW.k)})${dW.back?` i no el va recuperar fins ${/^[aeiou]/.test(mesDel(dW.back))?'a l’':'al '}${mesDel(dW.back)}`:''}. Toca una barra per veure-la a dalt.`;

/* =========== 3. UN ANY DE SOU, EN UNCES =========== */
const SOZ=D.sal.map(r=>({y:r[0],e:r[1],oz:r[1]/gE(r[0])}));
const So0=SOZ[0], SoL=SOZ[SOZ.length-1], SoMax=SOZ.reduce((a,b)=>b.oz>a.oz?b:a);
$('#salTitle').textContent=`El ${So0.y}, un any de sou comprava ${fmt(So0.oz,0)} unces d’or. El ${SoL.y}, ${fmt(SoL.oz,0)}.`;
$('#salLede').textContent=`En euros, el sou brut mitjà a Catalunya ha passat de ${fmt(So0.e)} € a ${fmt(SoL.e)} €. En or, ha passat de ${fmt(So0.oz*OZ/1000,2)} quilos a ${fmt(SoL.oz*OZ,0)} grams. Si t’haguessin pagat en or i els preus s’haguessin comptat en or, el teu sou hauria caigut un ${pct(1-SoL.oz/So0.oz,0)}.`;
function drawSalOz(shown){
  const svg=d3.select('#salOz'); const [W,H]=sizeOf(svg,697,.5,260,360); const t=24,b=24;
  const x=d3.scaleBand().domain(SOZ.map(d=>d.y)).range([W<500?24:30,W]).padding(.2); const y=d3.scaleLinear().domain([0,Math.ceil(SoMax.oz/10)*10]).range([H-b,t]);
  yGrid(svg,y,0,W,d3.range(0,y.domain()[1]+1,W<500?20:10),v=>v?v+(v===y.domain()[1]?' unces':''):'0');
  xAxis(svg,d=>x(d)+x.bandwidth()/2,H-b,SOZ.map(d=>d.y).filter(v=>v%5===0));
  const g=svg.append('g').selectAll('g').data(SOZ).join('g').attr('class','rent-b');
  g.append('rect').attr('x',d=>x(d.y)).attr('width',x.bandwidth()).attr('y',t).attr('height',H-b-t).attr('fill','transparent');
  const bars=g.append('rect').attr('x',d=>x(d.y)).attr('width',x.bandwidth()).attr('rx',2).attr('fill',d=>d.y===SoL.y?RED:R[3]).attr('y',d=>shown.salOz?y(d.oz):y(0)).attr('height',d=>shown.salOz?y(0)-y(d.oz):0);
  [So0,SoMax,SoL].filter((d,i,a)=>a.indexOf(d)===i).forEach(d=>svg.append('text').attr('class','lab').attr('x',x(d.y)+x.bandwidth()/2).attr('y',y(d.oz)-7).attr('text-anchor','middle').text(fmt(d.oz,0)));
  svg.node()._rv=()=>bars.transition().delay((d,i)=>RM?0:i*50).duration(700).ease(d3.easeCubicOut).attr('y',d=>y(d.oz)).attr('height',d=>y(0)-y(d.oz));
  const R0='<span class="m">Toca una barra.</span>';
  const sel=d=>{ g.attr('opacity',o=>o===d?1:.5); $('#rSalOz').innerHTML=`<b>${d.y}</b>: sou brut de ${fmt(d.e)} €, a ${fmt(gE(d.y))} € l’unça: <b>${fmt(d.oz,1)} unces</b>, ${fmt(d.oz*OZ,0)} grams d’or.`; };
  const clear=()=>{ g.attr('opacity',1); $('#rSalOz').innerHTML=R0; };
  g.on('pointerenter',(e,d)=>sel(d)).on('click',(e,d)=>sel(d)); svg.on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); }); CLEARS.push([svg.node(),clear]);
  $('#rSalOz').innerHTML=R0;
}

/* =========== 4. UN PIS DE 80 m², EN QUILOS D'OR =========== */
const FLAT=d3.range(2000,YL+1).map(y=>{ const e=S.habY(y,2)*80, s=S.salY.get(y).ct; return {y,e,kg:kg(e)(y),skg:kg(s)(y),yrs:e/s}; });
const F0=FLAT[0], FL=FLAT[FLAT.length-1];
let fy=F0.y, fTimer=null;
$('#flatTitle').textContent=`Un pis de 80 m² valia ${fmt(F0.kg,1)} quilos d’or el ${F0.y}. Ara, ${fmt(FL.kg,1)}.`;
$('#flatLede').textContent=`Cada lingot és un quilo d’or. El valor taxat mitjà d’un pis de 80 m² a la província de Barcelona ha passat de ${fmt(Math.round(F0.e/1000))}.000 € a ${fmt(Math.round(FL.e/1000))}.000 €, però en or s’ha encongit.`;
let FG=null; // geometria dels lingots
function drawFlat(){
  const svg=d3.select('#flat'); const W=pw(svg,697); const cols=W<500?4:6, gx=10, gy=12, bw=Math.min(96,(W-(cols-1)*gx)/cols), bh=bw*.42;
  const n=Math.ceil(d3.max(FLAT,d=>d.kg)), rows=Math.ceil(n/cols), H=rows*(bh+gy)+4, ox=(W-(cols*bw+(cols-1)*gx))/2;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  FG={bw,bh};
  svg.selectAll('g.i').data(d3.range(n)).join('g').attr('class','i').attr('transform',i=>`translate(${ox+(i%cols)*(bw+gx)},${H-bh-Math.floor(i/cols)*(bh+gy)})`);
  paintFlat();
}
// Lingot (trapezi) tallat a la fracció w de la seva amplada
const ingot=(bw,bh,w)=>{ const i=bw*.14, r=bw*w; return w>=1?`M${i},0H${bw-i}L${bw},${bh}H0Z`:`M${Math.min(i,r)},0H${Math.min(bw-i,r)}L${r},${bh}H0Z`; };
function paintFlat(){
  if(!FG) return; const d=FLAT.find(o=>o.y===fy), {bw,bh}=FG;
  d3.select('#flat').selectAll('g.i').each(function(i){ const g=d3.select(this), w=Math.max(0,Math.min(1,d.kg-i)); g.selectAll('*').remove();
    g.append('path').attr('d',ingot(bw,bh,1)).attr('fill',w?LAND:'none').attr('stroke',w?'none':LINE).attr('stroke-dasharray','3 3');
    if(w>0) g.append('path').attr('d',ingot(bw,bh,w)).attr('fill',R[4]); });
  $('#flatYr').textContent=fy; $('#flatT').value=fy;
  $('#rFlat').innerHTML=`<b>${fy}</b>: 80 m² valien ${fmt(Math.round(d.e/100)*100)} €, i l’or, ${fmt(gE(fy))} € l’unça. <b>${fmt(d.kg,2)} quilos d’or.</b> <span class="m">El sou d’un any: ${fmt(d.skg*1000,0)} grams.</span>`;
}
function playFlat(){
  const btn=$('#flatPlay');
  if(fTimer){ fTimer.stop(); fTimer=null; btn.textContent='▶'; btn.setAttribute('aria-pressed',false); return; }
  if(fy===FL.y) fy=F0.y; const y0=fy, t0=performance.now(), dur=RM?0:(FL.y-y0)*260;
  btn.textContent='❚❚'; btn.setAttribute('aria-pressed',true);
  fTimer=d3.timer(()=>{ const k=dur?Math.min(1,(performance.now()-t0)/dur):1; const ny=Math.round(y0+(FL.y-y0)*k); if(ny!==fy){ fy=ny; paintFlat(); } if(k>=1){ fTimer.stop(); fTimer=null; btn.textContent='▶'; btn.setAttribute('aria-pressed',false); } });
}
$('#flatT').min=F0.y; $('#flatT').max=FL.y;
$('#flatT').addEventListener('input',e=>{ if(fTimer) playFlat(); fy=+e.target.value; paintFlat(); });
$('#flatPlay').addEventListener('click',playFlat);
$('#ratioP').textContent=`Però fixa’t en una cosa. El ${F0.y}, aquest pis costava ${fmt(F0.yrs,1)} anys de sou, tant si ho comptes en euros com en or: ${fmt(F0.kg,1)} quilos d’or dividits per ${fmt(F0.skg,2)} quilos de sou. El ${FL.y}, en costa ${fmt(FL.yrs,1)}, també en euros i en or. Canviar el regle no fa que el pis sigui més assequible: només canvia la mida de tots els números alhora. Si tot «baixa» comptat en or, és que qui s’ha mogut és l’or.`;

/* =========== 5. EL PREU REAL DE L'OR DES DEL 1800 =========== */
const USC=S.usCpi, UY=D.usCpi[D.usCpi.length-1][0];
const gHist=y=>{ if(y>=1960) return gU(y); const p=D.goldPar.find(r=>y>=r[0]&&y<=r[1]); return p?p[2]:null; };
const GR=d3.range(1800,UY+1).map(y=>{ const g=gHist(y); return g==null?[y,null,null]:[y,g,g*USC.get(UY)/USC.get(y)]; });
const grAt=y=>GR.find(d=>d[0]===y);
const GRP=GR.filter(d=>d[1]!=null&&d[0]<1971), grPreMax=GRP.reduce((a,b)=>b[2]>a[2]?b:a), grPreMin=GRP.reduce((a,b)=>b[2]<a[2]?b:a);
const g80=grAt(1980), g00=grAt(2000), gUY=grAt(UY);
const lowSince=GR.filter(d=>d[1]!=null&&d[0]<2000&&d[2]<=g00[2]).pop(), isMax=GR.every(d=>d[1]==null||d[2]<=gUY[2]);
$('#realTitle').textContent=`El 2000 l’or valia menys que en qualsevol moment des del ${lowSince[0]}.`+(isMax?` El ${UY}, més que mai.`:'');
$('#realLede').textContent=`Aquest és el preu d’una unça en dòlars d’avui, descomptant la inflació dels Estats Units. Durant el segle i mig de patró or es va moure entre ${fmt(grPreMin[2])} $ (${grPreMin[0]}) i ${fmt(grPreMax[2])} $ (${grPreMax[0]}). El 1980 va arribar a ${fmt(g80[2])} $, i el ${g00[0]}, en plena venda d’or dels bancs centrals, havia tornat a baixar a ${fmt(g00[2])} $. El ${gUY[0]}, ${fmt(gUY[2])} $. Començar a comptar el 2000 és començar a prop del fons del pou.`;
let rMode='real';
function drawReal(shown){
  const svg=d3.select('#real'); const [W,H]=sizeOf(svg,697,.6,300,440); const t=22,b=24;
  const x=d3.scaleLinear().domain([1800,UY]).range([0,W]);
  const k=rMode==='real'?2:1; const pts=GR.filter(d=>d[1]!=null);
  const y=rMode==='real'?d3.scaleLinear().domain([0,4000]).range([H-b,t]):d3.scaleLog().domain([10,5000]).range([H-b,t]);
  yGrid(svg,y,0,W,rMode==='real'?[0,1000,2000,3000,4000]:[10,20,50,100,200,500,1000,2000,5000].filter(v=>W>=500||[10,100,1000].includes(v)),v=>fmt(v)+' $');
  xAxis(svg,x,H-b,W<500?[1800,1850,1900,1950,2000]:[1800,1825,1850,1875,1900,1925,1950,1975,2000,2025]);
  svg.append('rect').attr('x',x(1862)).attr('y',t).attr('width',x(1879)-x(1862)).attr('height',H-b-t).attr('fill',LAND);
  ann(svg,x,t,H-b,1862,W<500?'1862':'1862–1878\nbitllets\nsense or');
  ann(svg,x,t+(W<500?30:0),H-b,1934,'1934\n35 $');
  ann(svg,x,t,H-b,1971,'1971',true,'end');
  const ln=d3.line().defined(d=>d[1]!=null).x(d=>x(d[0])).y(d=>y(d[k]));
  const pre=GR.filter(d=>d[0]<=1971), post=GR.filter(d=>d[0]>=1971);
  const p1=svg.append('path').attr('class','line').attr('d',ln(pre)).attr('stroke',INK);
  const p2=svg.append('path').attr('class','line').attr('d',ln(post)).attr('stroke',RED).attr('stroke-width',2.6);
  [g80,g00,gUY].forEach(d=>svg.append('text').attr('class','lab').attr('x',x(d[0])+(d===gUY?-4:d===g00?0:-4)).attr('y',y(d[k])+(d===g00?16:-8)).attr('text-anchor',d===g00?'middle':'end').text(d[0]+': '+fmt(d[k])+' $'));
  if(!shown.real){ p1.attr('opacity',0); p2.attr('opacity',0); svg.node()._rv=()=>{ p1.attr('opacity',1); p2.attr('opacity',1); drawOn(p1,1600); drawOn(p2,900,1600); }; }
  const dot=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none');
  const R0=`<span class="m">Toca el gràfic.</span> ${rMode==='real'?`En dòlars de ${UY}.`:'En dòlars de cada any, escala logarítmica: cada línia horitzontal multiplica.'} Els forats són anys sense paritat oficial.`;
  crosshair(svg,x,t,H-b,xv=>{ const d=nearest(pts,xv); dot.style('display',null).attr('cx',x(d[0])).attr('cy',y(d[k]));
    $('#rReal').innerHTML=`<b>${d[0]}</b>: una unça, ${fmt(d[1],d[1]<100?2:0)} $ de l’època, que són <b>${fmt(d[2])} $ de ${UY}</b>.`; return d[0]; },
    ()=>{ dot.style('display','none'); $('#rReal').innerHTML=R0; });
  $('#rReal').innerHTML=R0;
}
seg('rm',m=>{ rMode=m; drawReal({real:true}); });

/* =========== 6. L'OR I ELS DINERS =========== */
const M2Y=S.yAvg(k=>S.usM2.get(k)), M3Y=S.yAvg(k=>S.m3.get(k));
const MON={
  us:{y0:1971,y1:UY,g:gU,m:M2Y,cur:'$',mn:'M2 dels EUA',gn:'Or, en dòlars'},
  eu:{y0:1999,y1:YL,g:gE,m:M3Y,cur:'€',mn:'M3 de la zona euro',gn:'Or, en euros'},
};
Object.values(MON).forEach(o=>{ o.pts=d3.range(o.y0,o.y1+1).map(y=>[y,o.g(y)/o.g(o.y0),o.m(y)/o.m(o.y0)]).filter(p=>!isNaN(p[1])&&!isNaN(p[2])); o.end=o.pts[o.pts.length-1]; o.fair=o.g(o.y0)*o.end[2]; o.ratio=o.pts.map(p=>[p[0],p[1]/p[2]]); o.rmin=o.ratio.reduce((a,b)=>b[1]<a[1]?b:a); o.rmax=o.ratio.reduce((a,b)=>b[1]>a[1]?b:a); });
$('#monLede').textContent=`Si l’or només reflectís que cada any hi ha més diners, el seu preu hauria de créixer com la massa monetària. Als Estats Units, des del 1971 els diners s’han multiplicat per ${fmt(MON.us.end[2],0)} i l’or per ${fmt(MON.us.end[1],0)}. Si hagués crescut com els diners, avui una unça valdria uns ${fmt(Math.round(MON.us.fair/10)*10)} $, i no ${fmt(gU(UY))} $.`;
let mReg='us';
function drawMon(shown){
  const svg=d3.select('#mon'); const [W,H]=sizeOf(svg,697,.58,290,420); const t=18,b=24,rp=W<500?84:116;
  const o=MON[mReg];
  const x=d3.scaleLinear().domain([o.y0,o.y1]).range([0,W-rp]); const ymax=d3.max(o.pts,p=>Math.max(p[1],p[2]));
  const y=d3.scaleLog().base(2).domain([.5,Math.pow(2,Math.ceil(Math.log2(ymax)))]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,Math.log2(y.domain()[1])+1).map(i=>2**i).filter((v,i,a)=>a.length<9||i%2===0),v=>v===1?String(o.y0):'×'+fmt(v));
  xAxis(svg,x,H-b,o.y0===1971?(W<500?[1980,2000,2020]:[1971,1980,1990,2000,2010,2020]):(W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]));
  const ln=k=>d3.line().x(p=>x(p[0])).y(p=>y(p[k]));
  const band=svg.append('path').attr('d',d3.area().x(p=>x(p[0])).y0(p=>y(p[2])).y1(p=>y(p[1]))(o.pts)).attr('fill',R[0]);
  const pm=svg.append('path').attr('class','line').attr('d',ln(2)(o.pts)).attr('stroke',INK);
  const pg=svg.append('path').attr('class','line').attr('d',ln(1)(o.pts)).attr('stroke',RED).attr('stroke-width',2.6);
  const L=endLabels(svg,[{y:y(o.end[1]),c:RED,n:'or',v:'×'+fmt(o.end[1],0)},{y:y(o.end[2]),c:INK,n:'diners',v:'×'+fmt(o.end[2],1)}],W-rp+8,15,shown.mon);
  if(!shown.mon){ [pm,pg,band].forEach(p=>p.attr('opacity',0)); svg.node()._rv=()=>{ pm.attr('opacity',1); pg.attr('opacity',1); drawOn(pm,1600); drawOn(pg,1600,200); band.transition().delay(RM?0:1500).duration(700).attr('opacity',1); L.forEach(l=>l.transition().delay(RM?0:1700).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0=`<span class="m">Toca el gràfic.</span> On la franja és ampla, l’or s’ha allunyat dels diners. El punt més car respecte dels diners va ser el ${o.rmax[0]}; el més barat, el ${o.rmin[0]}.`;
  crosshair(svg,x,t,H-b,xv=>{ const p=nearest(o.pts,xv); d1.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1])); d2.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[2]));
    const r=p[1]/p[2]; $('#rMon').innerHTML=`<b>${p[0]}</b>, respecte del ${o.y0}: or ×${fmt(p[1],1)}, diners ×${fmt(p[2],1)}. <span class="m">L’or ${r>=1?`va ${fmt(r,1)} vegades per davant`:`va ${fmt(1/r,1)} vegades per darrere`} dels diners.</span>`; return p[0]; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rMon').innerHTML=R0; });
  $('#rMon').innerHTML=R0;
  $('#monNote').textContent= mReg==='us' ? `Mitjanes anuals, ${o.y0} = 1, escala logarítmica. Or: Banc Mundial. Diners: M2 dels Estats Units (efectiu, comptes i dipòsits d’estalvi), Reserva Federal (FRED).` : `Mitjanes anuals, ${o.y0} = 1, escala logarítmica. Or en euros: Banc Mundial i BCE. Diners: M3 de la zona euro (BCE).`;
}
seg('mreg',m=>{ mReg=m; drawMon({mon:true}); });

/* =========== 7. DEPÈN DE QUAN COMPRES =========== */
const HY=d3.range(1971,UY+1), realG=y=>gU(y)/USC.get(y);
const CELLS=[]; HY.forEach(a=>HY.forEach(b=>{ if(b>a){ const tot=realG(b)/realG(a); CELLS.push({a,b,tot,ann:Math.pow(tot,1/(b-a))-1}); } }));
const lossLong=CELLS.filter(c=>c.tot<1).reduce((m,c)=>c.b-c.a>m.b-m.a?c:m,{a:0,b:0});
const shareLoss10=(()=>{ const c=CELLS.filter(c=>c.b-c.a===10); return c.filter(x=>x.tot<1).length/c.length; })();
$('#heatLede').textContent=`Cada quadret és el que hauries guanyat o perdut, descomptant la inflació, comprant or de mitjana un any (a baix) i venent-lo un altre (a la dreta). En vermell, guanys; en gris, pèrdues. De tots els períodes de deu anys des del 1971, en un ${pct(shareLoss10,0)} l’or va perdre poder de compra. El període més llarg amb pèrdues va del ${lossLong.a} al ${lossLong.b}: ${lossLong.b-lossLong.a} anys.`;
function drawHeat(shown){
  const svg=d3.select('#heat'); const W=pw(svg,640), n=HY.length, lw=W<500?26:34, s=(W-lw)/(n-1), H=s*(n-1)+26;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  const cx=b=>lw+(b-HY[1])*s, cy=a=>(HY[n-2]-a)*s;
  const col=v=>v>=0?d3.interpolateRgb(R[0],R[6])(Math.min(1,v/.15)):d3.interpolateRgb('#E3E3DE','#55554F')(Math.min(1,-v/.15));
  const cells=svg.append('g').selectAll('rect').data(CELLS).join('rect').attr('x',c=>cx(c.b)).attr('y',c=>cy(c.a)).attr('width',s+.3).attr('height',s+.3).attr('fill',c=>col(c.ann)).attr('opacity',shown.heat?1:0);
  svg.node()._rv=()=>cells.transition().delay(c=>RM?0:(c.b-c.a)*25).duration(300).attr('opacity',1);
  HY.filter(v=>v%10===0||v===1971).forEach(v=>{ if(v<HY[n-1]) svg.append('text').attr('class','ax').attr('x',lw-4).attr('y',cy(v)+s/2).attr('dy','.35em').attr('text-anchor','end').text(W<500?"’"+String(v).slice(2):v);
    if(v>HY[0]) svg.append('text').attr('class','ax').attr('x',cx(v)+s/2).attr('y',H-8).attr('text-anchor','middle').text(W<500?"’"+String(v).slice(2):v); });
  svg.append('text').attr('class','ax').attr('x',W).attr('y',12).attr('text-anchor','end').text('any de compra ↓ · any de venda →');
  const hl=svg.append('rect').attr('fill','none').attr('stroke',INK).attr('stroke-width',1.5).style('display','none');
  const R0='<span class="m">Toca un quadret.</span>';
  const pick=e=>{ const [px,py]=d3.pointer(e,svg.node()); const b=Math.round((px-lw)/s-.5)+HY[1], a=HY[n-2]-Math.round(py/s-.5); const c=CELLS.find(c=>c.a===a&&c.b===b); if(!c){ return; }
    hl.style('display',null).attr('x',cx(c.b)).attr('y',cy(c.a)).attr('width',s).attr('height',s);
    $('#rHeat').innerHTML=`Comprant el <b>${c.a}</b> i venent el <b>${c.b}</b>: ${c.tot>=1?'guanyes':'perds'} <b>${pct(Math.abs(c.tot-1),0)}</b> de poder de compra, ${c.ann>=0?'+':'−'}${fmt(Math.abs(c.ann)*100,1)}% l’any.`; };
  svg.on('pointermove',pick).on('pointerdown',pick).on('pointerleave',e=>{ if(e.pointerType==='mouse'){ hl.style('display','none'); $('#rHeat').innerHTML=R0; } });
  CLEARS.push([svg.node(),()=>{ hl.style('display','none'); $('#rHeat').innerHTML=R0; }]);
  $('#rHeat').innerHTML=R0;
}

/* =========== 8. VINT ANYS SOTA L'AIGUA =========== */
let pk=0; const DD=HY.map(y=>{ const r=realG(y); pk=Math.max(pk,r); return [y,r/pk-1]; });
const ddMin=DD.reduce((a,b)=>b[1]<a[1]?b:a);
const rec=DD.find(d=>d[0]>1980&&realG(d[0])>=realG(1980));
$('#ddTitle').textContent= rec ? `Qui va comprar or el 1980 va trigar ${rec[0]-1980} anys a recuperar el poder de compra` : `Qui va comprar or el 1980 encara no ha recuperat el poder de compra`;
$('#ddLede').textContent=`El gràfic mostra quant per sota del seu màxim anterior estava el preu real de l’or cada any. El ${ddMin[0]}, una unça comprava un ${pct(-ddMin[1],0)} menys que el 1980. L’or protegeix de la inflació a molt llarg termini, però pot passar una generació sencera perdent.`;
function drawDd(shown){
  const svg=d3.select('#dd'); const [W,H]=sizeOf(svg,697,.42,220,320); const t=14,b=24;
  const x=d3.scaleLinear().domain([1971,UY]).range([0,W]); const y=d3.scaleLinear().domain([-1,0]).range([H-b,t]);
  yGrid(svg,y,0,W,[0,-.25,-.5,-.75],v=>v?'−'+fmt(-v*100)+'%':'màxim');
  xAxis(svg,x,H-b,W<500?[1980,2000,2020]:[1975,1985,1995,2005,2015,2025]);
  const a=svg.append('path').attr('d',d3.area().x(d=>x(d[0])).y0(y(0)).y1(d=>y(d[1])).curve(d3.curveMonotoneX)(DD)).attr('fill',MUTED).attr('opacity',.55);
  const l=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(d[1])).curve(d3.curveMonotoneX)(DD)).attr('stroke',INK).attr('stroke-width',1.6);
  const clip=svg.append('clipPath').attr('id','ddc').append('rect').attr('height',H).attr('width',shown.dd?W:0); a.attr('clip-path','url(#ddc)'); l.attr('clip-path','url(#ddc)');
  svg.node()._rv=()=>clip.transition().duration(RM?0:1800).ease(d3.easeCubicInOut).attr('width',W);
  svg.append('text').attr('class','lab').attr('x',x(ddMin[0])).attr('y',y(ddMin[1])+16).attr('text-anchor','middle').text(ddMin[0]+': −'+fmt(-ddMin[1]*100)+'%');
  const dot=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span> Mitjanes anuals, en dòlars descomptant la inflació dels EUA.';
  crosshair(svg,x,t,H-b,xv=>{ const d=nearest(DD,xv); dot.style('display',null).attr('cx',x(d[0])).attr('cy',y(d[1]));
    $('#rDd').innerHTML=`<b>${d[0]}</b>: `+(d[1]>-.005?'l’or és al seu màxim real fins aleshores.':`${pct(-d[1],0)} per sota del màxim anterior.`); return d[0]; },
    ()=>{ dot.style('display','none'); $('#rDd').innerHTML=R0; });
  $('#rDd').innerHTML=R0;
}

/* ---------- tancament ---------- */
$('#close1').textContent=`Entre el 2000 i el ${YL}, els diners de la zona euro s’han multiplicat per ${fmt(MON.eu.end[2],1)} i l’or en euros per ${fmt(MON.eu.end[1],1)}. Una part de la pujada té sentit: quan es creen diners, l’or, que no es pot imprimir, en reflecteix la pèrdua de valor a llarg termini. Però una part és el moment: el 2000 l’or era a prop del mínim real de les últimes dècades, i avui és al màxim de la història. Si l’or hagués crescut exactament com els diners de la zona euro, una unça valdria uns ${fmt(Math.round(MON.eu.fair/10)*10)} €, no ${fmt(gE(YL))} €.`;

Comu.boot([drawDual,drawBox,drawSalOz,drawFlat,drawReal,drawMon,drawHeat,drawDd],
  [['dual'],['box'],['salOz'],['real'],['mon'],['heat',.2],['dd']],
  ()=>{ Comu.onView($('#flat'),()=>setTimeout(playFlat,RM?0:300),.4); paintFlat(); });
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
