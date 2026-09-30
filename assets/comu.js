/* Utilitats compartides per les subpàgines «Mesurat en or» i «La casa» (llegeixen data/diners.json). */
window.Comu=(function(){
"use strict";
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s=>document.querySelector(s), $$ = s=>Array.from(document.querySelectorAll(s));
function fmt(n,d){ d=d||0; let s=Math.abs(n).toFixed(d).split('.'); s[0]=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.'); return (n<0?'−':'')+s[0]+(s[1]?','+s[1]:''); }
function pct(x,d){ if(d===undefined) d = Math.abs(x*100)<1?2:Math.abs(x*100)<10?1:0; return fmt(x*100,d)+'%'; }
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C={}; ['bg','ink','text','muted','line','land','panel','red'].forEach(k=>C[k.toUpperCase()]=tok('--'+k)); C.R=[0,1,2,3,4,5,6,7].map(i=>tok('--r'+i));
const MESOS=['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const de=w=>(/^[aeiouàèéíòóú]/i.test(w)?'d’':'de ')+w;

/* ---------- claus mensuals 'AAAAMmm' ---------- */
const kParse=k=>[+k.slice(0,4),+k.slice(5,7)];
const kMake=(y,m)=>`${y}M${String(m).padStart(2,'0')}`;
const kAdd=(k,n)=>{ const [y,m]=kParse(k); const t=y*12+m-1+n; return kMake(Math.floor(t/12),t%12+1); };
const kDiff=(a,b)=>{ const [y1,m1]=kParse(a),[y2,m2]=kParse(b); return (y2*12+m2)-(y1*12+m1); };
const kT=k=>{ const [y,m]=kParse(k); return y+(m-.5)/12; };
const kLabel=k=>{ const [y,m]=kParse(k); return MESOS[m-1]+' '+y; };
function mser(s){ const last=kAdd(s.from,s.v.length-1); return {from:s.from,last,at:k=>{ const i=kDiff(s.from,k); return i>=0&&i<s.v.length?s.v[i]:null; }}; }
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;

/* ---------- sèries derivades de diners.json ---------- */
function series(D){
  const ES=mser(D.ipc.es), CT=mser(D.ipc.ct), LINK=CT.at('1978M01')/ES.at('1978M01');
  const ipc=k=> k>='1978M01' ? CT.at(k) : (ES.at(k)==null?null:ES.at(k)*LINK);
  const G=mser(D.gold), EX=mser(D.eurusd);
  const goldUsd=k=>G.at(k), goldEur=k=>{ const e=EX.at(k), g=G.at(k); return e&&g?g/e:null; };
  // Mitjana d'un període a partir d'una funció mensual (null si hi falta algun mes)
  const avgM=(f,k0,n)=>{ const a=[]; for(let i=0;i<n;i++){ const v=f(kAdd(k0,i)); if(v==null) return null; a.push(v); } return mean(a); };
  const yAvg=f=>y=>avgM(f,kMake(y,1),12);
  const qAvg=f=>q=>avgM(f,kMake(+q.slice(0,4),(+q.slice(5)-1)*3+1),3);
  const m3=new Map(D.m3.map(d=>[d[0].replace('-','M'),d[1]]));
  const usM2=new Map(D.usM2.map(d=>[d[0].replace('-','M'),d[1]]));
  // Habitatge: [espanya, catalunya, província de Barcelona] €/m², trimestral
  const hab=new Map(D.hab.map(r=>[r[0],r.slice(1)]));
  const habQ=[...hab.keys()];
  const habY=(y,i)=>{ const a=[1,2,3,4].map(q=>hab.get(`${y}T${q}`)); return a.every(Boolean)?mean(a.map(r=>r[i])):null; };
  // Sou brut anual (cost salarial total per treballador × 12): [any, catalunya, espanya]
  const salY=new Map(D.sal.map(r=>[r[0],{ct:r[1],es:r[2]}]));
  const usCpi=new Map(D.usCpi);
  const GOLDLAST=G.last, IPCLAST=CT.last;
  return {ES,CT,ipc,G,EX,goldUsd,goldEur,avgM,yAvg,qAvg,m3,usM2,hab,habQ,habY,salY,usCpi,GOLDLAST,IPCLAST};
}
const OZ=31.1034768; // grams per unça troy

/* ---------- gràfics ---------- */
function onView(el, fn, th){
  if(RM || !('IntersectionObserver' in window)){ fn(); return; }
  const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); fn(); } },{threshold:th||.3});
  io.observe(el);
}
// Ressaltat: desapareix en sortir del gràfic amb el ratolí o en tocar fora.
const CLEARS=[];
document.addEventListener('pointerdown',e=>{ for(let i=CLEARS.length-1;i>=0;i--){ const [n,f]=CLEARS[i]; if(!n.isConnected){ CLEARS.splice(i,1); continue; } if(!n.contains(e.target)) f(); } });
const pw=(svg,maxW)=>Math.min(svg.node().parentNode.clientWidth||Math.max(280,innerWidth-40),maxW);
function sizeOf(svg,maxW,ratio,minH,maxH){ const W=pw(svg,maxW); const H=Math.round(Math.max(minH,Math.min(maxH,W*ratio))); svg.attr('viewBox',`0 0 ${W} ${H}`).attr('width',W).attr('height',H); svg.selectAll('*').remove(); svg.on('.',null); return [W,H]; }
const drawOn=(path,dur,delay)=>{ if(RM) return; const n=path.node(), L=n.getTotalLength(); path.attr('stroke-dasharray',L+' '+L).attr('stroke-dashoffset',L).transition().delay(delay||0).duration(dur||1800).ease(d3.easeCubicInOut).attr('stroke-dashoffset',0).on('end',()=>path.attr('stroke-dasharray',null)); };
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
// Etiquetes finals d'un gràfic de línies, separades perquè no se solapin
function endLabels(svg,items,x0,gap,shown){ const labs=items.slice().sort((a,b)=>a.y-b.y); for(let i=1;i<labs.length;i++) if(labs[i].y-labs[i-1].y<gap) labs[i].y=labs[i-1].y+gap;
  return labs.map(l=>{ const t=svg.append('text').attr('class','endlab').attr('x',x0).attr('y',l.y).attr('dy','.35em').style('fill',l.c).attr('opacity',shown?1:0);
    t.append('tspan').attr('class','v').text(l.v+' '); t.append('tspan').text(l.n); return t; }); }
function seg(attr,fn){ $$(`[data-${attr}]`).forEach(b=>b.addEventListener('click',()=>{ $$(`[data-${attr}]`).forEach(x=>x.setAttribute('aria-pressed',x===b)); fn(b.dataset[attr]); })); }
function boot(draws,ids,after){
  const shown={};
  const layoutAll=()=>draws.forEach(f=>f(shown));
  const go=()=>{ layoutAll(); after&&after();
    ids.forEach(([id,th])=>onView($('#'+id),()=>{ shown[id]=true; const f=$('#'+id)._rv; f&&f(); },th||.3));
    if(!RM && window.Lenis){ const lenis=new Lenis({lerp:.1, wheelMultiplier:.9}); const raf=t=>{ lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); } };
  let lw=innerWidth, rt; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(Math.abs(innerWidth-lw)<2) return; lw=innerWidth; layoutAll(); },180); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(go); else go();
  return shown;
}
return {RM,$,$$,fmt,pct,C,MESOS,cap,de,kParse,kMake,kAdd,kDiff,kT,kLabel,mser,mean,series,OZ,onView,CLEARS,pw,sizeOf,drawOn,crosshair,yGrid,xAxis,ann,nearest,endLabels,seg,boot};
})();
