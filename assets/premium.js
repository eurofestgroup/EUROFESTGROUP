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
const parse=s=>s.split(';').map(r=>{const f=r.split('|'),m=f.length>3;return{n:f[0],u:m?f[1]:'',lat:+f[m?2:1],lon:+f[m?3:2]}});
const ETS=parse('Calais|Кале|50.95|1.86;London|Лондон|51.5|-0.12;Dover|Дувр|51.13|1.31;Manchester|Манчестер|53.48|-2.24;Edinburgh|Единбург|55.95|-3.19;Dublin|Дублін|53.35|-6.26;Amsterdam|Амстердам|52.37|4.9;Rotterdam|Роттердам|51.92|4.48;Brussels|Брюссель|50.85|4.35;Luxembourg|Люксембург|49.61|6.13;Paris|Париж|48.86|2.35;Lyon|Ліон|45.76|4.84;Marseille|Марсель|43.3|5.37;Bordeaux|Бордо|44.84|-0.58;Madrid|Мадрид|40.42|-3.7;Barcelona|Барселона|41.39|2.17;Lisbon|Лісабон|38.72|-9.14;Berlin|Берлін|52.52|13.4;Hamburg|Гамбург|53.55|9.99;Bremen|Бремен|53.08|8.8;Cologne|Кельн|50.94|6.96;Frankfurt|Франкфурт|50.11|8.68;Stuttgart|Штутгарт|48.78|9.18;Munich|Мюнхен|48.14|11.58;Nuremberg|Нюрнберг|49.45|11.08;Prague|Прага|50.08|14.44;Vienna|Відень|48.21|16.37;Bratislava|Братислава|48.15|17.11;Budapest|Будапешт|47.5|19.04;Zurich|Цюрих|47.38|8.54;Bern|Берн|46.95|7.45;Milan|Мілан|45.46|9.19;Rome|Рим|41.9|12.5;Venice|Венеція|45.44|12.32;Genoa|Генуя|44.41|8.93;Zagreb|Загреб|45.81|15.98;Belgrade|Белград|44.79|20.45;Bucharest|Бухарест|44.43|26.1;Sofia|Софія|42.7|23.32;Istanbul|Стамбул|41.01|28.98;Athens|Афіни|37.98|23.73;Warsaw|Варшава|52.23|21.01;Gdansk|Гданськ|54.35|18.65;Krakow|Краків|50.06|19.94;Poznan|Познань|52.41|16.93;Wroclaw|Вроцлав|51.11|17.04;Katowice|Катовіце|50.26|19.02;Vilnius|Вільнюс|54.69|25.28;Kaunas|Каунас|54.9|23.9;Klaipeda|Клайпеда|55.7|21.14;Riga|Рига|56.95|24.1;Tallinn|Таллінн|59.44|24.75;Helsinki|Гельсінкі|60.17|24.94;Stockholm|Стокгольм|59.33|18.07;Gothenburg|Гетеборг|57.71|11.97;Oslo|Осло|59.91|10.75;Copenhagen|Копенгаген|55.68|12.57;Malmo|Мальме|55.6|13;Kiel|Кіль|54.32|10.14');
const ATS=parse('Seattle|Сіетл|47.61|-122.33;Portland|Портленд|45.52|-122.68;Sacramento|Сакраменто|38.58|-121.49;San Francisco|Сан-Франциско|37.77|-122.42;Los Angeles|Лос-Анджелес|34.05|-118.24;San Diego|Сан-Дієго|32.72|-117.16;Las Vegas|Лас-Вегас|36.17|-115.14;Reno|Рено|39.53|-119.81;Bakersfield|Бейкерсфілд|35.37|-119.02;Phoenix|Феникс|33.45|-112.07;Tucson|Тусон|32.22|-110.97;Flagstaff|Флагстафф|35.2|-111.65;Salt Lake City|Солт-Лейк-Сіті|40.76|-111.89;Boise|Бойсе|43.62|-116.2;Denver|Денвер|39.74|-104.99;Albuquerque|Альбукерке|35.08|-106.65;Santa Fe|Санта-Фе|35.69|-105.94;El Paso|Ель-Пасо|31.76|-106.49;Dallas|Даллас|32.78|-96.8;Houston|Х\'юстон|29.76|-95.37;San Antonio|Сан-Антоніо|29.42|-98.49;Austin|Остін|30.27|-97.74;Oklahoma City|Оклахома-Сіті|35.47|-97.52;Omaha|Омаха|41.26|-95.93;Cheyenne|Шайєнн|41.14|-104.82;Billings|Біллінгс|45.78|-108.5;Kansas City|Канзас-Сіті|39.1|-94.58;Wichita|Вічита|37.69|-97.34');
ETS.push(...parse('Kokkola|63.84|23.13;Loviisa|60.46|26.23;Turku|60.45|22.27;Tampere|61.5|23.76;Oulu|65.01|25.47;Kuopio|62.89|27.68;Jyvaskyla|62.24|25.75;Pori|61.49|21.8;Lahti|60.98|25.66;Kotka|60.47|26.95;Vaasa|63.1|21.62;Joensuu|62.6|29.76;Rovaniemi|66.5|25.73;Kajaani|64.22|27.73;Lappeenranta|61.06|28.19;Hamina|60.57|27.2;Kemi|65.74|24.56;Seinajoki|62.79|22.84;Mikkeli|61.69|27.27;Naantali|60.47|22.02;Hanko|59.82|22.97;Raahe|64.68|24.48;Linkoping|58.41|15.62;Orebro|59.27|15.21;Vasteras|59.61|16.55;Uppsala|59.86|17.64;Jonkoping|57.78|14.16;Norrkoping|58.59|16.18;Helsingborg|56.05|12.69;Kalmar|56.66|16.36;Karlskrona|56.16|15.59;Sundsvall|62.39|17.31;Umea|63.83|20.26;Lulea|65.58|22.15;Gavle|60.67|17.14;Karlstad|59.38|13.5;Halmstad|56.67|12.86;Boras|57.72|12.94;Visby|57.64|18.3;Kiruna|67.86|20.23;Bergen|60.39|5.32;Trondheim|63.43|10.4;Stavanger|58.97|5.73;Kristiansand|58.15|8;Tromso|69.65|18.96;Bodo|67.28|14.4;Narvik|68.44|17.43;Alesund|62.47|6.15;Drammen|59.74|10.2;Hamar|60.8|11.07;Lillehammer|61.12|10.47;Aalborg|57.05|9.92;Aarhus|56.16|10.2;Odense|55.4|10.39;Esbjerg|55.48|8.45;Fredericia|55.57|9.75;Frederikshavn|57.44|10.54;Hirtshals|57.59|9.96;Daugavpils|55.87|26.54;Liepaja|56.51|21.01;Ventspils|57.39|21.56;Panevezys|55.73|24.36;Siauliai|55.93|23.31;Tartu|58.38|26.72;Parnu|58.38|24.5;Narva|59.38|28.19;Jelgava|56.65|23.72;Kaliningrad|54.71|20.51;Bialystok|53.13|23.16;Szczecin|53.43|14.55;Lodz|51.76|19.46;Lublin|51.25|22.57;Rzeszow|50.04|21.99;Olsztyn|53.78|20.49;Dortmund|51.51|7.47;Dusseldorf|51.23|6.78;Hannover|52.37|9.74;Leipzig|51.34|12.37;Dresden|51.05|13.74;Rostock|54.09|12.1;Kassel|51.31|9.5;Magdeburg|52.13|11.62;Saarbrucken|49.24|6.99;Karlsruhe|49.01|8.4;Wurzburg|49.79|9.95;Erfurt|50.98|11.03;Salzburg|47.8|13.04;Graz|47.07|15.44;Innsbruck|47.26|11.4;Linz|48.31|14.29;Brno|49.2|16.61;Ostrava|49.83|18.29;Plzen|49.75|13.38;Kosice|48.72|21.26;Debrecen|47.53|21.63;Ljubljana|46.06|14.51;Split|43.51|16.44;Rijeka|45.33|14.44;Sarajevo|43.86|18.41;Skopje|42|21.43;Thessaloniki|40.64|22.94;Plovdiv|42.15|24.75;Varna|43.21|27.91;Constanta|44.18|28.65;Cluj-Napoca|46.77|23.6;Timisoara|45.75|21.23;Brasov|45.65|25.6;Iasi|47.16|27.59;Novi Sad|45.26|19.83;Nis|43.32|21.9;Ankara|39.93|32.86;Edirne|41.68|26.56;Turin|45.07|7.69;Bologna|44.49|11.34;Florence|43.77|11.26;Naples|40.85|14.27;Bari|41.12|16.87;Palermo|38.12|13.36;Trieste|45.65|13.78;Verona|45.44|10.99;Ancona|43.62|13.52;Catania|37.5|15.09;Toulouse|43.6|1.44;Nantes|47.22|-1.55;Lille|50.63|3.06;Strasbourg|48.57|7.75;Rennes|48.11|-1.68;Le Havre|49.49|0.11;Cherbourg|49.63|-1.62;Brest|48.39|-4.49;Nice|43.7|7.27;Dijon|47.32|5.04;Montpellier|43.61|3.88;Metz|49.12|6.18;Reims|49.26|4.03;Valencia|39.47|-0.38;Seville|37.39|-5.98;Malaga|36.72|-4.42;Bilbao|43.26|-2.93;Zaragoza|41.65|-0.88;Porto|41.15|-8.61;Faro|37.02|-7.93;Vigo|42.24|-8.72;Granada|37.18|-3.6;Birmingham|52.49|-1.89;Leeds|53.8|-1.55;Glasgow|55.86|-4.25;Liverpool|53.41|-2.98;Cardiff|51.48|-3.18;Newcastle|54.98|-1.62;Southampton|50.9|-1.4;Bristol|51.45|-2.59;Sheffield|53.38|-1.47;Aberdeen|57.15|-2.09;Felixstowe|51.96|1.35;Harwich|51.94|1.29;Inverness|57.48|-4.22;Utrecht|52.09|5.12;Eindhoven|51.44|5.48;Groningen|53.22|6.57;Antwerp|51.22|4.4;Liege|50.63|5.57;Zeebrugge|51.33|3.2;Geneva|46.2|6.14;Basel|47.56|7.59'));ATS.push(...parse('Eugene|44.05|-123.09;Salem|44.94|-123.04;Olympia|47.04|-122.9;Tacoma|47.25|-122.44;Spokane|47.66|-117.43;Redding|40.59|-122.39;Fresno|36.74|-119.79;Barstow|34.9|-117.02;San Bernardino|34.11|-117.29;Carson City|39.16|-119.77;Elko|40.83|-115.76;Provo|40.23|-111.66;Grand Junction|39.06|-108.55;Colorado Springs|38.83|-104.82;Lubbock|33.58|-101.86;Amarillo|35.22|-101.83;Tulsa|36.15|-95.99;Lincoln|40.81|-96.7;Casper|42.87|-106.31;Great Falls|47.5|-111.3;Missoula|46.87|-114;Las Cruces|32.32|-106.76;Roswell|33.39|-104.52;Pocatello|42.87|-112.45;Twin Falls|42.56|-114.46'));
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’`]/g,"'");
const find=(txt,list)=>{const t=norm(txt),parts=t.split(/[,(\/–—]| - /).map(x=>x.trim());
 return list.find(c=>parts.includes(norm(c.n))||(c.u&&parts.includes(norm(c.u))))||list.find(c=>norm(c.n).length>4&&(t.includes(norm(c.n))||(c.u&&t.includes(norm(c.u)))))};
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
 const pts=list.map(P),seen=new Set();pts.forEach((p,i)=>{pts.map((q,j)=>[j,Math.hypot(p[0]-q[0],p[1]-q[1])]).filter(r=>r[0]!==i&&r[1]<95).sort((u,v)=>u[1]-v[1]).slice(0,2).forEach(([j])=>{const key=i<j?i+'-'+j:j+'-'+i;if(seen.has(key))return;seen.add(key);el('line',{x1:p[0],y1:p[1],x2:pts[j][0],y2:pts[j][1],class:'ef-road'},svg)})});
 const MAJ='Berlin Paris London Madrid Rome Warsaw Stockholm Helsinki Vienna Istanbul Oslo Lisbon Athens Prague Budapest Seattle|Los Angeles|Denver|Dallas|Houston|Salt Lake City|Phoenix|Las Vegas'.split(/[ |]/);list.forEach(c=>{const[x,y]=P(c);el('circle',{cx:x,cy:y,r:2.2,class:'ef-city'},svg);if(MAJ.includes(c.n.split(' ')[0])&&c!==a&&c!==b){const t=el('text',{x:x+6,y:y+4,class:'ef-faint'},svg);t.textContent=(!c.u||document.documentElement.lang==='en')?c.n:c.u}});
 if(a&&b){const[x1,y1_]=P(a),[x2,y2]=P(b),dx=x2-x1,dy=y2-y1_,l=Math.hypot(dx,dy)||1;
  el('path',{d:`M${x1} ${y1_}Q${(x1+x2)/2-dy*.18} ${(y1_+y2)/2+dx*.18} ${x2} ${y2}`,class:'ef-route'},svg)}
 [[a,'ef-from'],[b,'ef-to']].forEach(([c,cls],i)=>{if(!c)return;const[x,y]=P(c);
  if(!i)el('circle',{cx:x,cy:y,r:6,class:'ef-ring'},svg);
  el('circle',{cx:x,cy:y,r:5.5,class:cls},svg);
  const t=el('text',{x:x+(x>W*.7?-10:10),y:y-9,class:'ef-label','text-anchor':x>W*.7?'end':'start'},svg);t.textContent=(!c.u||document.documentElement.lang==='en')?c.n:c.u});
 return box}
const det=$('#event-detail');
if(det)new MutationObserver(()=>{const dl=det.querySelector('.detail-fields');if(!dl||det.querySelector('.ef-map'))return;if([...det.querySelectorAll('.detail-image h3')].some(h=>/маршрут|route/i.test(h.textContent)))return;
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

/* Дорога в нижній частині головного екрана */
(()=>{const h=document.querySelector('.hero');if(!h||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const f=document.createElement('div');f.className='ef-roadfx';f.setAttribute('aria-hidden','true');f.innerHTML='<div class="ef-plane"></div>';h.appendChild(f)})();
