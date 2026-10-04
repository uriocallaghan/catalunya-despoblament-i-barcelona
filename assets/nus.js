fetch("../data/nus.json").then(r=>r.json()).then(function(N){
"use strict";
const {RM,$,$$,fmt,pct,C,sizeOf,pw,drawOn,crosshair,yGrid,xAxis,ann,endLabels,seg,setClear,onView}=Comu;
const {R,RED,INK,MUTED,LINE,LAND,BG}=C;
const H=Object.fromEntries(N.hab.map(r=>[r[0],{y:r[0],ci:r[1],cl:r[2],cp:r[3],ei:r[4],el:r[5],ep:r[6]}]));
const HY=N.hab.map(r=>r[0]), HL=HY[HY.length-1];
const acabCat=y=>H[y].cl+H[y].cp, acabEs=y=>H[y].el+H[y].ep;
const sumY=(f,a,b)=>d3.sum(d3.range(a,b+1),f);
const B=Object.fromEntries(Object.entries(N.bde).map(([k,v])=>[k,new Map(v)]));
const bv=(k,y)=>B[k].get(y);
const bLast=k=>N.bde[k][N.bde[k].length-1];
const bMax=(k,a,b)=>N.bde[k].filter(p=>p[0]>=(a||0)&&p[0]<=(b||9999)).reduce((p,c)=>c[1]>p[1]?c:p);
const bMin=(k,a,b)=>N.bde[k].filter(p=>p[0]>=(a||0)&&p[0]<=(b||9999)).reduce((p,c)=>c[1]<p[1]?c:p);
const M=v=>fmt(v/1e6,2);
$('#upd').textContent=`Dades fins al ${HL}`;

/* =========== 1. HABITANTS PER HABITATGE NOU =========== */
const PER=N.pop.slice(1).map((p,i)=>{ const [a,pa]=N.pop[i], [b,pb]=p, h=sumY(acabCat,a+1,b); return {a,b,dp:pb-pa,h,r:(pb-pa)/h}; });
const P0=PER[0], PL=PER[PER.length-1];
$('#h1').textContent=`Entre el ${PL.a} i el ${PL.b}, Catalunya ha guanyat ${fmt(PL.r,0)} habitants per cada habitatge nou.`;
$('#lead').textContent=`Entre el ${P0.a} i el ${P0.b} n’era ${Math.round(P0.r)===1?'un':fmt(P0.r,0)}: la població creixia i es construïa al mateix ritme. Ara Catalunya torna a créixer molt, ${fmt(Math.round(PL.dp/1000))}.000 persones en ${PL.b-PL.a} anys, però només s’hi han acabat ${fmt(PL.h)} habitatges. La gent nova ha de cabre en els pisos que ja hi havia.`;
let per=PER.length-1;
$('#perSeg').innerHTML=PER.map((p,i)=>`<button data-pe="${i}" aria-pressed="${i===per}">${p.a}–${String(p.b).slice(2)}</button>`).join('');
const pSvg=d3.select('#per');
function drawPer(){
  const W=pw(pSvg,520), n=10, s=W/n, ds=s*.62, rows=Math.ceil(d3.max(PER,p=>Math.round(p.r*10))/n), top=s*1.15, Hh=top+rows*ds+4;
  pSvg.attr('viewBox',`0 0 ${W} ${Hh}`).attr('width',W).attr('height',Hh).selectAll('*').remove();
  pSvg.append('g').selectAll('rect').data(d3.range(10)).join('rect').attr('x',i=>i*s+s*.12).attr('y',0).attr('width',s*.76).attr('height',s*.76).attr('rx',2).attr('fill',RED);
  pSvg.append('g').attr('class','pd').selectAll('circle').data(d3.range(rows*n)).join('circle')
    .attr('cx',i=>(i%n)*s+s/2).attr('cy',i=>top+Math.floor(i/n)*ds+ds/2).attr('r',ds*.3).attr('fill','transparent');
  pSvg.append('text').attr('class','ax pneg').attr('x',W/2).attr('y',top+ds*.6).attr('text-anchor','middle').style('font-size','13px').style('display','none');
  paintPer(true);
}
function paintPer(instant){
  const p=PER[per], k=Math.max(0,Math.round(p.r*10));
  pSvg.selectAll('.pd circle').interrupt().transition().duration(instant||RM?0:220).delay(i=>instant||RM||i>=k?0:i*20).attr('fill',i=>i<k?INK:'transparent');
  pSvg.select('.pneg').style('display',p.dp<0?null:'none').text(`La població va baixar en ${fmt(-p.dp)} persones.`);
  $('#rPer').innerHTML=p.dp>=0?`<b>${p.a}–${p.b}</b>: ${fmt(p.dp)} habitants més i ${fmt(p.h)} habitatges acabats. <b>${fmt(p.r,1)} habitants per habitatge nou</b>, ${fmt(k)} per cada 10.`
    :`<b>${p.a}–${p.b}</b>: la població va baixar en ${fmt(-p.dp)} persones i es van acabar ${fmt(p.h)} habitatges.`;
}
let perUser=false;
seg('pe',v=>{ perUser=true; per=+v; paintPer(); });

/* =========== 2. LA CONSTRUCCIÓ =========== */
const CMAX=HY.reduce((p,c)=>acabCat(c)>acabCat(p)?c:p), CMIN=HY.filter(y=>y>CMAX).reduce((p,c)=>acabCat(c)<acabCat(p)?c:p);
const pMax=HY.reduce((p,c)=>H[c].cp>H[p].cp?c:p), avg90=d3.mean(d3.range(1991,2001),acabCat);
const cost0=bv('cost_construccio',2021), costL=bLast('cost_construccio');
$('#buildTitle').textContent=`El ${CMAX} es van acabar ${fmt(acabCat(CMAX))} habitatges a Catalunya. El ${HL}, ${fmt(acabCat(HL))}.`;
$('#buildLede').textContent=`Després de la bombolla, la construcció es va aturar gairebé del tot: el ${CMIN} se’n van acabar ${fmt(acabCat(CMIN))}. S’ha refet a poc a poc, però el ${HL} encara és ${fmt(acabCat(CMAX)/acabCat(HL),1)} vegades per sota del màxim i menys de la meitat de la mitjana dels anys noranta (${fmt(Math.round(avg90/100)*100)} l’any). L’habitatge protegit, que el ${pMax} va arribar a ${fmt(H[pMax].cp)}, el ${HL} va ser de ${fmt(H[HL].cp)}. I construir és més car: l’índex de costos de la construcció és un ${pct(costL[1]/cost0-1,0)} més alt que el 2021.`;
$('#buildNote').textContent=`Cada quadrat és mil habitatges acabats en un any. Habitatge lliure: estimació del Ministeri d’Habitatge i Agenda Urbana. Protegit: qualificacions definitives. Costos: índex de costos de la construcció d’edificis, mà d’obra i materials (base 2021), mitjana del ${costL[0]}, Espanya.`;
let by=HL, bTimer=null;
const bSvg=d3.select('#build');
function drawBuild(){
  const [W]=sizeOf(bSvg,420,1,0,9999); const s=W/10; bSvg.attr('height',W).attr('viewBox',`0 0 ${W} ${W}`);
  bSvg.selectAll('rect').data(d3.range(100)).join('rect').attr('x',i=>(i%10)*s+1.5).attr('y',i=>(9-Math.floor(i/10))*s+1.5).attr('width',s-3).attr('height',s-3).attr('rx',2).attr('fill',LAND);
  paintBuild(true);
}
function paintBuild(instant){
  const h=H[by], np=Math.round(h.cp/1000), nl=Math.round(acabCat(by)/1000)-np;
  bSvg.selectAll('rect').transition().duration(instant||RM?0:200).attr('fill',i=>i<np?R[6]:i<np+nl?RED:LAND);
  $('#buildYr').textContent=by; $('#buildT').value=by;
  $('#rBuild').innerHTML=`<b>${by}</b>: ${fmt(acabCat(by))} habitatges acabats, ${fmt(h.cl)} lliures i ${fmt(h.cp)} protegits. <span class="m">Habitatges lliures iniciats aquell any: ${fmt(h.ci)}.</span>`;
}
function playBuild(){
  const b=$('#buildPlay');
  if(bTimer){ bTimer.stop(); bTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); return; }
  if(by===HL) by=HY[0]; const y0=by, t0=performance.now(), dur=RM?0:(HL-y0)*260; b.textContent='❚❚'; b.setAttribute('aria-pressed',true);
  bTimer=d3.timer(()=>{ const k=dur?Math.min(1,(performance.now()-t0)/dur):1, ny=Math.round(y0+(HL-y0)*k); if(ny!==by){ by=ny; paintBuild(); } if(k>=1){ bTimer.stop(); bTimer=null; b.textContent='▶'; b.setAttribute('aria-pressed',false); } });
}
$('#buildT').min=HY[0]; $('#buildT').max=HL;
$('#buildT').addEventListener('input',e=>{ if(bTimer) playBuild(); by=+e.target.value; paintBuild(); });
$('#buildPlay').addEventListener('click',playBuild);

/* =========== 3. LLARS I HABITATGES, ESPANYA =========== */
const LL=B.llars_milers, LY=N.bde.llars_milers.map(p=>p[0]).filter(y=>H[y]), LY0=LY[0], LYL=LY[LY.length-1];
const HHP=[[LY0,2008,'bombolla'],[2008,2014,'crisi'],[2014,2021,'recuperació'],[2021,LYL,'ara']].map(([a,b,n])=>({a,b,n,l:(LL.get(b)-LL.get(a))*1000,h:sumY(acabEs,a+1,b)}));
const hL=HHP[HHP.length-1], h0=HHP[0];
$('#hhTitle').textContent=`Des del ${hL.a}, Espanya ha sumat ${M(hL.l)} milions de llars i ha acabat ${M(hL.h)} milions d’habitatges`;
$('#hhLede').textContent=`És a dir, ${fmt(hL.l/hL.h,1)} llars noves per cada habitatge nou. Per al preu, més que les persones compten les llars: cada habitatge n’acull una. Durant la bombolla va passar al revés: entre el ${h0.a+1} i el ${h0.b} es van acabar ${M(h0.h)} milions d’habitatges per ${M(h0.l)} milions de llars noves. Aquell excedent es va anar absorbint durant la crisi i la recuperació; ara s’ha esgotat, sobretot on hi ha la feina.`;
function drawHh(shown){
  const svg=d3.select('#hh'); const [W,Ht]=sizeOf(svg,697,.5,260,360); const t=24,b=40;
  const x=d3.scaleBand().domain(HHP.map((d,i)=>i)).range([0,W]).paddingInner(.3).paddingOuter(.1), xi=d3.scaleBand().domain([0,1]).range([0,x.bandwidth()]).padding(.08);
  const ymax=Math.ceil(d3.max(HHP,d=>Math.max(d.l,d.h))/1e6); const y=d3.scaleLinear().domain([0,ymax*1e6]).range([Ht-b,t]);
  yGrid(svg,y,0,W,d3.range(0,ymax*1e6+1,1e6),v=>v?fmt(v/1e6)+(v===ymax*1e6?' milions':''):'0');
  const g=svg.append('g').selectAll('g').data(HHP).join('g').attr('class','rent-b').attr('transform',(d,i)=>`translate(${x(i)},0)`);
  const bars=[['l',INK],['h',RED]].map(([k,c],j)=>g.append('rect').attr('x',xi(j)).attr('width',xi.bandwidth()).attr('rx',2).attr('fill',c)
    .attr('y',d=>shown.hh?y(Math.max(0,d[k])):y(0)).attr('height',d=>shown.hh?y(0)-y(Math.max(0,d[k])):0).attr('data-k',k));
  const labs=['l','h'].map((k,j)=>g.append('text').attr('class','lab').attr('x',xi(j)+xi.bandwidth()/2).attr('y',d=>y(Math.max(0,d[k]))-6).attr('text-anchor','middle').style('font-size',W<500?'10px':null)
    .text(d=>fmt(d[k]/1e6,2)).attr('opacity',shown.hh?1:0));
  g.append('text').attr('class','ax').attr('x',x.bandwidth()/2).attr('y',Ht-b+15).attr('text-anchor','middle').text(d=>`${d.a+1}–${d.b}`);
  g.append('text').attr('class','ax').attr('x',x.bandwidth()/2).attr('y',Ht-b+29).attr('text-anchor','middle').text(d=>d.n);
  svg.node()._rv=()=>{ bars.forEach((r,j)=>r.transition().delay((d,i)=>RM?0:i*250+j*120).duration(700).ease(d3.easeCubicOut).attr('y',function(d){ return y(Math.max(0,d[this.dataset.k])); }).attr('height',function(d){ return y(0)-y(Math.max(0,d[this.dataset.k])); }));
    labs.forEach(l=>l.transition().delay(RM?0:1300).attr('opacity',1)); };
  const R0='<span class="m">Toca un període.</span>';
  const sel=d=>{ g.attr('opacity',o=>o===d?1:.4); $('#rHh').innerHTML=`<b>${d.a+1}–${d.b}</b>: ${fmt(Math.round(d.l/1000))}.000 llars noves i ${fmt(Math.round(d.h/1000))}.000 habitatges acabats. ${d.l>d.h?`<b>${fmt(d.l/d.h,1)} llars per habitatge.</b>`:`<b>${fmt(d.h/d.l,1)} habitatges per llar.</b>`}`; };
  const clear=()=>{ g.attr('opacity',1); $('#rHh').innerHTML=R0; };
  g.on('pointerenter',(e,d)=>sel(d)).on('click',(e,d)=>sel(d)); svg.on('pointerleave',e=>{ if(e.pointerType==='mouse') clear(); }); setClear(svg.node(),clear);
  $('#rHh').innerHTML=R0;
}

/* =========== 4. CRÈDIT I PREU =========== */
const PRI=N.bde.preu_renda_anys, CRE=N.bde.credit_habitatge_pib;
const cMax=bMax('credit_habitatge_pib'), cL=bLast('credit_habitatge_pib'), prMax=bMax('preu_renda_anys'), prMin=bMin('preu_renda_anys',2009), prL=bLast('preu_renda_anys');
$('#credTitle').textContent=`El deute per comprar habitatge ha baixat del ${fmt(cMax[1],0)}% al ${fmt(cL[1],0)}% del PIB. El preu, en anys de renda, torna a pujar.`;
$('#credLede').textContent=`Durant la bombolla, el preu i el deute hipotecari van créixer junts: el pis va arribar a costar ${fmt(prMax[1],1)} anys de la renda bruta d’una llar mitjana el ${prMax[0]}, i el saldo de les hipoteques, el ${fmt(cMax[1],0)}% del PIB el ${cMax[0]}. Des del ${prMin[0]}, el preu ha tornat a pujar, de ${fmt(prMin[1],1)} a ${fmt(prL[1],1)} anys de renda el ${prL[0]}, mentre que el deute hipotecari, en proporció a l’economia, ha baixat a menys de la meitat. Aquesta pujada no ve, com la del 2007, d’un endeutament creixent de les famílies.`;
function drawCred(shown){
  const svg=d3.select('#cred'); const [W,Ht]=sizeOf(svg,697,.72,380,520); const rp=W<500?44:60, gap=44, t=30;
  const ph=(Ht-t-gap-24)/2, y1t=t, y1b=t+ph, y2t=y1b+gap, y2b=y2t+ph;
  const x=d3.scaleLinear().domain([PRI[0][0],prL[0]]).range([0,W-rp]);
  const ya=d3.scaleLinear().domain([0,10]).range([y1b,y1t]), yb=d3.scaleLinear().domain([0,70]).range([y2b,y2t]);
  yGrid(svg,ya,0,W-rp,[0,5,10],v=>v?v+(v===10?' anys':''):'0');
  yGrid(svg,yb,0,W-rp,[0,35,70],v=>v?v+'%':'0');
  svg.append('text').attr('class','lab').attr('x',0).attr('y',y1t-18).style('fill',RED).text(W<500?'Preu, en anys de renda d’una llar':'Preu d’un habitatge, en anys de renda d’una llar');
  svg.append('text').attr('class','lab').attr('x',0).attr('y',y2t-18).text(W<500?'Deute hipotecari, % del PIB':'Deute hipotecari de les llars, en % del PIB');
  xAxis(svg,x,y2b,W<500?[1990,2005,2020]:[1990,1995,2000,2005,2010,2015,2020,2025]);
  const pa=svg.append('path').attr('class','line').attr('d',d3.line().x(p=>x(p[0])).y(p=>ya(p[1]))(PRI)).attr('stroke',RED).attr('stroke-width',2.6);
  const pb=svg.append('path').attr('class','line').attr('d',d3.line().x(p=>x(p[0])).y(p=>yb(p[1]))(CRE)).attr('stroke',INK).attr('stroke-width',2.4);
  const L=[svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',ya(prL[1])).attr('dy','.35em').style('fill',RED).text(fmt(prL[1],1)),
    svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',yb(cL[1])).attr('dy','.35em').text(fmt(cL[1],0)+'%')];
  [[prMax,ya,RED,1,''],[cMax,yb,INK,0,'%']].forEach(([p,yy,c,d,u])=>svg.append('text').attr('class','lab').attr('x',x(p[0])).attr('y',yy(p[1])-8).attr('text-anchor','middle').style('fill',c).text(fmt(p[1],d)+u));
  if(!shown.cred){ [pa,pb,...L].forEach(p=>p.attr('opacity',0)); svg.node()._rv=()=>{ pa.attr('opacity',1); pb.attr('opacity',1); drawOn(pa,1600); drawOn(pb,1600,250); L.forEach(l=>l.transition().delay(RM?0:1800).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,y1t,y2b,xv=>{ const yy=Math.round(xv), a=bv('preu_renda_anys',yy), c=bv('credit_habitatge_pib',yy);
    d1.style('display',a==null?'none':null).attr('cx',x(yy)).attr('cy',ya(a||0)); d2.style('display',c==null?'none':null).attr('cx',x(yy)).attr('cy',yb(c||0));
    $('#rCred').innerHTML=`<b>${yy}</b>: el pis costava <b>${fmt(a,1)} anys</b> de renda d’una llar`+(c!=null?`; el deute hipotecari era el <b>${fmt(c,0)}%</b> del PIB.`:'.'); return yy; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rCred').innerHTML=R0; });
  $('#rCred').innerHTML=R0;
}

/* =========== 5. TIPUS: LA QUOTA I EL PREU =========== */
const ESF=N.bde.esforc_teoric;
const yA=2000, yB=bMin('tipus_hipoteca',2009)[0], tMax=bMax('tipus_hipoteca',2022), esMax=bMax('esforc_teoric',2000,2010), esMin=bMin('esforc_teoric',2009,2021), esL=bLast('esforc_teoric'), es2=bMax('esforc_teoric',2022);
$('#rateTitle').textContent=`El ${yB} el pis costava ${fmt(bv('preu_renda_anys',yB),1)} anys de renda, i el ${yA}, ${fmt(bv('preu_renda_anys',yA),1)}. La quota del primer any, en canvi, s’emportava el mateix: un ${fmt(bv('esforc_teoric',yB),0)}% de la renda.`;
$('#rateLede').textContent=`La diferència la fan els tipus d’interès. El ${yA}, una hipoteca nova pagava de mitjana un ${fmt(bv('tipus_hipoteca',yA),1)}%; el ${yB}, un ${fmt(bv('tipus_hipoteca',yB),1)}%. Els tipus baixos van fer pagable un preu més alt. Quan el ${tMax[0]} van pujar al ${fmt(tMax[1],1)}%, la quota del primer any va passar del ${fmt(esMin[1],0)}% al ${fmt(es2[1],0)}% de la renda sense que el preu baixés. El ${esL[0]}, ${fmt(esL[1],0)}%. En plena bombolla, el ${esMax[0]}, va arribar al ${fmt(esMax[1],0)}%.`;
let rMode='esf';
function drawRate(shown){
  const svg=d3.select('#rate'); const [W,Ht]=sizeOf(svg,697,.56,280,400); const t=18,b=24,rp=W<500?52:70;
  const E=rMode==='esf', S=E?ESF:PRI, ymax=E?80:10;
  const x=d3.scaleLinear().domain([S[0][0],S[S.length-1][0]]).range([0,W-rp]), y=d3.scaleLinear().domain([0,ymax]).range([Ht-b,t]);
  yGrid(svg,y,0,W-rp,E?[0,20,40,60,80]:[0,2,4,6,8,10],v=>v?v+(v===ymax?(E?'% de la renda':' anys de renda'):''):'0');
  xAxis(svg,x,Ht-b,W<500?[1990,2005,2020]:[1990,1995,2000,2005,2010,2015,2020,2025]);
  ann(svg,x,t,Ht-b,yA,String(yA)); ann(svg,x,t,Ht-b,yB,String(yB),true);
  const area=svg.append('path').attr('d',d3.area().x(p=>x(p[0])).y0(Ht-b).y1(p=>y(p[1]))(S)).attr('fill',R[0]);
  const p=svg.append('path').attr('class','line').attr('d',d3.line().x(p=>x(p[0])).y(p=>y(p[1]))(S)).attr('stroke',RED).attr('stroke-width',2.6);
  const e=S[S.length-1], el=svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',y(e[1])).attr('dy','.35em').style('fill',RED).text(fmt(e[1],E?0:1)+(E?'%':''));
  svg.selectAll('text.ax').raise();
  const pts=[yA,yB].map(yy=>svg.append('circle').attr('cx',x(yy)).attr('cy',y(S.find(q=>q[0]===yy)[1])).attr('r',4.5).attr('fill',RED).attr('stroke',BG).attr('stroke-width',1.5));
  if(!shown.rate){ [p,area,el,...pts].forEach(q=>q.attr('opacity',0)); svg.node()._rv=()=>{ p.attr('opacity',1); drawOn(p,1700); [area,el,...pts].forEach(q=>q.transition().delay(RM?0:1600).duration(500).attr('opacity',1)); }; }
  const dot=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,Ht-b,xv=>{ const yy=Math.round(xv), q=S.find(q=>q[0]===yy); if(!q) return null; dot.style('display',null).attr('cx',x(yy)).attr('cy',y(q[1]));
    const ti=bv('tipus_hipoteca',yy);
    $('#rRate').innerHTML=`<b>${yy}</b>: el pis costava ${fmt(bv('preu_renda_anys',yy),1)} anys de renda i la quota del primer any, el <b>${fmt(bv('esforc_teoric',yy),0)}%</b> de la renda.`+(ti!=null?` <span class="m">Tipus de les hipoteques noves: ${fmt(ti,1)}%.</span>`:''); return yy; },
    ()=>{ dot.style('display','none'); $('#rRate').innerHTML=R0; });
  $('#rRate').innerHTML=R0;
}
seg('rm',v=>{ rMode=v; drawRate({rate:true}); });

/* =========== 6. EL PIS COM A INVERSIÓ =========== */
const YI=N.bde.rendibilitat_lloguer.filter(p=>bv('diposit_1_2_anys',p[0])!=null).map(p=>({y:p[0],r:p[1],d:bv('diposit_1_2_anys',p[0])}));
const yg=YI.reduce((p,c)=>c.r-c.d>p.r-p.d?c:p), yL=YI[YI.length-1];
$('#yieldTitle').textContent=`El ${yg.y}, un pis llogat rendia un ${fmt(yg.r,1)}% brut l’any. Un dipòsit, un ${fmt(yg.d,2)}%.`;
$('#yieldLede').textContent=`Amb els tipus a zero, guardar estalvis al banc no rendia gairebé res, i comprar un pis per llogar-lo rendia molt més, sense comptar que el pis també es revalorava. Per a qui tenia estalvis o patrimoni, l’habitatge es va convertir en la inversió òbvia, i aquesta demanda competeix amb la de qui busca on viure. El ${yL.y} la distància s’ha escurçat: ${fmt(yL.r,1)}% del lloguer davant d’un ${fmt(yL.d,1)}% del dipòsit.`;
function drawYield(shown){
  const svg=d3.select('#yield'); const [W,Ht]=sizeOf(svg,697,.52,260,380); const t=18,b=24,rp=W<500?84:120;
  const x=d3.scaleLinear().domain([YI[0].y,yL.y]).range([0,W-rp]), y=d3.scaleLinear().domain([0,10]).range([Ht-b,t]);
  yGrid(svg,y,0,W-rp,[0,2,4,6,8,10],v=>v?v+'%'+(v===10?' l’any':''):'0');
  xAxis(svg,x,Ht-b,W<500?[2005,2015,2025]:d3.range(2005,yL.y+1,5));
  const gap=svg.append('path').attr('d',d3.area().x(d=>x(d.y)).y0(d=>y(d.d)).y1(d=>y(d.r))(YI)).attr('fill',R[0]);
  const pr=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d.r))(YI)).attr('stroke',RED).attr('stroke-width',2.6);
  const pd=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d.d))(YI)).attr('stroke',INK).attr('stroke-width',2);
  svg.selectAll('text.ax').raise();
  const L=endLabels(svg,[{y:y(yL.r),c:RED,n:W<500?'lloguer':'lloguer brut',v:fmt(yL.r,1)+'%'},{y:y(yL.d),c:INK,n:'dipòsit',v:fmt(yL.d,1)+'%'}],W-rp+8,15,shown.yield);
  if(!shown.yield){ [pr,pd,gap].forEach(p=>p.attr('opacity',0)); svg.node()._rv=()=>{ pr.attr('opacity',1); pd.attr('opacity',1); drawOn(pr,1500); drawOn(pd,1500,200); gap.transition().delay(RM?0:1500).duration(700).attr('opacity',1); L.forEach(l=>l.transition().delay(RM?0:1700).attr('opacity',1)); }; }
  const d1=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none'), d2=svg.append('circle').attr('r',4).attr('fill',INK).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,Ht-b,xv=>{ const d=YI.find(o=>o.y===Math.round(xv)); if(!d) return null; d1.style('display',null).attr('cx',x(d.y)).attr('cy',y(d.r)); d2.style('display',null).attr('cx',x(d.y)).attr('cy',y(d.d));
    $('#rYield').innerHTML=`<b>${d.y}</b>: lloguer brut <b>${fmt(d.r,1)}%</b>, dipòsit ${fmt(d.d,2)}%. <span class="m">${fmt(d.r-d.d,1)} punts de diferència.</span>`; return d.y; },
    ()=>{ d1.style('display','none'); d2.style('display','none'); $('#rYield').innerHTML=R0; });
  $('#rYield').innerHTML=R0;
}

/* =========== 7. LLOGUER SOCIAL =========== */
const CN={'Netherlands':'Països Baixos','Austria':'Àustria','Denmark':'Dinamarca','United Kingdom (England)':'Anglaterra','France':'França','Ireland':'Irlanda','Finland':'Finlàndia','Belgium':'Bèlgica','Germany':'Alemanya','Italy':'Itàlia','Spain':'Espanya','Portugal':'Portugal'};
const SOC=N.social.filter(r=>CN[r[0]]).map(r=>({k:r[0],n:CN[r[0]],y:r[1],v:r[2]})).sort((a,b)=>b.v-a.v);
const sNL=SOC[0], sES=SOC.find(s=>s.k==='Spain'), sDE=SOC.find(s=>s.k==='Germany'), sFR=SOC.find(s=>s.k==='France');
$('#socTitle').textContent=`De cada 100 habitatges, als ${sNL.n} ${fmt(Math.round(sNL.v))} són de lloguer social. A Espanya, ${fmt(Math.round(sES.v))}.`;
$('#socLede').textContent=`Un parc gran de lloguer social, amb preus lligats als ingressos, dona alternativa a qui no pot pagar el mercat i en treu pressió. Espanya va construir molt habitatge protegit, però sobretot de venda i amb una protecció que caducava, de manera que bona part ha acabat al mercat lliure. Amb un ${fmt(sES.v,1)}% del parc, és dels països de l’OCDE amb menys lloguer social: Alemanya en té el ${fmt(sDE.v,1)}% i França, el ${fmt(sFR.v,0)}%.`;
$('#soc').innerHTML=SOC.map(s=>{ const n=Math.round(s.v), GD=11, w=10*GD;
  const sq=d3.range(100).map(i=>`<rect x="${(i%10)*GD+1}" y="${Math.floor(i/10)*GD+1}" width="${GD-2}" height="${GD-2}" rx="1.5" fill="${LAND}" data-on="${i<n?1:0}"/>`).join('');
  return `<div class="gc"><h3${s.k==='Spain'?' style="color:var(--red)"':''}>${s.n}</h3><div class="pc">${fmt(s.v,s.v<10?1:0)}%</div><div class="yrs">del parc (${s.y})</div><svg width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" aria-hidden="true">${sq}</svg></div>`; }).join('');
$$('#soc .gc').forEach(el=>onView(el,()=>{ el.querySelectorAll('rect[data-on="1"]').forEach((r,i)=>setTimeout(()=>r.setAttribute('fill',RED),RM?0:200+i*22)); },.5));
$('#rSoc').innerHTML=`Cada quadrat és un habitatge de cada cent. <span class="m">En vermell, els de lloguer social.</span>`;

/* =========== 8. QUI LLOGA =========== */
const AG=[['15 to 29 years','15–29 anys',R[3]],['30 to 49 years','30–49 anys',RED],['50 to 64 years','50–64 anys',MUTED],['65 or more years','65 anys o més',INK]];
const tSer=(age,mode)=>{ const T=N.ten[age]; if(mode!=='own') return T[mode]; const a=new Map(T['Own outright']); return T['Owner with mortgage'].map(([y,v])=>[y,v+a.get(y)]); };
const rp30=tSer('30 to 49 years','Rent (private)'), o30=tSer('30 to 49 years','own'), o65=tSer('65 or more years','own');
$('#tenTitle').textContent=`A Espanya, la gent de 30 a 49 anys que viu de lloguer privat ha passat del ${fmt(rp30[0][1],0)}% al ${fmt(rp30[rp30.length-1][1],0)}%`;
$('#tenLede').textContent=`Entre el ${rp30[0][0]} i el ${rp30[rp30.length-1][0]}, a l’edat en què abans es comprava el primer pis. En el mateix temps, la part d’aquesta franja que viu en un habitatge de propietat ha baixat del ${fmt(o30[0][1],0)}% al ${fmt(o30[o30.length-1][1],0)}%, mentre que entre els més grans de 65 anys gairebé no s’ha mogut (${fmt(o65[o65.length-1][1],0)}%). Qui ja tenia casa abans de la pujada la conserva; qui arriba ara, lloga, i competeix per un parc de lloguer que no creix al mateix ritme.`;
let tMode='Rent (private)';
function drawTen(shown){
  const svg=d3.select('#ten'); const [W,Ht]=sizeOf(svg,697,.54,270,390); const t=18,b=24,rp=W<500?96:124;
  const S=AG.map(([k,n,c])=>({k,n,c,pts:tSer(k,tMode)}));
  const x=d3.scaleLinear().domain(d3.extent(S[0].pts,p=>p[0])).range([0,W-rp]), y=d3.scaleLinear().domain(tMode==='own'?[40,100]:[0,40]).range([Ht-b,t]);
  yGrid(svg,y,0,W-rp,tMode==='own'?[40,60,80,100]:[0,10,20,30,40],v=>v+'%');
  xAxis(svg,x,Ht-b,W<500?[2010,2017,2024]:d3.range(2010,2025,2));
  const ps=S.map(s=>{ const p=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d[0])).y(d=>y(d[1]))(s.pts)).attr('stroke',s.c).attr('stroke-width',s.c===RED?2.8:1.8); if(!shown.ten) p.attr('opacity',0); return p; });
  const L=endLabels(svg,S.map(s=>{ const e=s.pts[s.pts.length-1]; return {y:y(e[1]),c:s.c,n:W<500?s.n.replace(' anys o més','+').replace(' anys',''):s.n,v:fmt(e[1],0)+'%'}; }),W-rp+8,15,shown.ten);
  svg.node()._rv=()=>{ ps.forEach((p,i)=>{ p.attr('opacity',1); drawOn(p,1400,i*180); }); L.forEach(l=>l.transition().delay(RM?0:1700).attr('opacity',1)); };
  const dots=S.map(s=>svg.append('circle').attr('r',3.5).attr('fill',s.c).style('display','none'));
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,Ht-b,xv=>{ const yy=Math.round(xv); const out=S.map((s,i)=>{ const p=s.pts.find(p=>p[0]===yy); if(!p) return ''; dots[i].style('display',null).attr('cx',x(yy)).attr('cy',y(p[1])); return `${s.n} <b>${fmt(p[1],0)}%</b>`; }).filter(Boolean);
    $('#rTen').innerHTML=`<b>${yy}</b>, ${tMode==='own'?'en un habitatge de propietat':'de lloguer privat'}: `+out.join(' · '); return yy; },
    ()=>{ dots.forEach(d=>d.style('display','none')); $('#rTen').innerHTML=R0; });
  $('#rTen').innerHTML=R0;
}
seg('tn',v=>{ tMode=v; drawTen({ten:true}); });

/* =========== 9. SOBRECÀRREGA =========== */
const TN=[['RENT_MKT','Lloga a preu de mercat'],['RENT_FR','Lloga a preu reduït'],['OWN_ML','Propietari amb hipoteca'],['OWN_NL','Propietari sense hipoteca']];
const ob=(g,k,y)=>{ const s=(N.sob[g]||{})[k]; const p=s&&s.find(p=>p[0]===y); return p?p[1]:null; };
const OY=N.sob.ES.RENT_MKT.map(p=>p[0]), OYL=OY[OY.length-1], obMax=N.sob.ES.RENT_MKT.reduce((p,c)=>c[1]>p[1]?c:p);
$('#obTitle').textContent=`De cada 100 persones que lloguen a preu de mercat, ${fmt(Math.round(ob('ES','RENT_MKT',OYL)))} destinen més del 40% de la renda a l’habitatge. Dels propietaris sense hipoteca, ${fmt(Math.round(ob('ES','OWN_NL',OYL)))}.`;
$('#obLede').textContent=`És la dada d’Espanya del ${OYL}. El preu alt pesa sobretot sobre qui encara no té casa: entre els llogaters a preu de mercat, la proporció va arribar al ${fmt(obMax[1],1)}% el ${obMax[0]} i a la Unió Europea, el ${OYL}, era del ${fmt(ob('EU27_2020','RENT_MKT',OYL),1)}%. Entre els propietaris, sobretot els que ja tenen el pis pagat, la sobrecàrrega gairebé no existeix.`;
let oy=OYL, obShown=false;
$('#obT').min=OY[0]; $('#obT').max=OYL; $('#obT').value=oy;
$('#ob').innerHTML=TN.map(([k,n])=>{ const GD=11, w=10*GD;
  const dots=d3.range(100).map(i=>`<circle cx="${(i%10)*GD+GD/2}" cy="${Math.floor(i/10)*GD+GD/2}" r="4" fill="transparent" stroke="${MUTED}" stroke-width="1.2" opacity=".55"/>`).join('');
  return `<div class="gc" data-k="${k}"><h3>${n}</h3><div class="pc">0%</div><div class="yrs"></div><svg class="w" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" aria-hidden="true">${dots}</svg></div>`; }).join('');
function paintOb(){ $('#obYr').textContent=oy; $('#obT').value=oy;
  $$('#ob .gc').forEach(el=>{ const k=el.dataset.k, v=ob('ES',k,oy), eu=ob('EU27_2020',k,oy), n=obShown&&v!=null?Math.round(v):0;
    el.querySelector('.pc').textContent=v==null?'–':fmt(v,1)+'%'; el.querySelector('.yrs').textContent=eu!=null?`(UE: ${fmt(eu,1)}%)`:'';
    el.querySelectorAll('circle').forEach((c,i)=>{ c.setAttribute('fill',i<n?RED:'transparent'); c.setAttribute('stroke',i<n?RED:MUTED); c.setAttribute('opacity',i<n?1:.55); }); });
  $('#rOb').innerHTML=`<b>${oy}</b>: cada cercle és una persona de cada cent. <span class="m">En vermell, les que destinen més del 40% de la renda disponible a l’habitatge.</span>`; }
$('#obT').addEventListener('input',e=>{ oy=+e.target.value; paintOb(); });
onView($('#ob'),()=>{ obShown=true; paintOb(); },.4);
paintOb();

/* =========== 10. REAL I NOMINAL =========== */
const BI=N.bis.map(r=>({y:r[0],n:r[1],r:r[2]})), b07=BI.find(d=>d.y===2007), bL=BI[BI.length-1];
BI.forEach(d=>{ d.nn=d.n/b07.n*100; d.rr=d.r/b07.r*100; });
$('#realTitle').textContent= bL.rr<100 ? `Descomptant la inflació, el pis a Espanya encara val un ${pct(1-bL.rr/100,0)} menys que el 2007` : `Descomptant la inflació, el pis a Espanya ja val més que el 2007`;
$('#realLede').textContent=`En euros de cada any, el preu ja supera el màxim de la bombolla en un ${pct(bL.nn/100-1,0)}. Però els preus de consum també han pujat, i en termes reals la pujada d’ara és més suau que la d’abans del 2007. Que el preu mitjà encara no hagi recuperat el màxim real no vol dir que comprar sigui fàcil: la barrera és l’entrada que cal reunir, i el lloguer que cal pagar mentrestant.`;
let bMode='real';
function drawBis(shown){
  const svg=d3.select('#bis'); const [W,Ht]=sizeOf(svg,697,.56,280,400); const t=18,b=24,rp=W<500?44:56;
  const k=bMode==='real'?'rr':'nn', o=k==='rr'?'nn':'rr', ymax=Math.ceil(d3.max(BI,d=>Math.max(d.rr,d.nn))/20)*20;
  const x=d3.scaleLinear().domain([BI[0].y,bL.y]).range([0,W-rp]), y=d3.scaleLinear().domain([0,ymax]).range([Ht-b,t]);
  yGrid(svg,y,0,W-rp,d3.range(0,ymax+1,20),v=>v===100?'2007 = 100':v?String(v):'0');
  svg.select('.grid').selectAll('line').filter(function(){ return Math.abs(+this.getAttribute('y1')-y(100))<.5; }).style('stroke',MUTED);
  xAxis(svg,x,Ht-b,W<500?[1975,2000,2025]:[1975,1985,1995,2005,2015,2025]);
  const ghost=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d[o]))(BI)).attr('stroke',LINE).attr('stroke-width',1.6);
  const p=svg.append('path').attr('class','line').attr('d',d3.line().x(d=>x(d.y)).y(d=>y(d[k]))(BI)).attr('stroke',RED).attr('stroke-width',2.6);
  const el=svg.append('text').attr('class','endlab').attr('x',W-rp+6).attr('y',y(bL[k])).attr('dy','.35em').style('fill',RED).text(fmt(bL[k],0));
  const g90=BI.find(d=>d.y===1990);
  svg.append('text').attr('class','ax').attr('x',x(1990)).attr('y',y(g90[o])+(g90[o]<g90[k]?16:-10)).attr('text-anchor','middle').text(k==='rr'?'en euros de cada any':'descomptant la inflació');
  if(!shown.bis){ p.attr('opacity',0); el.attr('opacity',0); svg.node()._rv=()=>{ p.attr('opacity',1); drawOn(p,1700); el.transition().delay(RM?0:1700).attr('opacity',1); }; }
  const dot=svg.append('circle').attr('r',4).attr('fill',RED).style('display','none');
  const R0='<span class="m">Toca el gràfic.</span>';
  crosshair(svg,x,t,Ht-b,xv=>{ const d=BI.find(o=>o.y===Math.round(xv)); if(!d) return null; dot.style('display',null).attr('cx',x(d.y)).attr('cy',y(d[k]));
    $('#rBis').innerHTML=`<b>${d.y}</b>: ${fmt(d.nn,0)} en euros de cada any i <b>${fmt(d.rr,0)}</b> descomptant la inflació <span class="m">(2007 = 100)</span>.`; return d.y; },
    ()=>{ dot.style('display','none'); $('#rBis').innerHTML=R0; });
  $('#rBis').innerHTML=R0;
}
seg('bm',v=>{ bMode=v; drawBis({bis:true}); });

/* =========== 11. AIRBNB =========== */
const AB=N.estudis.map(r=>({m:r[0],a:r[1],v:r[2]}));
const abR=AB.filter(d=>d.m==='lloguer'), abP=AB.filter(d=>d.m==='preu de compra');
$('#abTitle').textContent=`Airbnb va encarir el lloguer un ${fmt(abR[0].v,1)}% al barri mitjà de Barcelona i un ${fmt(abR[1].v,0)}% als més turístics`;
$('#abLede').textContent=`Els pisos turístics són un fil real, però local. Un estudi amb dades de tots els barris de Barcelona estima que l’activitat d’Airbnb va fer pujar el lloguer un ${fmt(abR[0].v,1)}% de mitjana i el preu de compra un ${fmt(abP[0].v,1)}%. Als barris on més se n’hi concentren, l’efecte es multiplica: ${fmt(abR[1].v,0)}% i ${fmt(abP[1].v,0)}%. Pesa molt al centre i poc a la perifèria: no explica per si sol que el lloguer pugi a tota l’àrea metropolitana.`;
function drawAb(shown){
  const svg=d3.select('#ab'); const W=pw(svg,560), rh=44, lw=W<420?126:180, t=4, Ht=t+AB.length*rh+26;
  svg.attr('viewBox',`0 0 ${W} ${Ht}`).attr('width',W).attr('height',Ht).selectAll('*').remove();
  const x=d3.scaleLinear().domain([0,20]).range([lw,W-44]);
  [0,5,10,15,20].forEach(v=>{ svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',t).attr('y2',Ht-22).attr('stroke',LINE); svg.append('text').attr('class','ax').attr('x',x(v)).attr('y',Ht-6).attr('text-anchor','middle').text(v?'+'+v+'%':'0'); });
  const g=svg.append('g').selectAll('g').data(AB).join('g').attr('transform',(d,i)=>`translate(0,${t+i*rh})`);
  g.append('text').attr('class','ax').attr('x',lw-10).attr('y',rh/2-6).attr('text-anchor','end').style('fill',INK).style('font-size','12.5px').style('font-weight',600).text(d=>d.m==='lloguer'?'Lloguer':'Preu de compra');
  g.append('text').attr('class','ax').attr('x',lw-10).attr('y',rh/2+8).attr('text-anchor','end').style('font-size','11px').text(d=>d.a.startsWith('barri')?'barri mitjà':(W<420?'10% més turístic':'10% de barris més turístics'));
  const bars=g.append('rect').attr('x',x(0)).attr('y',rh*.2).attr('height',rh*.6).attr('rx',2).attr('fill',d=>d.a.startsWith('barri')?R[2]:RED).attr('width',d=>shown.ab?x(d.v)-x(0):0);
  const lab=g.append('text').attr('class','lab').attr('x',d=>x(d.v)+6).attr('y',rh/2).attr('dy','.35em').text(d=>'+'+fmt(d.v,d.v<10?1:0)+'%').attr('opacity',shown.ab?1:0);
  svg.node()._rv=()=>{ bars.transition().delay((d,i)=>RM?0:i*180).duration(800).ease(d3.easeCubicOut).attr('width',d=>x(d.v)-x(0)); lab.transition().delay((d,i)=>RM?0:600+i*180).attr('opacity',1); };
  $('#rAb').innerHTML=`<span class="m">Efecte estimat de l’activitat d’Airbnb, no la pujada total del preu.</span>`;
}

/* ---------- tancament ---------- */
$('#close1').textContent=`L’encariment no s’explica amb una sola causa. Catalunya suma gent molt més de pressa que habitatges, ${fmt(PL.r,1)} habitants per cada pis acabat entre el ${PL.a} i el ${PL.b}, i la construcció continua lluny del que era. Els tipus d’interès baixos van fer pagable un preu més alt i van convertir el pis en la inversió més rendible per a qui tenia estalvis. I quan els tipus han pujat, el preu no ha baixat: aquesta vegada no l’empeny el deute.`;
$('#close2').textContent=`El pes recau sobre qui encara no té casa. Amb un parc de lloguer social de l’${fmt(sES.v,1)}%, qui no pot comprar ha de llogar al mercat, on ${fmt(Math.round(ob('ES','RENT_MKT',OYL)))} de cada 100 llogaters ja destinen més del 40% de la renda a l’habitatge. Els pisos turístics hi afegeixen pressió on es concentren, però el nus es fa amb tots els fils alhora, i per això cap mesura sola no el desfà.`;

Comu.boot([drawPer,drawBuild,drawHh,drawCred,drawRate,drawYield,drawTen,drawBis,drawAb],[['hh'],['cred'],['rate'],['yield'],['ten'],['bis'],['ab',.4]],
  ()=>{ per=0; $$('[data-pe]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.pe==='0')); paintPer(true);
    onView($('#per'),()=>{ let i=0; const step=()=>{ if(perUser||i>=PER.length-1) return; i++; per=i; $$('[data-pe]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.pe===i)); paintPer(); setTimeout(step,RM?0:1100); }; setTimeout(step,RM?0:700); },.4);
    by=HY[0]; paintBuild(true); onView($('#build'),()=>setTimeout(playBuild,RM?0:400),.4); });
}).catch(e=>{ console.error(e); document.body.insertAdjacentHTML("beforeend","<p style=\"padding:2rem\">No s’han pogut carregar les dades.</p>"); });
