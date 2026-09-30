fetch("../data/diners.json").then(r=>r.json()).then(function(D){
"use strict";
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s=>document.querySelector(s), $$ = s=>Array.from(document.querySelectorAll(s));
function fmt(n,d){ d=d||0; let s=Math.abs(n).toFixed(d).split('.'); s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (n<0?'−':'')+s[0]+(s[1]?','+s[1]:''); }
function pct(x,d){ if(d===undefined) d = x*100<1?2:1; return fmt(x*100,d)+'%'; }
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const R=[0,1,2,3,4,5,6,7].map(i=>tok('--r'+i)); const LAND=tok('--land'), BG=tok('--bg'), INK=tok('--ink'), MUTED=tok('--muted'), LINE=tok('--line'), RED=tok('--red');
const MESOS=['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'];
const deMes=m=>(/^[aeiou]/.test(MESOS[m-1])?'d’':'de ')+MESOS[m-1];
const elMes=m=>(/^[aeiou]/.test(MESOS[m-1])?'l’':'el ')+MESOS[m-1];
const PTA=166.386;

/* ---------- sèries mensuals ---------- */
// {from:'1961M01', v:[...]} → funcions per consultar-les per clau 'AAAAMmm'
const kParse=k=>[+k.slice(0,4),+k.slice(5,7)];
const kMake=(y,m)=>`${y}M${String(m).padStart(2,'0')}`;
const kAdd=(k,n)=>{ const [y,m]=kParse(k); const t=y*12+m-1+n; return kMake(Math.floor(t/12),t%12+1); };
const kDiff=(a,b)=>{ const [y1,m1]=kParse(a),[y2,m2]=kParse(b); return (y2*12+m2)-(y1*12+m1); };
const kT=k=>{ const [y,m]=kParse(k); return y+(m-.5)/12; };
const kLabel=k=>{ const [y,m]=kParse(k); return MESOS[m-1]+' '+y; };
function mser(s){ const last=kAdd(s.from,s.v.length-1); return {from:s.from,last,v:s.v,at:k=>{ const i=kDiff(s.from,k); return i>=0&&i<s.v.length?s.v[i]:null; },
  pts:()=>s.v.map((v,i)=>[kT(kAdd(s.from,i)),v,kAdd(s.from,i)])}; }
const ES=mser(D.ipc.es), CT=mser(D.ipc.ct);
// IPC local: Catalunya des del 1978; abans, Espanya enganxada al nivell català del gener de 1978.
const LINK=CT.at('1978M01')/ES.at('1978M01');
const ipc=k=> k>='1978M01' ? CT.at(k) : ES.at(k)*LINK;
const LAST=CT.last;
const ipcYear=y=>{ let s=0,n=0; for(let m=1;m<=12;m++){ const v=ipc(kMake(y,m)); if(v!=null){ s+=v; n++; } } return n===12?s/12:null; };
{ const m=kParse(LAST)[1]; $('#upd').textContent='Dades fins '+(/^[aeiou]/.test(MESOS[m-1])?'a l’':'al ')+MESOS[m-1]+' de '+kParse(LAST)[0]; }

/* ---------- utilitats de gràfics ---------- */
function onView(el, fn, th){
  if(RM || !('IntersectionObserver' in window)){ fn(); return; }
  const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); fn(); } },{threshold:th||.3});
  io.observe(el);
}
// Ressaltat: desapareix en sortir del gràfic amb el ratolí o en tocar fora.
const CLEARS=[];
document.addEventListener('pointerdown',e=>CLEARS.forEach(([n,f])=>{ if(!n.contains(e.target)) f(); }));
// Amplada disponible; si el contenidor encara no té mida (pestanya amagada), la de la finestra.
const pw=(svg,maxW)=>Math.min(svg.node().parentNode.clientWidth||Math.max(280,innerWidth-40),maxW);
function sizeOf(svg,maxW,ratio,minH,maxH){ const W=pw(svg,maxW); const H=Math.round(Math.max(minH,Math.min(maxH,W*ratio))); svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove(); return [W,H]; }
const drawOn=(path,dur,delay)=>{ if(RM) return; const n=path.node(), L=n.getTotalLength(); path.attr('stroke-dasharray',L+' '+L).attr('stroke-dashoffset',L).transition().delay(delay||0).duration(dur||1800).ease(d3.easeCubicInOut).attr('stroke-dashoffset',0).on('end',()=>path.attr('stroke-dasharray',null)); };
// Creu de lectura per a gràfics temporals: crida onMove(x en unitats de dades) i onClear.
function crosshair(svg, x, y0, y1, onMove, onClear){
  const g=svg.append('g').attr('class','cross').style('display','none'); g.append('line').attr('y1',y0).attr('y2',y1);
  const hit=svg.append('rect').attr('x',x.range()[0]).attr('width',x.range()[1]-x.range()[0]).attr('y',y0).attr('height',y1-y0).attr('fill','transparent').style('cursor','crosshair');
  const mv=e=>{ const [px]=d3.pointer(e,svg.node()); const xv=onMove(x.invert(Math.max(x.range()[0],Math.min(x.range()[1],px)))); if(xv==null) return; g.style('display',null).select('line').attr('x1',x(xv)).attr('x2',x(xv)); };
  const clear=()=>{ g.style('display','none'); onClear&&onClear(); };
  hit.on('pointermove',mv).on('pointerdown',mv).on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); });
  CLEARS.push([svg.node(),clear]);
  return {g,clear};
}
function yGrid(svg,y,x0,x1,ticks,f){ const g=svg.append('g').attr('class','grid'); ticks.forEach(t=>{ g.append('line').attr('x1',x0).attr('x2',x1).attr('y1',y(t)).attr('y2',y(t)); svg.append('text').attr('class','ax').attr('x',x0).attr('y',y(t)-4).text(f(t)); }); }
function xAxis(svg,x,yb,ticks,f){ const W=+svg.attr('width'); ticks.forEach(t=>{ const px=x(t); svg.append('text').attr('class','ax').attr('x',px).attr('y',yb+15).attr('text-anchor',px<14?'start':px>W-14?'end':'middle').text(f?f(t):t); }); }
function ann(svg,x,y0,y1,t,label,hot,anchor){ const g=svg.append('g').attr('class','ann'+(hot?' hot':'')); g.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',y0).attr('y2',y1);
  label.split('\n').forEach((l,i)=>g.append('text').attr('x',x(t)+(anchor==='end'?-5:5)).attr('y',y0+10+i*13).attr('text-anchor',anchor||'start').text(l)); return g; }
const nearest=(pts,xv)=>{ let b=pts[0]; for(const p of pts) if(Math.abs(p[0]-xv)<Math.abs(b[0]-xv)) b=p; return b; };
const shown={};

/* =========== 1. MONEDES =========== */
let base='2002M01', coinK=LAST, coinTimer=null;
const cSvg=d3.select('#coins');
const coinVal=(b,k)=>100*ipc(b)/ipc(k);
function h1(){
  const v=coinVal('2002M01',LAST);
  $('#h1').textContent=`100 € guardats el 2002 avui compren el que llavors en compraven ${fmt(v)}.`;
  $('#lead').textContent=`És la inflació acumulada a Catalunya des que va arribar l’euro: els preus s’han multiplicat per ${fmt(ipc(LAST)/ipc('2002M01'),2)}. Ningú no t’ha pres el bitllet. Amb l’augment acumulat dels preus, compra menys. Tria des de quan comptes.`;
}
function drawCoins(){
  const [W]=sizeOf(cSvg,420,1,0,9999); const n=10, gap=W/n, r=gap*.4;
  cSvg.attr('height',W).attr('viewBox',`0 0 ${W} ${W}`);
  cSvg.selectAll('circle').data(d3.range(100)).join('circle').attr('class','coin')
    .attr('cx',i=>gap*(i%n)+gap/2).attr('cy',i=>gap*Math.floor(i/n)+gap/2).attr('r',r).attr('stroke-width',1.3);
  paintCoins();
}
function paintCoins(){
  const v=coinVal(base,coinK), full=Math.floor(v+1e-9), frac=v-full;
  cSvg.selectAll('circle').attr('fill',i=>i<full?RED:(i===full&&frac>.5?RED:'transparent')).attr('stroke',i=>i<full||(i===full&&frac>.5)?RED:MUTED)
    .attr('opacity',i=>i<full||(i===full&&frac>.5)?1:.55);
  const [y,m]=kParse(coinK), [by,bm]=kParse(base);
  $('#coinYr').textContent=y;
  const sav=base<'2002M01'?`${fmt(100*PTA)} pessetes (100 €)`:'100 €', g=base<'2002M01'?'guardades':'guardats';
  $('#rCoins').innerHTML = coinK===base ? `<b>${cap(kLabel(base))}</b>: guardes ${sav}. <span class="m">Mou el control o prem ▶.</span>` :
    `<b>${cap(kLabel(coinK))}</b>: ${sav} ${g} des del ${MESOS[bm-1]} de ${by} compren el que llavors compraven <b>${fmt(v,1)} €</b>. Els preus s’han multiplicat per ${fmt(100/v,2)}.`;
  $('#coinT').value=kDiff(base,coinK);
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function setBase(b){ base=b; const n=kDiff(base,LAST); $('#coinT').max=n; coinK=base; paintCoins(); $$('[data-base]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.base===b)); }
function playCoins(){
  if(coinTimer){ coinTimer.stop(); coinTimer=null; $('#coinPlay').setAttribute('aria-pressed',false); $('#coinPlay').textContent='▶'; return; }
  if(coinK===LAST) coinK=base;
  const n=kDiff(base,LAST), start=kDiff(base,coinK), dur=RM?0:Math.min(6000,Math.max(2500,n*28)), t0=performance.now();
  $('#coinPlay').setAttribute('aria-pressed',true); $('#coinPlay').textContent='❚❚';
  coinTimer=d3.timer(()=>{ const k=dur?Math.min(1,(performance.now()-t0)/dur):1; coinK=kAdd(base,Math.round(start+(n-start)*k)); paintCoins(); if(k>=1){ coinTimer.stop(); coinTimer=null; $('#coinPlay').setAttribute('aria-pressed',false); $('#coinPlay').textContent='▶'; } });
}
$('#coinPlay').addEventListener('click',playCoins);
$('#coinT').addEventListener('input',e=>{ if(coinTimer) playCoins(); coinK=kAdd(base,+e.target.value); paintCoins(); });
$$('[data-base]').forEach(b=>b.addEventListener('click',()=>{ if(coinTimer) playCoins(); setBase(b.dataset.base); playCoins(); }));
$('#coinNote').textContent=`IPC de Catalunya (INE) des del 1978; abans, IPC d’Espanya. Últim mes: ${kLabel(LAST)}. Cada moneda és 1 € del mes de partida.`;

/* =========== 2. PREUS DELS EUA, 1800–2025 =========== */
const US=D.usCpi, USL=US[US.length-1], usAt=y=>US.find(d=>d[0]===y)[1];
$('#usTitle').textContent=`Als Estats Units, els preus van trigar 171 anys a multiplicar-se per ${fmt(usAt(1971)/usAt(1800),1)}. Des del 1971, s’han multiplicat per ${fmt(USL[1]/usAt(1971),0)}.`;
let usScale='lin';
const US0=`<span class="m">Toca el gràfic.</span> El 1913, quan va néixer la Reserva Federal, els preus eren <b>més baixos</b> que el 1800. Des d’aleshores, el dòlar ha perdut el ${pct(1-usAt(1913)/USL[1],1)} del seu poder de compra.`;
function drawUs(){
  const svg=d3.select('#us'); const [W,H]=sizeOf(svg,697,.62,300,440); const t=22,b=24;
  const x=d3.scaleLinear().domain([1800,USL[0]]).range([0,W]);
  const y=usScale==='log'? d3.scaleLog().domain([20,1100]).range([H-b,t]) : d3.scaleLinear().domain([0,1000]).range([H-b,t]);
  yGrid(svg,y,0,W,usScale==='log'?[25,50,100,250,500,1000]:[0,250,500,750,1000],v=>fmt(v));
  xAxis(svg,x,H-b,W<500?[1800,1850,1900,1950,2000]:[1800,1825,1850,1875,1900,1925,1950,1975,2000,2025]);
  svg.append('rect').attr('x',x(1971)).attr('y',t).attr('width',W-x(1971)).attr('height',H-b-t).attr('fill',R[0]).attr('opacity',.8).lower();
  ann(svg,x,t,H-b,1862,W<500?'1862\nGuerra\nCivil':'1862–1879\nGuerra Civil: bitllets\nsense or');
  ann(svg,x,t+(W<500?40:0),H-b,1913,'1913\nNeix la Fed');
  ann(svg,x,t+(W<500?80:44),H-b,1933,W<500?'1933':'1933\nFi de l’or\nper als\nciutadans');
  ann(svg,x,t,H-b,1971,'15-8-1971\nFi de l’or',true,'end');
  const ln=d3.line().x(d=>x(d[0])).y(d=>y(d[1]));
  const pre=US.filter(d=>d[0]<=1971), post=US.filter(d=>d[0]>=1971);
  const p1=svg.append('path').attr('class','line').attr('d',ln(pre)).attr('stroke',INK);
  const p2=svg.append('path').attr('class','line').attr('d',ln(post)).attr('stroke',RED).attr('stroke-width',2.6);
  const dot=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none');
  if(!shown.us){ p1.attr('opacity',0); p2.attr('opacity',0); svg.node()._rv=()=>{ p1.attr('opacity',1); p2.attr('opacity',1); drawOn(p1,1600); drawOn(p2,900,1600); }; }
  crosshair(svg,x,t,H-b,xv=>{ const d=nearest(US,xv); dot.style('display',null).attr('cx',x(d[0])).attr('cy',y(d[1]));
    $('#rUs').innerHTML=`<b>${d[0]}</b>: el que costava 1 $ el ${d[0]}, el ${USL[0]} en costa <b>${fmt(USL[1]/d[1],USL[1]/d[1]<10?2:1)} $</b>. <span class="m">Índex ${fmt(d[1],1)}.</span>`; return d[0]; },
    ()=>{ dot.style('display','none'); $('#rUs').innerHTML=US0; });
  $('#rUs').innerHTML=US0;
}
$$('[data-uss]').forEach(b=>b.addEventListener('click',()=>{ usScale=b.dataset.uss; $$('[data-uss]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawUs(); }));

/* =========== 3. OR =========== */
const G=mser(D.gold), EX=mser(D.eurusd), GL=G.last;
const goldEur=k=>{ const e=EX.at(k); return e?G.at(k)/e:null; };
let gCur='usd';
const G0=()=>`<span class="m">Toca el gràfic.</span> ${cap(kLabel(GL))}: <b>${fmt(gCur==='usd'?G.at(GL):goldEur(GL))} ${gCur==='usd'?'$':'€'}</b> l’unça.`+(gCur==='usd'?` ${fmt(G.at(GL)/35,0)} vegades la paritat oficial de 35 $ vigent l’agost del 1971. El preu de mercat d’aquell mes era ${fmt(G.at('1971M08'))} $.`:``);
function drawGold(){
  const svg=d3.select('#gold'); const [W,H]=sizeOf(svg,697,.58,290,420); const t=22,b=24;
  const pts = gCur==='usd' ? G.pts() : G.pts().filter(p=>p[2]>='1999M01').map(p=>[p[0],goldEur(p[2]),p[2]]).filter(p=>p[1]!=null);
  const x=d3.scaleLinear().domain([gCur==='usd'?1960:1999,kT(GL)+.05]).range([0,W]);
  const ymax=d3.max(pts,p=>p[1]); const step=ymax>3000?1000:500; const y=d3.scaleLinear().domain([0,Math.ceil(ymax/step)*step]).range([H-b,t]);
  yGrid(svg,y,0,W,d3.range(0,y.domain()[1]+1,step),v=>fmt(v)+(gCur==='usd'?' $':' €'));
  xAxis(svg,x,H-b, gCur==='usd' ? (W<500?[1970,1990,2010]:[1960,1970,1980,1990,2000,2010,2020]) : (W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]));
  if(gCur==='usd'){ ann(svg,x,t,H-b,1971.62,'15-8-1971',true); ann(svg,x,t+30,H-b,1980.04,'1980\n675 $'); ann(svg,x,t+30,H-b,2011.7,'2011\n1.772 $'); }
  else { ann(svg,x,t,H-b,2008.7,'2008\nLehman'); ann(svg,x,t+30,H-b,2020.2,'2020\nCovid'); }
  const area=svg.append('path').attr('d',d3.area().x(p=>x(p[0])).y0(H-b).y1(p=>y(p[1]))(pts)).attr('fill',R[0]);
  const path=svg.append('path').attr('class','line').attr('d',d3.line().x(p=>x(p[0])).y(p=>y(p[1]))(pts)).attr('stroke',RED).attr('stroke-width',2.2);
  if(gCur==='usd'){ const f=pts.find(p=>p[2]==='1971M08'); svg.append('text').attr('class','lab').attr('x',x(1960.3)).attr('y',y(35)-22).text('35 $: paritat oficial'); }
  const dot=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none');
  if(!shown.gold){ path.attr('opacity',0); area.attr('opacity',0); svg.node()._rv=()=>{ path.attr('opacity',1); drawOn(path,2200); area.transition().delay(1400).duration(900).attr('opacity',1); }; }
  const u=gCur==='usd'?' $':' €';
  crosshair(svg,x,t,H-b,xv=>{ const p=nearest(pts,xv); dot.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1]));
    $('#rGold').innerHTML=`<b>${cap(kLabel(p[2]))}</b>: una unça d’or, <b>${fmt(p[1])}${u}</b>.`+(gCur==='usd'?` <span class="m">${fmt(p[1]/35,1)} vegades la paritat oficial de 35 $ de Bretton Woods.</span>`:` <span class="m">${fmt(p[1]/goldEur('1999M01'),1)} vegades el que valia el gener de 1999.</span>`); return p[0]; },
    ()=>{ dot.style('display','none'); $('#rGold').innerHTML=G0(); });
  $('#rGold').innerHTML=G0();
}
$$('[data-gc]').forEach(b=>b.addEventListener('click',()=>{ gCur=b.dataset.gc; $$('[data-gc]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawGold(); }));

/* --- 3b. Una unça en pessetes --- */
const OZ71=35*70/PTA, OZN=goldEur(GL), OZK=OZN/OZ71, OZREAL=OZK/(ipc(GL)/ipc('1971M08'));
$('#ozTitle').textContent=`L’agost del 1971, la paritat oficial de l’or equivalia a ${fmt(35*70)} pessetes. ${cap(kLabel(GL))}: ${fmt(OZN)} € al mercat.`;
$('#ozLede').textContent=`La paritat era de 70 pessetes per dòlar des del 1967: 35 $ × 70 = ${fmt(35*70)} pessetes, ${fmt(OZ71,2)} € equivalents. Això no era el preu d’una compra privada: el mercat de l’or ja cotitzava per sobre de la paritat oficial. Cada quadrat representa aquella paritat; per arribar al preu de mercat de ${kLabel(GL)} en calen ${fmt(Math.round(OZK))}.`;
function drawOz(){
  const svg=d3.select('#oz'); const W=pw(svg,646); const n=Math.round(OZK);
  const cols=W<500?16:24, s=W/cols, rows=Math.ceil(n/cols), H=rows*s;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  const r=svg.selectAll('rect').data(d3.range(n)).join('rect').attr('x',i=>(i%cols)*s+1).attr('y',i=>Math.floor(i/cols)*s+1).attr('width',s-2).attr('height',s-2).attr('rx',1.5)
    .attr('fill',i=>i===0?R[7]:R[3]).attr('opacity',shown.oz?1:0);
  svg.node()._rv=()=>r.transition().delay(i=>RM?0:i*9).duration(300).attr('opacity',1);
  $('#rOz').innerHTML=`<b>${fmt(OZK,0)} vegades la paritat oficial de l’agost del 1971, en euros equivalents.</b> Descomptant la inflació d’aquests anys (×${fmt(ipc(GL)/ipc('1971M08'),1)}), el preu de mercat actual és ${fmt(OZREAL,1)} vegades aquella paritat en termes reals. La comparació combina una paritat legal inicial amb un preu de mercat final.`;
}

/* =========== 4. DE CADA 100 EUROS =========== */
const M3=D.m3, M3L=M3[M3.length-1], CASH=M3L[2]/M3L[1];
$('#cashTitle').textContent=`De cada 100 euros de M3 de la zona euro, només ${fmt(Math.round(CASH*100))} són bitllets i monedes`;
function drawWaffle(){
  const svg=d3.select('#waffle'); const W=pw(svg,360), s=W/10;
  svg.attr('viewBox',`0 0 ${W} ${W}`).attr('width',W).attr('height',W); svg.selectAll('*').remove();
  const nc=Math.round(CASH*100);
  const r=svg.selectAll('rect').data(d3.range(100)).join('rect').attr('x',i=>(i%10)*s+1.5).attr('y',i=>Math.floor(i/10)*s+1.5).attr('width',s-3).attr('height',s-3).attr('rx',2)
    .attr('fill',i=>i>=100-nc?(shown.waffle?RED:LAND):(shown.waffle?R[1]:LAND));
  svg.node()._rv=()=>r.transition().delay(i=>RM?0:(i>=100-nc?900+(i-100+nc)*70:i*6)).duration(400).attr('fill',i=>i>=100-nc?RED:R[1]);
}
const m399=M3.find(d=>d[0]==='1999-01');
$('#m3Title').textContent=`Des que va néixer l’euro, la quantitat de diners s’ha multiplicat per ${fmt(M3L[1]/m399[1],1)}`;
function drawM3(){
  const svg=d3.select('#m3'); const [W,H]=sizeOf(svg,697,.58,290,420); const t=22,b=24;
  const pts=M3.map(d=>[+d[0].slice(0,4)+(+d[0].slice(5)-.5)/12,d[1],d[2],d[0]]);
  const x=d3.scaleLinear().domain([1980,pts[pts.length-1][0]]).range([0,W]);
  const y=d3.scaleLinear().domain([0,20000]).range([H-b,t]);
  yGrid(svg,y,0,W,[0,5000,10000,15000,20000],v=>v?fmt(v/1000)+(v===20000?' bilions €':''):'0');
  xAxis(svg,x,H-b,W<500?[1980,2000,2020]:[1980,1990,2000,2010,2020]);
  ann(svg,x,t,H-b,1999,'1999\nEuro');
  const a1=svg.append('path').attr('d',d3.area().x(p=>x(p[0])).y0(p=>y(p[2])).y1(p=>y(p[1]))(pts)).attr('fill',R[1]);
  const a2=svg.append('path').attr('d',d3.area().x(p=>x(p[0])).y0(H-b).y1(p=>y(p[2]))(pts)).attr('fill',RED);
  const clip=svg.append('clipPath').attr('id','m3c').append('rect').attr('x',0).attr('y',0).attr('height',H).attr('width',shown.m3?W:0);
  a1.attr('clip-path','url(#m3c)'); a2.attr('clip-path','url(#m3c)');
  svg.node()._rv=()=>clip.transition().duration(RM?0:2000).ease(d3.easeCubicInOut).attr('width',W);
  const lx=x(2003); svg.append('text').attr('class','lab').attr('x',W-4).attr('y',y(M3L[2])-6).attr('text-anchor','end').style('fill',RED).text('efectiu');
  svg.append('text').attr('class','lab').attr('x',x(2012)).attr('y',y(7000)).text(W<500?'dipòsits i altres':'dipòsits i altres instruments');
  const M30=`<span class="m">Toca el gràfic.</span> ${cap(kLabel(M3L[0].replace('-','M')))}: <b>${fmt(M3L[1]/1000,1)} bilions d’euros</b>, dels quals ${fmt(M3L[2]/1000,1)} en efectiu.`;
  const dot=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  crosshair(svg,x,t,H-b,xv=>{ const p=nearest(pts,xv); dot.style('display',null).attr('cx',x(p[0])).attr('cy',y(p[1]));
    $('#rM3').innerHTML=`<b>${cap(kLabel(p[3].replace('-','M')))}</b>: ${fmt(p[1]/1000,2)} bilions d’euros. <span class="m">Efectiu: ${pct(p[2]/p[1])}.</span>`; return p[0]; },
    ()=>{ dot.style('display','none'); $('#rM3').innerHTML=M30; });
  $('#rM3').innerHTML=M30;
}

/* =========== 5. BANCS CENTRALS =========== */
const EB=D.ecbBal.map(d=>[+d[0].slice(0,4)+(+d[0].slice(5)-.5)/12,d[1],d[0]]), FB=D.fedBal.map(d=>[+d[0].slice(0,4)+(+d[0].slice(5)-.5)/12,d[1],d[0]]);
const ebAt=k=>EB.find(d=>d[2]===k), ebMax=EB.reduce((a,b)=>b[1]>a[1]?b:a), fbMax=FB.reduce((a,b)=>b[1]>a[1]?b:a);
$('#cbTitle').textContent=`El balanç de l’Eurosistema es va multiplicar per ${fmt(ebMax[1]/ebAt('2007-06')[1],1)} entre el 2007 i el 2022`;
function drawCb(){
  const svg=d3.select('#cb'); const [W,H]=sizeOf(svg,697,.58,290,420); const t=22,b=24;
  const x=d3.scaleLinear().domain([1999,EB[EB.length-1][0]]).range([0,W]); const y=d3.scaleLinear().domain([0,10000]).range([H-b,t]);
  yGrid(svg,y,0,W,[0,2500,5000,7500,10000],v=>v?fmt(v/1000,1)+(v===10000?' bilions € / $':''):'0');
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  ann(svg,x,t,H-b,2008.7,'2008\nLehman'); ann(svg,x,t+(W<500?30:0),H-b,2015.2,W<500?'2015\nQE':'2015\nQE del BCE'); ann(svg,x,t,H-b,2020.2,'2020\nCovid');
  const ln=d3.line().x(d=>x(d[0])).y(d=>y(d[1]));
  const pF=svg.append('path').attr('class','line').attr('d',ln(FB)).attr('stroke',INK);
  const pE=svg.append('path').attr('class','line').attr('d',ln(EB)).attr('stroke',RED).attr('stroke-width',2.6);
  if(!shown.cb){ pF.attr('opacity',0); pE.attr('opacity',0); svg.node()._rv=()=>{ pF.attr('opacity',1); pE.attr('opacity',1); drawOn(pF,2000); drawOn(pE,2000,250); }; }
  const dE=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), dF=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const CB0=`<span class="m">Toca el gràfic.</span> Màxims: Eurosistema, <b>${fmt(ebMax[1]/1000,1)} bilions d’euros</b> (${kLabel(ebMax[2].replace('-','M'))}); Reserva Federal, <b>${fmt(fbMax[1]/1000,1)} bilions de dòlars</b> (${kLabel(fbMax[2].replace('-','M'))}).`;
  crosshair(svg,x,t,H-b,xv=>{ const e=nearest(EB,xv), f=FB[0][0]<=xv+.05?nearest(FB,xv):null; dE.style('display',null).attr('cx',x(e[0])).attr('cy',y(e[1]));
    if(f) dF.style('display',null).attr('cx',x(f[0])).attr('cy',y(f[1])); else dF.style('display','none');
    $('#rCb').innerHTML=`<b>${cap(kLabel(e[2].replace('-','M')))}</b>: Eurosistema, ${fmt(e[1]/1000,2)} bilions d’euros${f?`; Reserva Federal, ${fmt(f[1]/1000,2)} bilions de dòlars`:''}.`; return e[0]; },
    ()=>{ dE.style('display','none'); dF.style('display','none'); $('#rCb').innerHTML=CB0; });
  $('#rCb').innerHTML=CB0;
}

/* =========== 6. CANTILLON =========== */
const YRS=d3.range(2000,2026);
const yAvg=(fn)=>y=>{ const v=d3.range(1,13).map(m=>fn(kMake(y,m))).filter(v=>v!=null); return v.length===12?d3.mean(v):null; };
const m3Map=new Map(M3.map(d=>[d[0].replace('-','M'),d[1]]));
const habQ=new Map(); D.hab.forEach(r=>{ const y=+r[0].slice(0,4); (habQ.get(y)||habQ.set(y,[]).get(y)).push(r[3]); });
const habY=y=>{ const a=habQ.get(y); return a&&a.length===4?d3.mean(a):null; };
const salY=new Map(D.sal.map(r=>[r[0],r[1]]));
const CAN=[
  {k:'or',n:'Or',c:R[7],f:yAvg(goldEur)},
  {k:'m3',n:'Diners (M3)',c:R[5],f:yAvg(k=>m3Map.get(k))},
  {k:'hab',n:'Habitatge',c:RED,f:habY},
  {k:'ipc',n:'Preus',c:MUTED,f:ipcYear},
  {k:'sal',n:'Sou',c:INK,f:y=>salY.get(y)},
].map(s=>{ const b=s.f(2000); s.pts=YRS.map(y=>[y,s.f(y)/b]).filter(p=>!isNaN(p[1])); s.end=s.pts[s.pts.length-1]; return s; });
const cBy=Object.fromEntries(CAN.map(s=>[s.k,s]));
$('#canLede').textContent=`La idea de Richard Cantillon és que els efectes del diner nou depenen de qui el rep primer. És una hipòtesi sobre la transmissió i la distribució, però aquestes línies no demostren que els actius pugin abans que els sous ni atribueixen els canvis a una sola causa. Entre el 2000 i el 2025, l’or en euros s’ha multiplicat per ${fmt(cBy.or.end[1],1)}, el diner per ${fmt(cBy.m3.end[1],1)} i el preu de l’habitatge per ${fmt(cBy.hab.end[1],1)}. El sou, per ${fmt(cBy.sal.end[1],2)}.`;
let canSel=null;
function drawCan(){
  const svg=d3.select('#can'); const [W,H]=sizeOf(svg,697,.62,320,460); const t=18,b=24,rp=W<500?88:112;
  const x=d3.scaleLinear().domain([2000,2025]).range([0,W-rp]); const y=d3.scaleLog().base(2).domain([.8,16]).range([H-b,t]);
  yGrid(svg,y,0,W-rp,[1,2,4,8,16],v=>'×'+v);
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  const ln=d3.line().x(p=>x(p[0])).y(p=>y(p[1]));
  const paths=CAN.map((s,i)=>{ const p=svg.append('path').attr('class','line').attr('d',ln(s.pts)).attr('stroke',s.c).attr('stroke-width',s.k==='sal'?2.8:2.2); if(!shown.can) p.attr('opacity',0); return p; });
  // Etiquetes finals sense solapar-se
  const labs=CAN.map(s=>({s,y:y(s.end[1])})).sort((a,b)=>a.y-b.y); for(let i=1;i<labs.length;i++) if(labs[i].y-labs[i-1].y<15) labs[i].y=labs[i-1].y+15;
  const L=labs.map(l=>{ const t=svg.append('text').attr('class','endlab').attr('x',W-rp+8).attr('y',l.y).attr('dy','.35em').style('fill',l.s.c).attr('opacity',shown.can?1:0);
    t.append('tspan').attr('class','v').text('×'+fmt(l.s.end[1],l.s.end[1]<3?2:1)+' '); t.append('tspan').text(l.s.n); return t; });
  svg.node()._rv=()=>{ paths.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1800,i*220); }); L.forEach((t,i)=>t.transition().delay(RM?0:1800+i*220).duration(500).attr('opacity',1)); };
  const dots=CAN.map(s=>svg.append('circle').attr('r',3.5).attr('fill',s.c).style('display','none'));
  const C0='<span class="m">Toca el gràfic per veure cada any.</span>';
  crosshair(svg,x,t,H-b,xv=>{ const yy=Math.round(xv); CAN.forEach((s,i)=>{ const p=s.pts.find(p=>p[0]===yy); if(p) dots[i].style('display',null).attr('cx',x(yy)).attr('cy',y(p[1])); });
    $('#rCan').innerHTML=`<b>${yy}</b>, respecte del 2000: `+CAN.map(s=>{ const p=s.pts.find(p=>p[0]===yy); return p?`<span style="color:${s.c}">${s.n.toLowerCase()} ×${fmt(p[1],2)}</span>`:''; }).join(' · '); return yy; },
    ()=>{ dots.forEach(d=>d.style('display','none')); $('#rCan').innerHTML=C0; });
  $('#rCan').innerHTML=C0;
}

/* =========== 7. SOU REAL =========== */
const SAL=D.sal.map(r=>({y:r[0],n:r[1],r:r[1]*ipcYear(2025)/ipcYear(r[0])}));
const S0=SAL[0], SL=SAL[SAL.length-1], SMAX=SAL.reduce((a,b)=>b.r>a.r?b:a);
let salMode='real';
$('#salRealUnit').textContent='En euros de '+SL.y;
$('#salTitle').textContent= SL.r<S0.r ? `El sou mitjà a Catalunya comprava el ${SL.y} menys que l’any ${S0.y}` : `El sou mitjà a Catalunya comprava el ${SL.y} gairebé el mateix que l’any ${S0.y}`;
$('#salLede').textContent=`En euros de cada any, el sou brut mitjà ha passat de ${fmt(S0.n)} € el ${S0.y} a ${fmt(SL.n)} € el ${SL.y}. Sembla molt. Però en euros de ${SL.y}, el sou del ${S0.y} equivalia a ${fmt(Math.round(S0.r/10)*10)} €. ${SL.y-S0.y} anys després, el poder de compra és un ${pct(1-SL.r/S0.r,1)} més baix. El millor any va ser el ${SMAX.y}.`;
function drawSal(){
  const svg=d3.select('#sal'); const [W,H]=sizeOf(svg,646,.6,280,400); const t=18,b=24;
  const x=d3.scaleLinear().domain([2000,2025]).range([10,W-10]); const y=d3.scaleLinear().domain([0,36000]).range([H-b,t]);
  yGrid(svg,y,0,W,[0,10000,20000,30000],v=>v?fmt(v)+' €':'0');
  xAxis(svg,x,H-b,W<500?[2000,2010,2020]:[2000,2005,2010,2015,2020,2025]);
  const k=salMode==='real'?'r':'n';
  const ghost=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d[k==='r'?'n':'r']))(SAL)).attr('stroke',LINE).attr('stroke-width',1.6);
  const p=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d[k]))(SAL)).attr('stroke',RED).attr('stroke-width',2.6);
  const cs=svg.selectAll('circle.s').data(SAL).join('circle').attr('class','s').attr('cx',d=>x(d.y)).attr('cy',d=>y(d[k])).attr('r',shown.sal?3.2:0).attr('fill',RED);
  svg.append('text').attr('class','lab').attr('x',x(2025)).attr('y',y(SL[k])-12).attr('text-anchor','end').text(fmt(SL[k])+' €');
  svg.append('text').attr('class','lab').attr('x',x(2000)).attr('y',y(S0[k])-12).text(fmt(S0[k])+' €');
  svg.append('text').attr('class','ax').attr('x',x(2012)).attr('y',y(SAL[12][k==='r'?'n':'r'])+(k==='r'?16:-8)).attr('text-anchor','middle').text(k==='r'?'en euros de cada any':'en euros de '+SL.y);
  if(!shown.sal){ p.attr('opacity',0); svg.node()._rv=()=>{ p.attr('opacity',1); drawOn(p,1500); cs.transition().delay((d,i)=>RM?0:i*55).duration(300).attr('r',3.2); }; }
  const dot=svg.append('circle').attr('r',5.5).attr('fill','none').attr('stroke',INK).attr('stroke-width',1.5).style('display','none');
  const S00='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,H-b,xv=>{ const d=SAL.find(d=>d.y===Math.round(xv)); if(!d) return null; dot.style('display',null).attr('cx',x(d.y)).attr('cy',y(d[k]));
    $('#rSal').innerHTML=`<b>${d.y}</b>: ${fmt(d.n)} € bruts l’any, que equivalen, en euros de ${SL.y}, a <b>${fmt(Math.round(d.r))} €</b>. <span class="m">${d.r>SL.r?`${fmt(Math.round(d.r-SL.r))} € més de poder de compra que el ${SL.y}.`:d.y===SL.y?'':`${fmt(Math.round(SL.r-d.r))} € menys que el ${SL.y}.`}</span>`; return d.y; },
    ()=>{ dot.style('display','none'); $('#rSal').innerHTML=S00; });
  $('#rSal').innerHTML=S00;
}
$$('[data-sal]').forEach(b=>b.addEventListener('click',()=>{ salMode=b.dataset.sal; $$('[data-sal]').forEach(x=>x.setAttribute('aria-pressed',x===b)); drawSal(); }));

/* =========== 8. ANYS DE SOU PER UN PIS =========== */
const BR=YRS.map(y=>{ const p=habY(y), s=salY.get(y); return p&&s?{y,p:p*80,s,n:p*80/s}:null; }).filter(Boolean);
const B0=BR[0], BL=BR[BR.length-1], BMAX=BR.reduce((a,b)=>b.n>a.n?b:a);
$('#brTitle').textContent=`Un pis de 80 m² a la província de Barcelona equival a ${fmt(BL.n,1)} anys de sou brut sencer el ${BL.y}`;
$('#brLede').textContent=`El ${B0.y} en calien ${fmt(B0.n,1)}. En plena bombolla, el ${BMAX.y}, ${fmt(BMAX.n,1)}. La ràtio va baixar després de la bombolla i ha augmentat entre el 2014 i el ${BL.y}, amb baixades intermèdies. El valor taxat d’aquests 80 m² ha passat de ${fmt(Math.round(B0.p/1000))}.000 € el ${B0.y} a ${fmt(Math.round(BL.p/1000))}.000 € el ${BL.y}. És una comparació de valor taxat i sou brut, no una mesura de l’esforç hipotecari real d’una llar.`;
function drawBricks(){
  const svg=d3.select('#bricks'); const [W,H]=sizeOf(svg,697,.55,280,400); const t=24,b=24;
  const x=d3.scaleBand().domain(BR.map(d=>d.y)).range([0,W]).padding(.18); const y=d3.scaleLinear().domain([0,11]).range([H-b,t]);
  yGrid(svg,y,0,W,[0,2,4,6,8,10],v=>v?v+' anys':'0');
  xAxis(svg,d=>x(d)+x.bandwidth()/2,H-b,BR.map(d=>d.y).filter(yy=>yy%5===0));
  const bricks=[]; BR.forEach(d=>{ const full=Math.floor(d.n); for(let i=0;i<Math.ceil(d.n);i++){ const h=i<full?1:d.n-full; bricks.push({d,i,h}); } });
  const bh=y(0)-y(1);
  const r=svg.append('g').selectAll('rect').data(bricks).join('rect').attr('x',o=>x(o.d.y)).attr('width',x.bandwidth())
    .attr('y',o=>y(o.i+o.h)+1).attr('height',o=>Math.max(0,bh*o.h-2)).attr('rx',1.5).attr('fill',o=>o.i%2?R[4]:R[3]).attr('opacity',shown.bricks?1:0).attr('class','rent-b');
  svg.node()._rv=()=>r.attr('transform',`translate(0,${-H*.25})`).transition().delay(o=>RM?0:(o.d.y-2000)*45+o.i*60).duration(450).ease(d3.easeBounceOut).attr('opacity',1).attr('transform','translate(0,0)');
  svg.append('text').attr('class','lab').attr('x',x(BL.y)+x.bandwidth()/2).attr('y',y(BL.n)-7).attr('text-anchor','middle').text(fmt(BL.n,1));
  svg.append('text').attr('class','lab').attr('x',x(BMAX.y)+x.bandwidth()/2).attr('y',y(BMAX.n)-7).attr('text-anchor','middle').text(fmt(BMAX.n,1));
  svg.append('text').attr('class','lab').attr('x',x(B0.y)+x.bandwidth()/2).attr('y',y(B0.n)-7).attr('text-anchor','middle').text(fmt(B0.n,1));
  const sel=d=>{ r.attr('opacity',o=>o.d===d?1:.45); $('#rBr').innerHTML=`<b>${d.y}</b>: 80 m² valien ${fmt(Math.round(d.p/100)*100)} € i el sou brut mitjà era de ${fmt(d.s)} € l’any. <b>${fmt(d.n,1)} anys de sou sencer.</b>`; };
  const BR0=`<span class="m">Toca una columna.</span>`;
  const clear=()=>{ r.attr('opacity',1); $('#rBr').innerHTML=BR0; };
  r.on('pointerenter',(e,o)=>sel(o.d)).on('click',(e,o)=>sel(o.d)); svg.on('pointerleave',e=>{ if(e.pointerType==='mouse'&&shown.bricks) clear(); }); CLEARS.push([svg.node(),()=>{ if(shown.bricks) clear(); }]);
  $('#rBr').innerHTML=BR0;
}

/* =========== 9. LLOGUER =========== */
const RENT=D.rent.map(r=>({y:r[0],r:r[1],c:r[2],s:salY.get(r[0])})).filter(d=>d.s).map(d=>({...d,sh:d.r*12/d.s}));
const RL=RENT[RENT.length-1], RMIN=RENT.reduce((a,b)=>b.sh<a.sh?b:a), RMAXS=RENT.reduce((a,b)=>b.sh>a.sh?b:a);
$('#rentTitle').textContent=`El lloguer mitjà d’un contracte nou de Barcelona equival al ${pct(RL.sh,0)} del sou brut mitjà català el ${RL.y}`;
$('#rentLede').textContent=`El ${RL.y}, un contracte nou de lloguer a Barcelona costava de mitjana ${fmt(Math.round(RL.r))} € al mes. El sou brut mitjà a Catalunya és de ${fmt(Math.round(RL.s/12))} € al mes, abans d’impostos i cotitzacions. Sobre el sou net, la proporció seria encara més alta. El ${RMIN.y}, el lloguer en suposava el ${pct(RMIN.sh,0)}. Eurostat defineix la sobrecàrrega com més del 40% de la renda disponible d’una llar destinat a tota la despesa d’habitatge, neta d’ajudes. Aquest gràfic compara lloguer i sou brut d’una persona: no calcula aquell indicador.`;
$('#rentNote').textContent=`Lloguer: mitjana dels contractes nous amb fiança dipositada a l’Incasòl a la ciutat de Barcelona. Des del 2024 Barcelona és zona de mercat tensionat, amb preus regulats; el nombre de contractes registrats ha baixat de ${fmt(RENT.reduce((a,b)=>b.c>a.c?b:a).c)} (${RENT.reduce((a,b)=>b.c>a.c?b:a).y}) a ${fmt(RL.c)} (${RL.y}). La variació de contractes registrats no mesura el parc total de lloguer ni identifica l’efecte de la regulació. Sou: cost salarial mensual mitjà per treballador a Catalunya, anualitzat (INE), dividit per 12.`;
function drawRent(){
  const svg=d3.select('#rent'); const [W,H]=sizeOf(svg,697,.5,260,360); const t=22,b=24;
  const x=d3.scaleBand().domain(RENT.map(d=>d.y)).range([0,W]).padding(.2); const y=d3.scaleLinear().domain([0,1]).range([H-b,t]);
  const g=svg.append('g').selectAll('g').data(RENT).join('g').attr('class','rent-b');
  g.append('rect').attr('x',d=>x(d.y)).attr('width',x.bandwidth()).attr('y',t).attr('height',H-b-t).attr('rx',2).attr('fill',LAND);
  const bars=g.append('rect').attr('x',d=>x(d.y)).attr('width',x.bandwidth()).attr('rx',2).attr('fill',RED).attr('y',d=>shown.rent?y(d.sh):y(0)).attr('height',d=>shown.rent?y(0)-y(d.sh):0);
  const lab=g.append('text').attr('class','ax').attr('x',d=>x(d.y)+x.bandwidth()/2).attr('y',d=>y(d.sh)-5).attr('text-anchor','middle').style('fill','#fff').style('font-weight',600).style('font-size',W<500?'8.5px':'11px')
    .text(d=>fmt(d.sh*100,0)).attr('dy','1.2em').attr('opacity',shown.rent?1:0);
  svg.append('line').attr('x1',0).attr('x2',W).attr('y1',y(.5)).attr('y2',y(.5)).attr('stroke',BG).attr('stroke-width',1.2).attr('stroke-dasharray','3 3');
  svg.append('text').attr('class','ax').attr('x',0).attr('y',t-6).text('100% del sou brut');
  xAxis(svg,d=>x(d)+x.bandwidth()/2,H-b,RENT.map(d=>d.y).filter(yy=>yy%(W<500?4:2)===1||yy===RL.y));
  svg.node()._rv=()=>{ bars.transition().delay((d,i)=>RM?0:i*60).duration(700).ease(d3.easeCubicOut).attr('y',d=>y(d.sh)).attr('height',d=>y(0)-y(d.sh)); lab.transition().delay((d,i)=>RM?0:500+i*60).duration(400).attr('opacity',1); };
  const R0=`<span class="m">Toca una barra.</span> Cada columna és el sou brut mitjà d’un mes; en vermell, el lloguer mitjà.`;
  const sel=d=>{ g.attr('opacity',o=>o===d?1:.5); $('#rRent').innerHTML=`<b>${d.y}</b>: lloguer mitjà de ${fmt(Math.round(d.r))} € al mes i sou brut mitjà de ${fmt(Math.round(d.s/12))} €. <b>${pct(d.sh,0)}</b> del sou.`; };
  const clear=()=>{ g.attr('opacity',1); $('#rRent').innerHTML=R0; };
  g.on('pointerenter',(e,d)=>sel(d)).on('click',(e,d)=>sel(d)); svg.on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); }); CLEARS.push([svg.node(),clear]);
  $('#rRent').innerHTML=R0;
}

/* --- 9b. Emancipació --- */
const EMN={FI:'Finlàndia',DK:'Dinamarca',SE:'Suècia',NL:'Països Baixos',FR:'França',DE:'Alemanya',EU27_2020:'Mitjana de la UE',PT:'Portugal',ES:'Espanya',IT:'Itàlia',EL:'Grècia',HR:'Croàcia'};
const EM=Object.entries(D.eman).map(([g,a])=>({g,n:EMN[g]||g,v:a[a.length-1][1],y:a[a.length-1][0],a})).sort((a,b)=>a.v-b.v);
const emES=D.eman.ES, emMin=emES.reduce((a,b)=>b[1]<a[1]?b:a);
$('#emTitle').textContent=`I a Espanya els joves marxen de casa dels pares, de mitjana, als ${fmt(emES[emES.length-1][1],1).replace(',0','')} anys`;
$('#emLede').textContent=`Segons l’API d’Eurostat per al ${emES[emES.length-1][0]}, són ${fmt(emES[emES.length-1][1]-D.eman.EU27_2020[D.eman.EU27_2020.length-1][1],1)} anys més tard que la mitjana europea i ${fmt(emES[emES.length-1][1]-EM[0].v,1)} més tard que a ${EM[0].n}. El ${emMin[0]} era als ${fmt(emMin[1],1)}.`;
$('#emNote').innerHTML='Indicador aproximat basat en la convivència amb els pares a l’enquesta EU-LFS; no és un seguiment de l’edat de sortida de cada cohort. Es conserva la versió de l’API: per a Finlàndia el 2025, la <a href="https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260915-1">nota de premsa del 15 de setembre de 2026</a> dona una dècima més. La discrepància entre fonts oficials queda pendent de reconciliació.';
function drawEm(){
  const svg=d3.select('#em'); const W=pw(svg,560), rh=26, t=10, H=t+EM.length*rh+24, lw=W<420?108:128;
  svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove();
  const x=d3.scaleLinear().domain([20,32]).range([lw,W-34]);
  [20,24,28,32].forEach(v=>{ svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',t).attr('y2',H-22).attr('stroke',LINE); svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',H-6).attr('text-anchor','middle').text(v+' anys'); });
  EM.forEach((d,i)=>{ const yy=t+i*rh+rh/2, hot=d.g==='ES', eu=d.g==='EU27_2020';
    svg.append('text').attr('class','ax').attr('x',lw-10).attr('y',yy).attr('dy','.35em').attr('text-anchor','end').style('fill',hot?RED:eu?INK:null).style('font-weight',hot||eu?600:null).style('font-size','12px').text(d.n);
    svg.append('line').attr('x1',x(20)).attr('x2',x(d.v)).attr('y1',yy).attr('y2',yy).attr('stroke',hot?RED:eu?INK:R[1]).attr('stroke-width',hot?2:1.2);
    const c=svg.append('circle').attr('cx',x(20)).attr('cy',yy).attr('r',hot?6:4.5).attr('fill',hot?RED:eu?INK:R[3]).datum(d);
    const tx=svg.append('text').attr('class','lab').attr('x',x(d.v)+10).attr('y',yy).attr('dy','.35em').style('fill',hot?RED:null).text(fmt(d.v,1)).attr('opacity',0);
    const go=()=>{ c.transition().delay(RM?0:i*70).duration(800).ease(d3.easeCubicOut).attr('cx',x(d.v)); tx.transition().delay(RM?0:600+i*70).duration(300).attr('opacity',1); };
    if(shown.em){ c.attr('cx',x(d.v)); tx.attr('opacity',1); } else (svg.node()._q||(svg.node()._q=[])).push(go);
  });
  svg.node()._rv=()=>(svg.node()._q||[]).forEach(f=>f());
}

/* =========== 10. CALCULADORA =========== */
function parseAmt(s){ const v=parseFloat(String(s).replace(/\./g,'').replace(',','.')); return isFinite(v)&&v>0?v:0; }
function calc(){
  const y=+$('#cY').value, amt=parseAmt($('#cAmt').value), pta=y<2002; $('#cYr').textContent=y; $('#cUnit').textContent=pta?'pessetes':'euros';
  const k=ipc(LAST)/ipcYear(y), eur=pta?amt/PTA:amt, today=eur*k;
  $('#cOut').innerHTML=amt? `<span class="n">${fmt(today,today<100?2:0)} €</span><span class="t">${fmt(amt,amt%1?2:0)} ${pta?'pessetes':'euros'} del ${y}${pta?` (${fmt(eur,2)} €)`:''} equivalen a <b>${fmt(today,today<100?2:0)} €</b> ${deMes(kParse(LAST)[1])} de ${kParse(LAST)[0]}. Els preus s’han multiplicat per ${fmt(k,2)}.<br><span class="m">Guardats en un calaix, avui compren el que llavors compraven ${fmt(eur/k,eur/k<100?2:0)} €: han perdut el ${pct(1-1/k,0)} del seu valor.</span></span>` : '<span class="t m">Escriu una quantitat.</span>';
}
$('#cNote').textContent=`Mitjana de l’IPC de l’any triat comparada amb ${kLabel(LAST)}. IPC de Catalunya des del 1978 i d’Espanya abans (INE). 1 € = 166,386 pessetes.`;
$('#cY').addEventListener('input',()=>{ const y=+$('#cY').value, a=$('#cAmt'); if(y>=2002 && /pessetes/.test($('#cUnit').textContent)){ a.value=fmt(Math.round(parseAmt(a.value)/PTA)); } else if(y<2002 && /euros/.test($('#cUnit').textContent)){ a.value=fmt(Math.round(parseAmt(a.value)*PTA/100)*100); } calc(); });
$('#cAmt').addEventListener('input',calc);
$('#cAmt').addEventListener('change',()=>{ const v=parseAmt($('#cAmt').value); if(v) $('#cAmt').value=fmt(v,v%1?2:0); calc(); });

/* ---------- tancament ---------- */
$('#close1').textContent=`Des del 2000, la quantitat de diners de la zona euro s’ha multiplicat per ${fmt(cBy.m3.end[1],1)}; el valor de l’habitatge a la província de Barcelona, per ${fmt(cBy.hab.end[1],1)}; els preus de consum a Catalunya, per ${fmt(cBy.ipc.end[1],2)}, i el sou mitjà, per ${fmt(cBy.sal.end[1],2)}. Cap d’aquestes xifres no surt a la nòmina, però totes es noten a final de mes.`;

/* ---------- boot ---------- */
function layoutAll(){ drawCoins(); drawUs(); drawGold(); drawOz(); drawWaffle(); drawM3(); drawCb(); drawCan(); drawSal(); drawBricks(); drawRent(); drawEm(); }
function boot(){
  h1(); setBase('2002M01'); coinK=LAST; layoutAll(); calc();
  coinK='2002M01'; paintCoins(); onView($('#coins'),()=>setTimeout(playCoins,RM?0:500),.4);
  [['us',.3],['gold',.3],['oz',.2],['waffle',.4],['m3',.3],['cb',.3],['can',.3],['sal',.3],['bricks',.3],['rent',.3],['em',.3]].forEach(([id,th])=>
    onView($('#'+id),()=>{ shown[id]=true; const f=$('#'+id)._rv; f&&f(); },th));
  if(!RM && window.Lenis){ const lenis=new Lenis({lerp:.1, wheelMultiplier:.9}); const raf=t=>{ lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}
let lw=innerWidth, rt; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(Math.abs(innerWidth-lw)<2) return; lw=innerWidth; layoutAll(); },180); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(boot); else boot();
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
