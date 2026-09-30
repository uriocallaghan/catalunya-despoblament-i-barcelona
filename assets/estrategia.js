fetch("../data/diners.json").then(r=>r.json()).then(function(D){
"use strict";
const {RM,$,$$,fmt,pct,C,cap,kParse,OZ,sizeOf,pw,drawOn,crosshair,yGrid,xAxis,nearest,endLabels,seg,CLEARS}=Comu;
const S=Comu.series(D), {R,RED,INK,MUTED,LINE,LAND}=C;
const YL=+D.sal[D.sal.length-1][0];
const ipcY=S.yAvg(S.ipc), gE=S.yAvg(S.goldEur);
const price=y=>S.habY(y,2), sal=y=>S.salY.get(y).ct;
const rentY=new Map(D.rent.map(r=>[r[0],r[1]]));
const cagr=(a,b,n)=>Math.pow(b/a,1/n)-1;
// Ritmes dels últims deu anys, que fem servir com a hipòtesi de futur
const Y10=YL-10;
const INF=cagr(ipcY(Y10),ipcY(YL),10), HAB=cagr(price(Y10),price(YL),10), SALG=cagr(sal(Y10),sal(YL),10), RENTG=cagr(rentY.get(Y10),rentY.get(YL),10);
const k1=v=>v>=1e6?fmt(v/1e6,1)+' M':fmt(Math.round(v/1000))+'.000';
const eur=v=>Math.abs(v)>=10000?k1(v)+' €':fmt(Math.round(v))+' €';
$('#upd').textContent=`Dades fins al ${YL}`;

/* ---------- el teu ingrés ---------- */
let NET=2000, SAV=50000, RET=.05;
const RR=()=>(1+RET)/(1+INF)-1;   // rendiment real dels estalvis
const parseAmt=s=>{ const v=parseFloat(String(s).replace(/\./g,'').replace(',','.')); return isFinite(v)&&v>0?v:0; };
const redraw=[];
$('#net').addEventListener('input',()=>{ const v=parseAmt($('#net').value); if(v>=300&&v<=50000){ NET=v; redraw.forEach(f=>f()); } });
$('#net').addEventListener('change',()=>{ $('#net').value=fmt(NET); });
$('#sav').addEventListener('input',()=>{ const t=$('#sav').value.trim(), v=t==='0'?0:parseAmt(t); if(t==='0'||(v>0&&v<=1e8)){ SAV=v; redraw.forEach(f=>f()); } });
$('#sav').addEventListener('change',()=>{ $('#sav').value=fmt(SAV); });
$('#ret').addEventListener('input',e=>{ RET=+e.target.value/100; $('#retV').textContent=fmt(RET*100,1).replace(',0','')+'%'; $('[data-sg="mine"]').textContent=`el meu ${$('#retV').textContent}`; redraw.forEach(f=>f()); });

/* =========== 1. EL TEU SOU EN ALTRES UNITATS =========== */
// El mateix poder de compra (descomptant l'IPC) l'any 2000 i avui
function units(){
  const N=NET*12, then=N*ipcY(2000)/ipcY(YL), R0=D.rent[0][0], thenR=N*ipcY(R0)/ipcY(YL);
  return [
    {n:'metres quadrats de pis',s:'a l’any, sense gastar res',a:then/price(2000),b:N/price(YL),y0:2000,d:1},
    {n:'grams d’or',s:'a l’any',a:then/(gE(2000)/OZ),b:N/(gE(YL)/OZ),y0:2000,d:0},
    {n:'mesos de lloguer',s:'mitjà a Barcelona, amb un any d’ingressos',a:thenR/rentY.get(R0),b:N/rentY.get(YL),y0:R0,d:1},
    {n:'anys de cistella de la compra',s:'la referència: els preus de consum',a:1,b:1,y0:2000,d:1,ipc:true},
  ];
}
function drawUnits(){
  const U=units(), box=$('#units'); box.innerHTML='';
  U.forEach(u=>{ const m=Math.max(u.a,u.b), el=document.createElement('div'); el.className='u';
    el.innerHTML=`<div class="uh"><b>${u.ipc?'=':fmt(u.b,u.d)}</b> ${u.n}</div><div class="us">${u.s}</div>
      <div class="ub"><span style="width:${100*u.a/m}%;background:${LAND}"></span><em>${u.y0}: ${u.ipc?'igual':fmt(u.a,u.d)}</em></div>
      <div class="ub"><span style="width:${100*u.b/m}%;background:${u.ipc?MUTED:RED}"></span><em>${YL}: ${u.ipc?'igual':fmt(u.b,u.d)}</em></div>`;
    box.appendChild(el); });
  const m2=U[0];
  $('#h1').textContent=`Amb ${fmt(NET)} € nets al mes, el 2000 hauries pogut comprar ${fmt(m2.a,1)} m² de pis l’any. Avui, ${fmt(m2.b,1)}.`;
  $('#lead').textContent=`És el mateix poder de compra: ${fmt(NET)} € d’avui equivalen a ${fmt(NET*ipcY(2000)/ipcY(YL))} € del 2000, perquè els preus s’han multiplicat per ${fmt(ipcY(YL)/ipcY(2000),2)}. Per a la compra del dia a dia no has perdut res. Però en metres de pis has perdut un ${pct(1-m2.b/m2.a,0)} i en or, un ${pct(1-U[1].b/U[1].a,0)}: els actius s’han allunyat del que guanyes. Aquesta pàgina no et dirà com fer-te ric de pressa: et donarà números per decidir. Canvia la xifra i tots els gràfics s’adapten a tu.`;
}
redraw.push(drawUnits);

/* =========== 2. APUJAR PREUS =========== */
let fy=2019;
function drawFreeze(shown){
  const svg=d3.select('#freeze'); const [W,H]=sizeOf(svg,697,.45,230,320); const t=18,b=24;
  const pts=d3.range(fy,YL+1).map(y=>[y,NET*ipcY(fy)/ipcY(y)]);
  const x=d3.scaleLinear().domain([2010,YL]).range([0,W-8]); const y=d3.scaleLinear().domain([0,NET*1.1]).range([H-b,t]);
  const tk=[0,.25,.5,.75,1].map(f=>f*NET);
  yGrid(svg,y,0,W,tk,v=>fmt(Math.round(v))+(v===NET?' €':''));
  xAxis(svg,x,H-b,W<500?[2010,2015,2020,2025]:d3.range(2010,YL+1,2));
  const ar=svg.append('path').attr('d',d3.area().x(d=>x(d[0])).y0(y(NET)).y1(d=>y(d[1]))(pts)).attr('fill',R[1]);
  svg.append('line').attr('x1',x(fy)).attr('x2',x(YL)).attr('y1',y(NET)).attr('y2',y(NET)).attr('stroke',MUTED).attr('stroke-dasharray','3 3');
  const ln=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(pts)).attr('stroke',RED).attr('stroke-width',2.6);
  const e=pts[pts.length-1];
  svg.append('text').attr('class','lab').attr('x',x(YL)).attr('y',y(e[1])+16).attr('text-anchor','end').text(fmt(Math.round(e[1]))+' € reals');
  if(!shown.freeze){ ln.attr('opacity',0); ar.attr('opacity',0); svg.node()._rv=()=>{ ln.attr('opacity',1); drawOn(ln,1200); ar.transition().delay(RM?0:900).duration(500).attr('opacity',1); }; }
  const loss=1-e[1]/NET, need=NET*ipcY(YL)/ipcY(fy);
  $('#rFreeze').innerHTML=`Si cobres el mateix que el <b>${fy}</b>, t’has baixat el sou un <b>${pct(loss,0)}</b> sense que ningú t’ho digui: perds ${fmt(Math.round(NET-e[1]))} € al mes de poder de compra. Per estar igual hauries de cobrar ${fmt(Math.round(need))} €.`;
}
$('#fY').addEventListener('input',e=>{ fy=+e.target.value; $('#fYr').textContent=fy; drawFreeze({freeze:true}); });
$('#fY').max=YL-1; $('#fYr').textContent=fy;
$('#freezeLede').textContent=`Un autònom no té conveni que li apugi el sou. Si no apuges les tarifes, la inflació te’l baixa cada any. Als últims deu anys, els preus a Catalunya han pujat de mitjana un ${fmt(INF*100,1)}% l’any. Tria des de quan no has tocat els preus.`;
redraw.push(()=>drawFreeze({freeze:true}));

/* =========== 2b. EL TEU COIXÍ =========== */
function drawCush(shown){
  const svg=d3.select('#cush'); const [W,H]=sizeOf(svg,697,.5,250,360); const t=18,b=24,rp=W<500?100:150;
  const pts=d3.range(0,11).map(i=>[YL+i,SAV*Math.pow(1+RR(),i),SAV/Math.pow(1+INF,i)]);
  const x=d3.scaleLinear().domain([YL,YL+10]).range([0,W-rp]); const ymax=Math.max(1,d3.max(pts,p=>Math.max(p[1],p[2])));
  const step=ymax>150000?50000:ymax>60000?20000:ymax>20000?10000:5000; const y=d3.scaleLinear().domain([0,Math.ceil(ymax/step)*step]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,y.domain()[1]+1,step),v=>v?k1(v)+(v===y.domain()[1]?' €':''):'0');
  xAxis(svg,x,H-b,d3.range(YL,YL+11,W<500?5:2));
  const ar=svg.append('path').attr('d',d3.area().x(p=>x(p[0])).y0(p=>y(p[2])).y1(p=>y(p[1]))(pts)).attr('fill',R[0]);
  const ln=k=>d3.line().x(p=>x(p[0])).y(p=>y(p[k]));
  const p2=svg.append('path').attr('class','line').attr('d',ln(2)(pts)).attr('stroke',MUTED).attr('stroke-dasharray','4 3');
  const p1=svg.append('path').attr('class','line').attr('d',ln(1)(pts)).attr('stroke',RED).attr('stroke-width',2.8);
  const e=pts[10], rl=$('#retV').textContent;
  const L=endLabels(svg,[{y:y(e[1]),c:RED,n:W<500?'al '+rl:`invertits al ${rl}`,v:k1(e[1])},{y:y(e[2]),c:MUTED,n:W<500?'compte':'al compte (0%)',v:k1(e[2])}],W-rp+8,15,shown.cush);
  if(!shown.cush){ [p1,p2,ar].forEach(p=>p.attr('opacity',0)); svg.node()._rv=()=>{ p1.attr('opacity',1); p2.attr('opacity',1); drawOn(p1,1400); drawOn(p2,1400,150); ar.transition().delay(RM?0:1300).duration(600).attr('opacity',1); L.forEach(l=>l.transition().delay(RM?0:1500).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',MUTED).style('display','none');
  const int1=SAV*RET, runway=NET?SAV/NET:0;
  const R0=`El primer any, el ${rl} de ${eur(SAV)} són <b>${eur(int1)}</b> d’interessos: ${fmt(int1/NET,1)} mesos del teu sou. I si un dia deixes de facturar, aquests estalvis et donen <b>${fmt(runway,0)} mesos</b> de marge per viure. <span class="m">Toca el gràfic.</span>`;
  crosshair(svg,x,t,H-b,xv=>{ const p=nearest(pts,xv); d1.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1])); d2.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[2]));
    $('#rCush').innerHTML=`<b>${p[0]}</b>, en euros d’avui: invertits, <b>${eur(p[1])}</b>; al compte, ${eur(p[2])}. <span class="m">Diferència: ${eur(p[1]-p[2])}.</span>`; return p[0]; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rCush').innerHTML=R0; });
  $('#rCush').innerHTML=R0;
  $('#cushTitle').textContent=SAV?`Els teus ${eur(SAV)} valen, sobretot, ${fmt(runway,0)} mesos de llibertat`:'Sense estalvis, cada mes sense facturar és un problema';
  $('#cushLede').textContent=SAV?`Un ${rl} l’any sembla molt, però la inflació se n’emporta una part: als últims deu anys ha estat del ${fmt(INF*100,1)}% de mitjana, i per tant guanyes de veritat un ${fmt(RR()*100,1)}% real. D’aquí a deu anys, en euros d’avui, tindries ${eur(e[1])}; al compte corrent, ${eur(e[2])}. Però el valor més gran d’aquests diners no és el que rendeixen: és el temps que et compren per apostar sense por. Un ${rl} continuat només s’aconsegueix amb inversió que té anys dolents (borsa, fons diversificats): la part que puguis necessitar aviat, millor tenir-la a part i segura.`:'';
}
redraw.push(()=>drawCush({cush:true}));

/* =========== 3. LA CURSA DE L'ENTRADA =========== */
let sRate=.2, m2=70, hMode='hab', sMode='mine';
const HMODES={hab:{g:HAB,n:`com els últims deu anys (+${fmt(HAB*100,1)}% l’any)`},ipc:{g:INF,n:`com la inflació (+${fmt(INF*100,1)}% l’any)`},flat:{g:0,n:'congelats'}};
const SMODES={cash:{r:()=>0},inf:{r:()=>INF},mine:{r:()=>RET}};
const RACE_Y=15;
function race(){
  const g=HMODES[hMode].g, r=SMODES[sMode].r(), mo=RACE_Y*12;
  let sv=SAV; const pts=[[YL,sv,.3*price(YL)*m2]];
  let hit=sv>=pts[0][2]?{t:YL,v:pts[0][2]}:null;
  for(let i=1;i<=mo;i++){ const t=i/12; sv=sv*Math.pow(1+r,1/12)+sRate*NET*Math.pow(1+SALG,Math.floor(t));
    const target=.3*price(YL)*m2*Math.pow(1+g,t); if(i%3===0) pts.push([YL+t,sv,target]); if(hit==null&&sv>=target) hit={t:YL+t,v:target}; }
  return {pts,hit};
}
function drawRace(shown){
  const svg=d3.select('#race'); const [W,H]=sizeOf(svg,697,.56,280,400); const t=18,b=24,rp=W<500?108:120;
  const {pts,hit}=race();
  const x=d3.scaleLinear().domain([YL,YL+RACE_Y]).range([0,W-rp]); const ymax=d3.max(pts,p=>Math.max(p[1],p[2]));
  const step=ymax>200000?50000:ymax>100000?25000:10000; const y=d3.scaleLinear().domain([0,Math.ceil(ymax/step)*step]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,y.domain()[1]+1,step*(W<500?2:1)),v=>v?k1(v)+(v===y.domain()[1]||v+step*(W<500?2:1)>y.domain()[1]?' €':''):'0');
  xAxis(svg,x,H-b,d3.range(YL,YL+RACE_Y+1,W<500?5:3));
  const ln=k=>d3.line().x(p=>x(p[0])).y(p=>y(p[k]));
  const pT=svg.append('path').attr('class','line').attr('d',ln(2)(pts)).attr('stroke',INK).attr('stroke-dasharray','5 3');
  const pS=svg.append('path').attr('class','line').attr('d',ln(1)(pts)).attr('stroke',RED).attr('stroke-width',2.8);
  const e=pts[pts.length-1];
  const L=endLabels(svg,[{y:y(e[1]),c:RED,n:'estalvi',v:k1(e[1])},{y:y(e[2]),c:INK,n:'entrada',v:k1(e[2])}],W-rp+8,15,true);
  if(hit){ svg.append('circle').attr('cx',x(hit.t)).attr('cy',y(hit.v)).attr('r',6).attr('fill',RED).attr('stroke','#fff').attr('stroke-width',2);
    svg.append('text').attr('class','lab').attr('x',x(hit.t)).attr('y',y(hit.v)-12).attr('text-anchor','middle').text(Math.floor(hit.t)); }
  if(!shown.race){ [pT,pS].forEach(p=>p.attr('opacity',0)); L.forEach(l=>l.attr('opacity',0)); svg.node()._rv=()=>{ pT.attr('opacity',1); pS.attr('opacity',1); drawOn(pT,1500); drawOn(pS,1500,200); L.forEach(l=>l.transition().delay(RM?0:1600).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const yrs=hit?hit.t-YL:null;
  const st0=SAV?`Partint de ${eur(SAV)} i estalviant`:'Estalviant';
  const R0=hit&&yrs===0?`Els teus ${eur(SAV)} ja cobreixen l’entrada d’un pis de ${m2} m² (${eur(pts[0][2])}). La pregunta aleshores és la hipoteca: la quota ha de cabre en el que guanyes. <span class="m">Toca el gràfic.</span>`:hit?`${st0} ${fmt(Math.round(sRate*NET))} € al mes, arribes a l’entrada d’un pis de ${m2} m² <b>d’aquí a ${fmt(yrs,1)} anys</b>, el ${Math.floor(hit.t)}. <span class="m">Toca el gràfic.</span>`:`${st0} ${fmt(Math.round(sRate*NET))} € al mes, <b>en ${RACE_Y} anys no atrapes l’entrada</b>: el preu corre més que el teu estalvi. <span class="m">Toca el gràfic.</span>`;
  crosshair(svg,x,t,H-b,xv=>{ const p=nearest(pts,xv); d1.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1])); d2.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[2]));
    $('#rRace').innerHTML=`<b>${Math.floor(p[0])}</b>: tens ${eur(p[1])}; l’entrada val ${eur(p[2])}. <span class="m">${p[1]>=p[2]?'Ja hi ets.':`Et falten ${eur(p[2]-p[1])}.`}</span>`; return p[0]; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rRace').innerHTML=R0; });
  $('#rRace').innerHTML=R0;
  $('#raceTitle').textContent=hit&&yrs===0?`Ja tens l’entrada d’un pis. El que falta és el sou per a la hipoteca`:hit?`${SAV?`Amb ${eur(SAV)} estalviats i`:'Si'} ${SAV?'estalviant':'estalvies'} el ${pct(sRate,0)}, l’entrada d’un pis arriba el ${Math.floor(hit.t)}`:`Estalviant el ${pct(sRate,0)}, l’entrada d’un pis s’escapa`;
}
$('#raceLede').textContent=`L’entrada és el 30% del preu: el 20% que el banc no finança i un 10% d’impostos i despeses. Els preus són el valor taxat a la província de Barcelona; a la ciutat són més alts. Partim dels estalvis que has escrit a dalt. El que estalvies cada mes creix com ho han fet els sous (+${fmt(SALG*100,1)}% l’any als últims deu anys). Juga amb les tres variables: quant estalvies, on el guardes i què fan els pisos.`;
seg('sr',v=>{ sRate=+v; drawRace({race:true}); drawLev({lev:true}); drawLives({lives:true}); });
seg('m2',v=>{ m2=+v; drawRace({race:true}); });
seg('hg',v=>{ hMode=v; drawRace({race:true}); });
seg('sg',v=>{ sMode=v; drawRace({race:true}); });
redraw.push(()=>drawRace({race:true}));

/* =========== 4. PALANQUES =========== */
// Patrimoni real d'aquí a deu anys (euros d'avui): estalvi anual que creix amb l'ingrés real i rendeix r real
const wealth=({inc=NET*12,s=sRate,gi=0,r=RR(),extra=0,from=0})=>{ let w=SAV; for(let t=1;t<=10;t++){ const i=inc*Math.pow(1+gi,t-1)+(t>from?extra*12:0); w=w*(1+r)+i*s; } return w; };
function drawLev(shown){
  const svg=d3.select('#lev'); const W=pw(svg,697);
  const base=wealth({});
  const L=[
    {n:'Aconseguir un punt més de rendiment',d:wealth({r:RR()+.01})-base},
    {n:'Estalviar 5 punts més del que guanyes',d:wealth({s:sRate+.05})-base},
    {n:'Guanyar un 25% més des de l’any que ve',d:wealth({inc:NET*12*1.25})-base},
    {n:'Que els ingressos creixin un 5% real cada any',d:wealth({gi:.05})-base},
    {n:'Un producte propi que et deixa 500 € nets al mes des del tercer any',d:wealth({extra:500,from:2})-base},
    {n:'Un producte propi que et deixa tot un sou des del cinquè any',d:wealth({extra:NET,from:4})-base},
  ].sort((a,b)=>b.d-a.d);
  const rh=W<500?54:44, lw=W<500?0:260, H=L.length*rh+10;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([0,d3.max(L,d=>d.d)]).range([lw,W-70]);
  L.forEach((d,i)=>{ const y0=i*rh+(W<500?18:10);
    svg.append('text').attr('class','ax').attr('x',W<500?0:lw-10).attr('y',W<500?y0-5:y0+11).attr('text-anchor',W<500?'start':'end').style('font-size',W<500?'11.5px':'12.5px').style('fill',INK).text(d.n);
    const r=svg.append('rect').attr('x',x(0)).attr('y',y0+(W<500?0:2)).attr('height',16).attr('rx',2).attr('fill',i===0?RED:R[2]).attr('width',shown.lev?x(d.d)-x(0):0);
    r.datum(d); const tx=svg.append('text').attr('class','lab').attr('x',x(d.d)+6).attr('y',y0+(W<500?13:15)).text('+'+eur(d.d)).attr('opacity',shown.lev?1:0);
    (svg.node()._q||(svg.node()._q=[])).push(()=>{ r.transition().delay(RM?0:i*120).duration(700).ease(d3.easeCubicOut).attr('width',x(d.d)-x(0)); tx.transition().delay(RM?0:500+i*120).attr('opacity',1); }); });
  svg.node()._rv=()=>(svg.node()._q||[]).forEach(f=>f());
  const r1=L.find(d=>d.n.startsWith('Aconseguir')), iBest=L.find(d=>d.n.startsWith('Guanyar un 25%'));
  $('#levTitle').textContent= iBest.d>r1.d ? `Guanyar un 25% més pesa ${fmt(iBest.d/r1.d,1)} vegades més que un punt més de rendiment` : `Amb el teu capital, un punt més de rendiment ja pesa tant com cobrar un 25% més`;
  $('#levLede').textContent=`Partint de ${eur(SAV)} al ${$('#retV').textContent} (un ${fmt(RR()*100,1)}% real) i estalviant el ${pct(sRate,0)} de ${fmt(NET)} € al mes, d’aquí a deu anys tindries uns ${eur(base)} d’avui. Cada barra és el que afegeix una sola millora. Com més capital tens, més pesa el rendiment; però a la teva escala, l’ingrés encara és la palanca gran, i el rendiment et ve sol si no toques els diners.`;
}
redraw.push(()=>drawLev({lev:true}));

/* =========== 5. CLIENTS O HORES =========== */
let keep=.6, rateH=40;
const PRICES=[{p:4,n:'App de consum',s:'4 € al mes'},{p:15,n:'Eina per a professionals',s:'15 € al mes'},{p:49,n:'Eina de nínxol per a empreses',s:'49 € al mes'},{p:250,n:'Servei productitzat',s:'250 € al mes'},{p:1500,n:'Client de disseny recurrent',s:'1.500 € al mes'}];
function drawDots(shown){
  const svg=d3.select('#dots'); const W=pw(svg,697); const target=NET;
  const rows=PRICES.map(o=>({...o,n0:Math.ceil(target/keep/o.p)}));
  const per=rows[0].n0>600?10:1, s=W<500?7:8, cols=Math.floor((W)/(s+2)), lh=40;
  let yy=0; const layout=rows.map(r=>{ const dots=Math.ceil(r.n0/per), h=Math.ceil(dots/cols)*(s+2); const o={...r,dots,y:yy+lh}; yy+=lh+h+18; return o; });
  const H=yy; svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  layout.forEach((r,j)=>{ svg.append('text').attr('x',0).attr('y',r.y-22).style('font-size','14px').style('font-weight',600).style('fill',INK).text(`${fmt(r.n0)} clients`);
    svg.append('text').attr('class','ax').attr('x',0).attr('y',r.y-7).style('font-size','12px').text(`${r.n} · ${r.s}`);
    const g=svg.append('g').selectAll('rect').data(d3.range(r.dots)).join('rect').attr('x',i=>(i%cols)*(s+2)).attr('y',i=>r.y+Math.floor(i/cols)*(s+2)).attr('width',s).attr('height',s).attr('rx',1.5).attr('fill',j<2?R[3]:RED).attr('opacity',shown.dots?1:0);
    (svg.node()._q||(svg.node()._q=[])).push(()=>g.transition().delay(i=>RM?0:j*200+i*3).duration(200).attr('opacity',1)); });
  svg.node()._rv=()=>(svg.node()._q||[]).forEach(f=>f());
  $('#dotsKey').textContent=per>1?`Cada quadrat són ${per} clients.`:'Cada quadrat és un client.';
  const hrs=target/keep/rateH;
  $('#rDots').innerHTML=`Per tenir ${fmt(target)} € nets al mes cobrant per hores a ${fmt(rateH)} €/h, has de facturar <b>${fmt(Math.round(hrs))} hores al mes</b>${hrs>120?', més del que un autònom pot facturar de manera sostinguda (un cop descomptats la feina comercial, l’administració i les vacances)':''}. Amb un producte, el sostre no són les hores, sinó els clients.`;
}
$('#dotsLede').textContent=`Quants clients necessites perquè un producte et pagui el sou? Depèn gairebé només del preu. Una app de consum barata necessita milers d’usuaris que paguin, i competeix amb tothom que pot fer la mateixa app en un cap de setmana. Una eina que resol un problema car a un nínxol professional en necessita unes desenes. Quan fer apps es torna una commodity, el que no és commodity és saber quin problema resoldre, per a qui, i arribar-hi.`;
$('#keep').addEventListener('input',e=>{ keep=+e.target.value/100; $('#keepV').textContent=pct(keep,0); drawDots({dots:true}); });
$('#rateH').addEventListener('input',e=>{ rateH=+e.target.value; $('#rateHV').textContent=fmt(rateH)+' €/h'; drawDots({dots:true}); });
redraw.push(()=>drawDots({dots:true}));

/* =========== 6. QUÈ HA PUJAT MÉS QUE EL SOU =========== */
const B=D.rent[0][0];
const m3Y=S.yAvg(k=>S.m3.get(k));
const RANK=[
  {n:'Or',v:gE(YL)/gE(B)},
  {n:'Diners en circulació (M3)',v:m3Y(YL)/m3Y(B)},
  {n:'Lloguer a Barcelona',v:rentY.get(YL)/rentY.get(B)},
  {n:'Preus de consum',v:ipcY(YL)/ipcY(B)},
  {n:'Sou mitjà',v:sal(YL)/sal(B),hot:true},
  {n:'Preu de compra d’un pis',v:price(YL)/price(B)},
].sort((a,b)=>b.v-a.v);
$('#rankTitle').textContent=`Des del ${B}, el sou ha pujat menys que gairebé tot`;
$('#rankLede').textContent=`El ${B} era el cim de la bombolla immobiliària, i per això el preu de compra dels pisos surt per sota. Però el lloguer, els diners en circulació i l’or han anat per davant dels sous. La lliçó per a algú que treballa pel seu compte: el que cobres per hora de feina és el que pitjor s’ha revaloritzat. Tot el que és propietat (un producte, una participació, una audiència, un actiu) juga a l’altre costat.`;
function drawRank(shown){
  const svg=d3.select('#rank'); const W=pw(svg,697), rh=36, lw=W<500?130:200, H=RANK.length*rh+24;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  const x=d3.scaleLog().domain([.8,d3.max(RANK,d=>d.v)*1.15]).range([lw,W-60]);
  svg.append('line').attr('x1',x(1)).attr('x2',x(1)).attr('y1',0).attr('y2',H-20).attr('stroke',MUTED).attr('stroke-dasharray','2 3');
  svg.append('text').attr('class','ax').attr('x',x(1)).attr('y',H-4).attr('text-anchor','middle').text(`${B} = igual`);
  RANK.forEach((d,i)=>{ const y0=i*rh+rh/2; const hot=d.hot;
    svg.append('text').attr('class','ax').attr('x',lw-12).attr('y',y0).attr('dy','.35em').attr('text-anchor','end').style('font-size','12.5px').style('fill',hot?RED:INK).style('font-weight',hot?600:null).text(d.n);
    svg.append('line').attr('x1',x(1)).attr('x2',x(d.v)).attr('y1',y0).attr('y2',y0).attr('stroke',hot?RED:R[2]).attr('stroke-width',2);
    const c=svg.append('circle').attr('cy',y0).attr('r',hot?7:5.5).attr('fill',hot?RED:R[4]).attr('cx',shown.rank?x(d.v):x(1));
    const tx=svg.append('text').attr('class','lab').attr('x',x(d.v)+(d.v>=1?11:-11)).attr('text-anchor',d.v>=1?'start':'end').attr('y',y0).attr('dy','.35em').text('×'+fmt(d.v,2)).attr('opacity',shown.rank?1:0);
    (svg.node()._q||(svg.node()._q=[])).push(()=>{ c.transition().delay(RM?0:i*120).duration(900).ease(d3.easeCubicOut).attr('cx',x(d.v)); tx.transition().delay(RM?0:700+i*120).attr('opacity',1); }); });
  svg.node()._rv=()=>(svg.node()._q||[]).forEach(f=>f());
}

/* =========== 7. MIL VIDES POSSIBLES =========== */
// Model de joc: cada any dediques una part del temps a apostes de producte. Cada aposta té una probabilitat p
// de convertir-se en un producte que et deixa M € nets al mes la resta de la dècada. El temps que no hi dediques, factures serveis.
let pWin=.1, share=.3;
const STRATS=[{k:0,n:'Només serveis'},{k:.3,n:'70% serveis, 30% producte'},{k:1,n:'Tot a producte'}];
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const LIVES=400;
function simulate(sh){
  const rnd=rng(12345), M=NET, out=[];
  let quit=0;
  for(let l=0;l<LIVES;l++){ let tot=0, prod=0, acc=0, cush=SAV, s2=sh, q=false; const sv=.85+.3*rnd();   // cada vida factura una mica més o menys
    for(let yr=1;yr<=10;yr++){ const sh=s2; acc+=sh*2; while(acc>=1){ acc-=1; const u=rnd(), m=Math.exp(Math.log(.3)+rnd()*Math.log(2/.3)); if(u<pWin) prod+=M*m; }   // dues apostes l'any a temps complet; l'èxit paga entre 0,3 i 2 sous
      const inc=12*(NET*sv*(1-sh)+prod); tot+=inc;
      // Gastes el que gastes ara (el que no estalvies); si el coixí s'esgota, tornes a fer només serveis
      cush+=inc-12*NET*(1-sRate); if(cush<0&&s2>0){ s2=0; q=true; } }
    if(q) quit++; out.push(tot); }
  out.sort((a,b)=>a-b); out.quit=quit/LIVES; return out;
}
function drawLives(shown){
  const svg=d3.select('#lives'); const W=pw(svg,697), bandH=W<500?130:120, t=10, H=t+STRATS.length*bandH+26;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  const base=NET*120, sims=STRATS.map(s=>simulate(s.k));
  const xmax=d3.max(sims,a=>a[a.length-1]);
  const x=d3.scaleSymlog().constant(base/4).domain([0,xmax*1.05]).range([6,W-6]);
  const ticks=[0,base/2,base,base*2,base*4,base*8].filter(v=>W>=500||v!==base/2).filter(v=>v<=xmax*1.05);
  ticks.forEach(v=>{ svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',t).attr('y2',H-22).attr('stroke',v===base?MUTED:LINE).attr('stroke-dasharray',v===base?'3 3':null);
    svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',H-6).attr('text-anchor',v===0?'start':'middle').text(v===0?'0 €':v===base?(W<500?'ara':'ara: '+eur(v)):eur(v)); });
  const stats=[];
  STRATS.forEach((s,j)=>{ const a=sims[j], y0=t+j*bandH, cy=y0+bandH/2+18;
    const med=a[Math.floor(a.length/2)], below=a.filter(v=>v<base).length/a.length, top=a[Math.floor(a.length*.9)], zero=a.filter(v=>v<base*.25).length/a.length;
    stats.push({s,med,below,top,zero,quit:a.quit});
    svg.append('text').attr('x',0).attr('y',y0+14).style('font-size','13px').style('font-weight',600).style('fill',s.k===share?RED:INK).text(s.n);
    svg.append('text').attr('class','ax').attr('x',0).attr('y',y0+29).text(`la meitat, més de ${eur(med)}`);
    // Eixam: cada punt és una vida; s'apilen verticalment dins la franja
    const bins=new Map(), bw=4; const pts=a.map(v=>{ const bx=Math.round(x(v)/bw); const n=bins.get(bx)||0; bins.set(bx,n+1); return {v,px:bx*bw,n}; });
    const maxN=d3.max([...bins.values()]), sp=Math.min(4.2,(bandH-34)/maxN);
    const c=svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx',d=>d.px).attr('cy',d=>cy+((d.n%2?1:-1)*Math.ceil(d.n/2))*sp).attr('r',1.9)
      .attr('fill',d=>d.v<base?MUTED:s.k===share?RED:R[3]).attr('opacity',shown.lives?1:0);
    (svg.node()._q||(svg.node()._q=[])).push(()=>c.transition().delay((d,i)=>RM?0:j*300+i*2).duration(250).attr('opacity',1));
  });
  svg.node()._rv=()=>(svg.node()._q||[]).forEach(f=>f());
  const st=stats.find(o=>o.s.k===share)||stats[1], all=stats[2], srv=stats[0];
  $('#rLives').innerHTML=`<b>${st.s.n}</b>: en la meitat de les vides guanyes més de ${eur(st.med)} en deu anys; el 10% més afortunat, més de ${eur(st.top)}. En un ${pct(st.below,0)} de les vides acabes per sota del que guanyaries només amb serveis.`+(st.quit?` <span class="m">En un ${pct(st.quit,0)} de les vides, el coixí de ${eur(SAV)} s’acaba abans que arribi l’èxit i has de tornar a fer només serveis.</span>`:'');
}
$('#pWin').addEventListener('input',e=>{ pWin=+e.target.value/100; $('#pWinV').textContent=pct(pWin,0); drawLives({lives:true}); });
seg('sh',v=>{ share=+v; drawLives({lives:true}); });
redraw.push(()=>drawLives({lives:true}));

/* ---------- tancament ---------- */
function closing(){
  const U=units();
  $('#close1').textContent=`Amb ${fmt(NET)} € nets al mes, avui compres ${fmt(U[0].b,1)} m² de pis l’any; qui cobrava el mateix el 2000 en comprava ${fmt(U[0].a,1)}. No és culpa teva ni ho arreglaràs estalviant més: els actius s’han allunyat dels sous. L’única manera de tornar-hi a acostar-se és tenir una part del que guanyes en forma de propietat.`;
  const ent50=.3*price(YL)*50;
  $('#close2').textContent=SAV?`Els teus ${eur(SAV)} canvien el problema: ${SAV>=ent50?'ja tens l’entrada d’un pis petit':`tens ${pct(SAV/ent50,0)} de l’entrada d’un pis petit`} i ${fmt(SAV/NET,0)} mesos de marge. No els gastis per anar més de pressa ni els apostis tots en un sol producte: la seva feina és comprar-te temps per a les apostes i créixer tranquil·lament mentre tu augmentes l’ingrés.`:'';
}
redraw.push(closing);

Comu.boot([drawUnits,drawFreeze,drawCush,drawRace,drawLev,drawDots,drawRank,drawLives,closing],[['freeze'],['cush'],['race'],['lev'],['dots',.15],['rank'],['lives',.2]]);
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
