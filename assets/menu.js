/* Menú superior comú a totes les pàgines. La llista d'articles és aquí: per afegir-ne un, afegir-lo a ART. */
(function(){
"use strict";
const me=document.currentScript;
const ROOT=new URL('..',me.src);
const here=location.pathname.replace(/index\.html$/,'');
// Icones de 24×24 dibuixades amb l'escala de vermells
const G={
  terra:'<circle cx="15" cy="14" r="6.5" fill="var(--r6)"/><circle cx="7.5" cy="8" r="2.6" fill="var(--red)"/><circle cx="6.5" cy="16.5" r="1.7" fill="var(--r2)"/><circle cx="12" cy="4.6" r="1.2" fill="var(--r3)"/>',
  diners:'<rect x="2.5" y="6" width="19" height="12" rx="2" fill="var(--r1)"/><rect x="2.5" y="6" width="19" height="12" rx="2" fill="none" stroke="var(--r5)" stroke-width="1.4"/><circle cx="12" cy="12" r="3.2" fill="var(--red)"/><circle cx="5.8" cy="9.3" r=".9" fill="var(--r5)"/><circle cx="18.2" cy="14.7" r=".9" fill="var(--r5)"/>',
  or:'<path d="M5 17.5 7.6 10h8.8l2.6 7.5Z" fill="var(--r3)"/><path d="M8.5 10 10.6 4.5h2.8L15.5 10Z" fill="var(--red)"/><path d="M3 20h18" stroke="var(--r6)" stroke-width="1.6" stroke-linecap="round"/>',
  casa:'<path d="M4 11 12 4l8 7v9H4Z" fill="var(--r1)"/><path d="M4 11 12 4l8 7" fill="none" stroke="var(--r6)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="10" y="14" width="4" height="6" fill="var(--red)"/>',
  anys:'<rect x="3" y="15" width="4" height="5" rx="1" fill="var(--r1)"/><rect x="8.5" y="11" width="4" height="9" rx="1" fill="var(--r3)"/><rect x="14" y="6.5" width="4" height="13.5" rx="1" fill="var(--red)"/><path d="M3.5 10.5 9 6l3.5 2.5L20 3" fill="none" stroke="var(--r6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  nus:'<path d="M3 7c6 0 6 10 12 10s6-6 6-6" fill="none" stroke="var(--r2)" stroke-width="2.2" stroke-linecap="round"/><path d="M3 17c6 0 6-10 12-10s6 6 6 6" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round"/><path d="M3 12h18" stroke="var(--r6)" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="2.6" fill="var(--r6)"/>'
};
const ART=[
  {p:'',g:'terra',t:'Terra i gent',s:'On vivim',d:'947 municipis i el desequilibri entre Barcelona i el territori.'},
  {p:'diners/',g:'diners',t:'Diners de paper',s:'Diners',d:'Inflació, creació de diners i la fi del patró or.'},
  {p:'or/',g:'or',t:'Mesurat en or',s:'Or',d:'El preu de tot, si no comptéssim en euros.'},
  {p:'habitatge/',g:'casa',t:'La casa',s:'Casa',d:'Quants metres quadrats compra un any de sou.'},
  {p:'estrategia/',g:'anys',t:'Deu anys',s:'Deu anys',d:'Què faig amb el que guanyo: un pla adaptat al teu sou.'},
  {p:'nus/',g:'nus',t:'El nus',s:'El nus',d:'Tots els fils que han encarit l’habitatge, lligats.',nou:true}
];
const url=a=>new URL(a.p,ROOT).pathname;
const cur=ART.findIndex(a=>url(a)===here);
const ic=(g,s)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${G[g]}</svg>`;
const n2=i=>String(i+1).padStart(2,'0');
const nav=document.createElement('nav');
nav.className='nav'; nav.setAttribute('aria-label','Articles');
nav.innerHTML=`<div class="nav-in">
  <a class="nav-brand" href="${url(ART[0])}">${ic('terra',22)}<span>Terra i gent</span></a>
  <div class="nav-rail">${ART.map((a,i)=>`<a class="nav-pill" href="${url(a)}"${i===cur?' aria-current="page"':''}>${ic(a.g,16)}<span>${a.s}</span>${a.nou?'<em>Nou</em>':''}</a>`).join('')}</div>
  <button class="nav-btn" type="button" aria-expanded="false" aria-controls="navPanel"><span class="nav-cur">${cur>=0?`<b>${n2(cur)}</b> ${ART[cur].t}`:'Articles'}</span><span class="nav-all">Tots</span><i class="nav-burg" aria-hidden="true"><i></i><i></i></i></button>
</div>
<div class="nav-prog" aria-hidden="true"><i></i></div>
<div class="nav-panel" id="navPanel" hidden>
  <p class="nav-ph">${ART.length} articles · un sol projecte sobre on i com vivim a Catalunya</p>
  <div class="nav-grid">${ART.map((a,i)=>`<a class="nav-card" href="${url(a)}"${i===cur?' aria-current="page"':''} style="--d:${i*35}ms"><span class="nav-cv">${ic(a.g,46)}<span class="nav-ix">${n2(i)}</span>${a.nou?'<em>Nou</em>':''}</span><b>${a.t}</b><small>${a.d}</small></a>`).join('')}</div>
</div>`;
document.body.prepend(nav);
const btn=nav.querySelector('.nav-btn'), panel=nav.querySelector('.nav-panel');
const open=o=>{ btn.setAttribute('aria-expanded',o); nav.classList.toggle('open',o); if(o){ panel.hidden=false; requestAnimationFrame(()=>panel.classList.add('on')); } else { panel.classList.remove('on'); setTimeout(()=>{ if(!nav.classList.contains('open')) panel.hidden=true; },220); } };
btn.addEventListener('click',()=>open(btn.getAttribute('aria-expanded')!=='true'));
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&nav.classList.contains('open')){ open(false); btn.focus(); } });
document.addEventListener('pointerdown',e=>{ if(nav.classList.contains('open')&&!nav.contains(e.target)) open(false); });
// La pastilla de l'article actual, visible dins del carril si no hi cap
const rail=nav.querySelector('.nav-rail'), pill=rail.querySelector('[aria-current]');
if(pill) rail.scrollLeft=pill.offsetLeft-(rail.clientWidth-pill.offsetWidth)/2;
// Barra de lectura i ombra en fer scroll
const prog=nav.querySelector('.nav-prog i'); let tk=false;
const upd=()=>{ tk=false; const h=document.documentElement, max=h.scrollHeight-innerHeight; prog.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`; nav.classList.toggle('sc',scrollY>8); };
addEventListener('scroll',()=>{ if(!tk){ tk=true; requestAnimationFrame(upd); } },{passive:true}); addEventListener('resize',upd); upd();
})();
