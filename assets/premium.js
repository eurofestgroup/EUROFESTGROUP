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

/* ===== v2: карта маршруту, магніт/нахил, інтро ===== */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,$=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
const parse=s=>s.split(';').map(r=>{const[n,u,a,o]=r.split('|');return{n,u,lat:+a,lon:+o}});
const ETS=parse('Calais|Кале|50.95|1.86;London|Лондон|51.5|-0.12;Dover|Дувр|51.13|1.31;Manchester|Манчестер|53.48|-2.24;Edinburgh|Единбург|55.95|-3.19;Dublin|Дублін|53.35|-6.26;Amsterdam|Амстердам|52.37|4.9;Rotterdam|Роттердам|51.92|4.48;Brussels|Брюссель|50.85|4.35;Luxembourg|Люксембург|49.61|6.13;Paris|Париж|48.86|2.35;Lyon|Ліон|45.76|4.84;Marseille|Марсель|43.3|5.37;Bordeaux|Бордо|44.84|-0.58;Madrid|Мадрид|40.42|-3.7;Barcelona|Барселона|41.39|2.17;Lisbon|Лісабон|38.72|-9.14;Berlin|Берлін|52.52|13.4;Hamburg|Гамбург|53.55|9.99;Bremen|Бремен|53.08|8.8;Cologne|Кельн|50.94|6.96;Frankfurt|Франкфурт|50.11|8.68;Stuttgart|Штутгарт|48.78|9.18;Munich|Мюнхен|48.14|11.58;Nuremberg|Нюрнберг|49.45|11.08;Prague|Прага|50.08|14.44;Vienna|Відень|48.21|16.37;Bratislava|Братислава|48.15|17.11;Budapest|Будапешт|47.5|19.04;Zurich|Цюрих|47.38|8.54;Bern|Берн|46.95|7.45;Milan|Мілан|45.46|9.19;Rome|Рим|41.9|12.5;Venice|Венеція|45.44|12.32;Genoa|Генуя|44.41|8.93;Zagreb|Загреб|45.81|15.98;Belgrade|Белград|44.79|20.45;Bucharest|Бухарест|44.43|26.1;Sofia|Софія|42.7|23.32;Istanbul|Стамбул|41.01|28.98;Athens|Афіни|37.98|23.73;Warsaw|Варшава|52.23|21.01;Gdansk|Гданськ|54.35|18.65;Krakow|Краків|50.06|19.94;Poznan|Познань|52.41|16.93;Wroclaw|Вроцлав|51.11|17.04;Katowice|Катовіце|50.26|19.02;Vilnius|Вільнюс|54.69|25.28;Kaunas|Каунас|54.9|23.9;Klaipeda|Клайпеда|55.7|21.14;Riga|Рига|56.95|24.1;Tallinn|Таллінн|59.44|24.75;Helsinki|Гельсінкі|60.17|24.94;Stockholm|Стокгольм|59.33|18.07;Gothenburg|Гетеборг|57.71|11.97;Oslo|Осло|59.91|10.75;Copenhagen|Копенгаген|55.68|12.57;Malmo|Мальме|55.6|13;Kiel|Кіль|54.32|10.14');
const ATS=parse('Seattle|Сіетл|47.61|-122.33;Portland|Портленд|45.52|-122.68;Sacramento|Сакраменто|38.58|-121.49;San Francisco|Сан-Франциско|37.77|-122.42;Los Angeles|Лос-Анджелес|34.05|-118.24;San Diego|Сан-Дієго|32.72|-117.16;Las Vegas|Лас-Вегас|36.17|-115.14;Reno|Рено|39.53|-119.81;Bakersfield|Бейкерсфілд|35.37|-119.02;Phoenix|Феникс|33.45|-112.07;Tucson|Тусон|32.22|-110.97;Flagstaff|Флагстафф|35.2|-111.65;Salt Lake City|Солт-Лейк-Сіті|40.76|-111.89;Boise|Бойсе|43.62|-116.2;Denver|Денвер|39.74|-104.99;Albuquerque|Альбукерке|35.08|-106.65;Santa Fe|Санта-Фе|35.69|-105.94;El Paso|Ель-Пасо|31.76|-106.49;Dallas|Даллас|32.78|-96.8;Houston|Х\'юстон|29.76|-95.37;San Antonio|Сан-Антоніо|29.42|-98.49;Austin|Остін|30.27|-97.74;Oklahoma City|Оклахома-Сіті|35.47|-97.52;Omaha|Омаха|41.26|-95.93;Cheyenne|Шайєнн|41.14|-104.82;Billings|Біллінгс|45.78|-108.5;Kansas City|Канзас-Сіті|39.1|-94.58;Wichita|Вічита|37.69|-97.34');
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’`]/g,"'");
const find=(txt,list)=>{const t=norm(txt),parts=t.split(/[,(\/–—]| - /).map(x=>x.trim());
 return list.find(c=>parts.includes(norm(c.n))||parts.includes(norm(c.u)))||list.find(c=>norm(c.n).length>4&&(t.includes(norm(c.n))||t.includes(norm(c.u))))};
const el=(n,a={},p)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
function drawMap(dep,arr,server){
 let game=/\bats\b|american/i.test(server)?'ATS':null,A=find(dep,ATS),B=find(arr,ATS),E=find(dep,ETS),F=find(arr,ETS);
 if(!game)game=(A||B)&&!(E||F)?'ATS':'ETS2';
 const list=game==='ATS'?ATS:ETS,a=game==='ATS'?A:E,b=game==='ATS'?B:F;
 if(!a&&!b)return null;
 const W=640,H=400,pad=36,lat=list.map(c=>c.lat),lon=list.map(c=>c.lon),mid=(Math.min(...lat)+Math.max(...lat))/2,k=Math.cos(mid*Math.PI/180);
 const x0=Math.min(...lon),y1=Math.max(...lat),sc=Math.min((W-2*pad)/((Math.max(...lon)-x0)*k),(H-2*pad)/(y1-Math.min(...lat)));
 const ox=(W-(Math.max(...lon)-x0)*k*sc)/2,oy=(H-(y1-Math.min(...lat))*sc)/2;
 const P=c=>[ox+(c.lon-x0)*k*sc,oy+(y1-c.lat)*sc];
 const box=document.createElement('div');box.className='ef-map';
 const tag=document.createElement('span');tag.className='ef-map-tag';tag.textContent=game;box.appendChild(tag);
 const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':`${dep||''} — ${arr||''}`},box);
 for(let i=1;i<10;i++){el('line',{x1:i*W/10,y1:0,x2:i*W/10,y2:H,class:'ef-grid'},svg);el('line',{x1:0,y1:i*H/10,x2:W,y2:i*H/10,class:'ef-grid'},svg)}
 list.forEach(c=>{const[x,y]=P(c);el('circle',{cx:x,cy:y,r:2.2,class:'ef-city'},svg)});
 if(a&&b){const[x1,y1_]=P(a),[x2,y2]=P(b),dx=x2-x1,dy=y2-y1_,l=Math.hypot(dx,dy)||1;
  el('path',{d:`M${x1} ${y1_}Q${(x1+x2)/2-dy*.18} ${(y1_+y2)/2+dx*.18} ${x2} ${y2}`,class:'ef-route'},svg)}
 [[a,'ef-from'],[b,'ef-to']].forEach(([c,cls],i)=>{if(!c)return;const[x,y]=P(c);
  if(!i)el('circle',{cx:x,cy:y,r:6,class:'ef-ring'},svg);
  el('circle',{cx:x,cy:y,r:5.5,class:cls},svg);
  const t=el('text',{x:x+(x>W*.7?-10:10),y:y-9,class:'ef-label','text-anchor':x>W*.7?'end':'start'},svg);t.textContent=c.u===c.n?c.n:(document.documentElement.lang==='en'?c.n:c.u)});
 return box}
const det=$('#event-detail');
if(det)new MutationObserver(()=>{const dl=det.querySelector('.detail-fields');if(!dl||det.querySelector('.ef-map'))return;
 const d=[...dl.querySelectorAll('dd')].map(x=>x.textContent.trim()),m=drawMap(d[2],d[3],d[4]);if(m)dl.after(m)}).observe(det,{childList:true});

/* Магніт на кнопках і нахил карток подій */
if(!reduce&&matchMedia('(hover:hover)').matches){
 document.addEventListener('pointermove',e=>{
  const m=e.target.closest&&e.target.closest('.button-red,.nav-discord');
  if(m){const r=m.getBoundingClientRect();m.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.16}px,${(e.clientY-r.top-r.height/2)*.26}px)`}
  const c=e.target.closest&&e.target.closest('.event-card');
  if(c){const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
   c.style.transform=`perspective(900px) rotateX(${-py*6}deg) rotateY(${px*8}deg)`}},{passive:true});
 document.addEventListener('pointerout',e=>{const t=e.target.closest&&e.target.closest('.button-red,.nav-discord,.event-card');
  if(t&&!t.contains(e.relatedTarget))t.style.transform=''});
}

/* Інтро: фари (раз за сесію, лише на головній) */
try{if(!reduce&&$('#top.hero')&&!sessionStorage.getItem('ef-intro')){sessionStorage.setItem('ef-intro','1');
 const o=document.createElement('div');o.className='ef-intro';o.setAttribute('aria-hidden','true');
 o.innerHTML='<i class="ef-lamp l"></i><i class="ef-lamp r"></i><img src="assets/logo.webp" alt="" width="104" height="104">';
 document.body.appendChild(o);setTimeout(()=>o.classList.add('go'),1700);setTimeout(()=>o.remove(),2600)}}catch(_){}
})();
