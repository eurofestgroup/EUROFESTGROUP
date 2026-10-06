/* EUROFEST GROUP — premium.js: лише візуальні ефекти, не залежить від app.js */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,$=s=>document.querySelector(s);
/* Світло за курсором */
if(!reduce&&matchMedia('(hover:hover)').matches){
 const g=document.createElement('div');g.className='ef-glow';g.setAttribute('aria-hidden','true');document.body.appendChild(g);
 let raf=0,x=0,y=0;
 addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;g.classList.add('on');
  if(!raf)raf=requestAnimationFrame(()=>{raf=0;g.style.setProperty('--gx',x+'px');g.style.setProperty('--gy',y+'px')})},{passive:true});
 document.addEventListener('pointerleave',()=>g.classList.remove('on'));
}
/* Біжучий рядок; копія синхронізується при зміні мови */
const strip=$('.brand-strip');
if(strip&&!reduce){
 const track=document.createElement('div'),a=document.createElement('div'),b=document.createElement('div');
 track.className='ef-track';a.className=b.className='ef-group';
 while(strip.firstChild)a.appendChild(strip.firstChild);
 b.innerHTML=a.innerHTML;b.setAttribute('aria-hidden','true');
 track.append(a,b);strip.appendChild(track);
 new MutationObserver(()=>{b.innerHTML=a.innerHTML}).observe(a,{childList:true,characterData:true,subtree:true});
}
/* Лічильник учасників VTC */
const c=$('#vtc-count');
if(c&&!reduce){let busy=false;
 const run=()=>{const n=parseInt(c.textContent.replace(/\D/g,''),10);if(busy||!(n>0))return;busy=true;
  const t0=performance.now(),d=1200,tick=t=>{const p=Math.min(1,(t-t0)/d);c.textContent=Math.round(n*(1-Math.pow(1-p,3)));
   p<1?requestAnimationFrame(tick):setTimeout(()=>{busy=false},60)};requestAnimationFrame(tick)};
 new MutationObserver(run).observe(c,{childList:true,characterData:true,subtree:true});run();}
})();
