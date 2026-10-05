(() => {
  'use strict';
  const container = document.querySelector('.event-gallery');
  const archive = container?.dataset.eventArchive === 'true';
  const search = document.getElementById('archive-search');
  const year = document.getElementById('archive-year');
  const more = document.getElementById('events-more');
  let visible = 24;
  const grid = document.getElementById('events-grid');
  const status = document.getElementById('events-status');
  const count = document.getElementById('events-count');
  const filters = [...document.querySelectorAll('[data-event-filter]')];
  const refresh = document.getElementById('events-refresh');
  const dialog = document.getElementById('event-dialog');
  const detail = document.getElementById('event-detail');
  const config = window.EUROFEST_CONFIG || {};
  const defaultCover = new URL('assets/convoy.webp', document.baseURI).href;
  let api;
  try { api = new URL(config.apiUrl || '/api/events', location.href); if (archive) api.pathname = api.pathname.replace(/\/events\/?$/, '/archive'); } catch (_) { api = null; }
  let gridSignature='', detailSignature='';
  let events = [], filter = 'all', loaded = false, fetching = false, currentId = '', trigger = null;
  let formatter = new Intl.DateTimeFormat(window.EUROFEST_I18N?.locale || 'uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', year: 'numeric' });
  let monthFormatter = new Intl.DateTimeFormat(window.EUROFEST_I18N?.locale || 'uk-UA', { timeZone: 'Europe/Kyiv', month: 'short' });
  let checkedFormatter = new Intl.DateTimeFormat(window.EUROFEST_I18N?.locale || 'uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
  const el = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
  const validDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
  const safeUrl = (value, media = false) => {
    if (typeof value !== 'string' || !value) return '';
    try {
      const url = new URL(value, media && api ? api.origin : document.baseURI);
      if (url.username || url.password || !['https:', 'http:'].includes(url.protocol)) return '';
      if (location.protocol === 'https:' && url.protocol !== 'https:') return '';
      return url.href;
    } catch (_) { return ''; }
  };
  const liveEvents = () => events.filter(event => archive ? validDate(event.end_at)?.getTime() <= Date.now() : validDate(event.end_at)?.getTime() > Date.now());
  const countdown = event => {
    const start = validDate(event.start_at), gather = validDate(event.gather_at);
    if (start && start.getTime() <= Date.now()) return 'Конвой у дорозі';
    if (gather && gather.getTime() <= Date.now()) return 'Розпочався збір';
    const target = gather || start || validDate(event.date + 'T12:00:00+03:00');
    if (!target) return 'Заплановано';
    const kyivDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
    if (kyivDay(target) === kyivDay(new Date())) return 'Сьогодні';
    const days = Math.ceil((target.getTime() - Date.now()) / 86400000);
    if (days <= 1) return 'Незабаром';
    const unit = days % 10 === 1 && days % 100 !== 11 ? 'день' : [2,3,4].includes(days % 10) && ![12,13,14].includes(days % 100) ? 'дні' : 'днів';
    return `Через ${days} ${unit}`;
  };
  const routeLine = event => [event.departure, event.arrival].filter(Boolean).join(' — ') || 'Маршрут уточнюється';
  const image = (src, alt, className, fallback = true) => {
    const node = el('img', className);
    node.src = safeUrl(src, true) || defaultCover;
    node.alt = alt; node.loading = 'lazy'; node.decoding = 'async';
    node.addEventListener('error', () => { if (fallback && node.src !== defaultCover) { node.src = defaultCover; node.alt = 'Колона EUROFEST GROUP'; } else if (!fallback) { node.hidden = true; } }, { once: true });
    return node;
  };
  const link = (label, url, className = 'button button-glass') => {
    const href = safeUrl(url, true);
    if (!href) return null;
    const node = el('a', className, label); node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node;
  };
  const normalize = raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date || '') || !validDate(raw.end_at)) return null;
    const event = {};
    ['id','title','organizer','status','date','gather_time','start_time','departure','arrival','server','dlc','slot','route','event_url','route_url','route_image_url','slot_image_url','cover_url','cover_label'].forEach(key => { event[key] = typeof raw[key] === 'string' ? raw[key].slice(0,2000) : ''; });
    event.kind = raw.kind === 'online' ? 'online' : 'company';
    ['end_at','gather_at','start_at'].forEach(key => { event[key] = typeof raw[key] === 'string' && validDate(raw[key]) ? raw[key] : null; });
    return event;
  };
  function createCard(event, index) {
    const card = el('article', 'event-card glass-surface');
    const visual = el('div', 'event-visual');
    const cover = image(event.cover_url, event.cover_label === 'КАРТА МАРШРУТУ' ? `Карта маршруту: ${event.title}` : `Обкладинка події: ${event.title}`);
    visual.append(cover);
    const date = el('div', 'event-date');
    date.append(el('strong', '', event.date.slice(8)), el('span', '', monthFormatter.format(new Date(event.date + 'T12:00:00Z')).replace('.', '')));
    const coverLabel = el('span', 'event-image-label', event.cover_label || 'EUROFEST / CONVOY');
    cover.addEventListener('error', () => { coverLabel.textContent='EUROFEST / CONVOY'; }, {once:true});
    visual.append(date, coverLabel);
    const body = el('div', 'event-body');
    const meta = el('div', 'event-meta');
    meta.append(el('span', 'event-kind', event.kind === 'online' ? 'TRUCKERSMP' : 'EUROFEST'));
    const timing = el('span', 'event-countdown', archive ? 'Минула подія' : index === 0 ? 'Найближча подія' : countdown(event));
    if (!archive && validDate(event.gather_at)?.getTime() <= Date.now()) timing.textContent = countdown(event);
    meta.append(timing);
    const heading = el('h3', '', event.title); heading.setAttribute('data-no-i18n', '');
    const route = el('p', 'event-route', routeLine(event));
    body.append(meta, heading, route);
    if (event.organizer) body.append(el('p', 'event-organizer', event.organizer));
    const times = el('div', 'event-times');
    const gather = el('div'); gather.append(el('span', '', 'Збір'), el('strong', '', event.gather_time || 'Уточнюється'));
    const start = el('div'); start.append(el('span', '', 'Виїзд'), el('strong', '', event.start_time || 'Уточнюється'));
    times.append(gather, start, el('span', 'event-timezone', 'КИЇВ'));
    body.append(times);
    if (event.server) body.append(el('span', 'event-server', event.server));
    const button = el('button', 'event-open', 'Деталі конвою'); button.type = 'button';
    button.setAttribute('aria-label', `Деталі: ${event.title}`);
    button.addEventListener('click', () => openEvent(event, button));
    body.append(button); card.append(visual, body); return card;
  }
  function render() {
    const all = liveEvents();
    const query = (search?.value || '').trim().toLocaleLowerCase();
    const selected = all.filter(event => (filter === 'all' || event.kind === filter) && (!archive || ((!year || year.value === 'all' || event.date.startsWith(year.value)) && [event.id,event.title,event.organizer,event.departure,event.arrival].join(' ').toLocaleLowerCase().includes(query))));
    if (more) more.hidden = selected.length <= visible;
    const signature=JSON.stringify([selected,filter,visible,window.EUROFEST_I18N?.locale,archive ? [] : selected.map(countdown)]);
    if(gridSignature===signature)return;
    gridSignature=signature;
    count.textContent = `${selected.length} / ${all.length}`;
    grid.replaceChildren(); grid.setAttribute('aria-busy', 'false');
    if (!selected.length) {
      const empty = el('div', 'events-empty');
      empty.append(el('span', 'micro-label', 'НА ДОРОЗІ ЗУСТРІНЕМОСЯ'), el('h3', '', archive ? 'Минулих подій за цим запитом немає.' : all.length ? 'У цій категорії ще немає подій.' : 'Нові маршрути вже попереду.'), el('p', '', archive ? 'Архів показує збережені в БД події після їх завершення.' : 'Актуальні оголошення та спільні рейси шукай у Discord.'));
      empty.append(link('Наш Discord', 'https://discord.gg/qk5h7AK7Z4'));
      grid.append(empty);
    } else selected.slice(0, archive ? visible : selected.length).forEach((event, index) => grid.append(createCard(event, index)));
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eventFilter === filter)));
  }
  function openEvent(event, button) {
    trigger = button; currentId = event.id; renderDetail(event);
    if (!dialog.open) { dialog.showModal(); document.body.classList.add('dialog-open'); }
    document.getElementById('event-close').focus();
  }
  function renderDetail(event) {
    const signature=JSON.stringify([event,window.EUROFEST_I18N?.locale]);
    if(detailSignature===signature)return;detailSignature=signature;
    detail.replaceChildren();
    detail.append(el('span', 'micro-label', `${event.id} / ${event.kind === 'online' ? 'TRUCKERSMP' : 'EUROFEST'}`), el('h2', '', event.title));
    const day = el('p', 'detail-date', formatter.format(new Date(event.date + 'T12:00:00Z')) + ' · час за Києвом');
    detail.querySelector('h2').setAttribute('data-no-i18n', '');
    const headingId = 'event-detail-title'; detail.querySelector('h2').id = headingId;
    dialog.setAttribute('aria-labelledby', headingId);
    detail.append(day);
    const fields = el('dl', 'detail-fields');
    const values = [['Збір', event.gather_time], ['Виїзд', event.start_time], ['Місце збору',event.departure], ['Прибуття', event.arrival], ['Сервер',event.server], ['Організатор',event.organizer], ['DLC',event.dlc], ['Слот',event.slot]];
    values.forEach(([label,value]) => { const field = el('div'); field.append(el('dt','',label),el('dd','',value || 'Уточнюється')); fields.append(field); });
    detail.append(fields);
    if (event.route && !safeUrl(event.route)) detail.append(el('p', 'detail-route', event.route));
    [['Маршрут',event.route_image_url],['Слот',event.slot_image_url]].forEach(([label,url]) => {
      const href = safeUrl(url,true);
      if (!href) return;
      const section = el('div','detail-image'); section.append(el('h3','',label));
      const anchor = link('',href,'detail-image-link'); const picture=image(href,`${label}: ${event.title}`,'',false);
      picture.addEventListener('error',()=>{anchor.append(el('span','image-unavailable','Зображення не завантажилось. Відкрити оригінал.'));},{once:true});
      anchor.append(picture); section.append(anchor); detail.append(section);
    });
    const actions = el('div','detail-actions');
    for (const [label,url,style] of [['Сторінка події',event.event_url,'button button-red'],['Відкрити маршрут',event.route_url,'button button-glass'],['Наш Discord','https://discord.gg/qk5h7AK7Z4','button button-glass']]) { const anchor = link(label,url,style); if (anchor) actions.append(anchor); }
    detail.append(actions);
  }
  const close = () => { if (dialog.open) dialog.close(); };
  document.getElementById('event-close').addEventListener('click',close);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } });
  dialog.addEventListener('close', () => { currentId='';document.body.classList.remove('dialog-open');if (trigger?.isConnected) trigger.focus(); });
  filters.forEach(button => button.addEventListener('click', () => { filter=button.dataset.eventFilter;visible=24; if(loaded)render(); }));
  async function loadEvents() {
    if (fetching) return;
    fetching=true;refresh.disabled=true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),10000);
    try {
      if (!api || !['http:','https:'].includes(api.protocol) || (location.protocol==='https:' && api.protocol!=='https:')) throw new Error('Invalid API configuration');
      const response=await fetch(api.href,{signal:controller.signal,cache:'no-cache',credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(`API ${response.status}`);
      const payload=await response.json();
      if(payload.schema_version!==1 || !Array.isArray(payload.events))throw new Error('Unexpected API format');
      events=(archive ? payload.events : payload.events.slice(0,300)).map(normalize).filter(Boolean).sort((a,b)=>(a.date+(a.start_time||'23:59')).localeCompare(b.date+(b.start_time||'23:59')) * (archive ? -1 : 1));
      if (year && year.dataset.years!==JSON.stringify([...new Set(events.map(e=>e.date.slice(0,4)))].sort().reverse())) { year.dataset.years=JSON.stringify([...new Set(events.map(e=>e.date.slice(0,4)))].sort().reverse()); const previous=year.value; year.replaceChildren(); const option=el('option','','Усі роки');option.value='all';year.append(option); [...new Set(events.map(e=>e.date.slice(0,4)))].sort().reverse().forEach(value=>{const option=el('option','',value);option.value=value;year.append(option);});year.value=[...year.options].some(o=>o.value===previous)?previous:'all'; }
      loaded=true;render();
      status.textContent=`Оновлено о ${checkedFormatter.format(new Date())} · Київ`;status.classList.remove('events-warning');
      if(dialog.open){const event=liveEvents().find(event=>event.id===currentId);if(event)renderDetail(event);else close();}
    } catch(error) {
      status.textContent=loaded ? 'Зв’язок тимчасово перервано. Показуємо останні отримані дані.' : archive ? 'Архів тимчасово недоступний. Спробуй оновити пізніше.' : 'Розклад тимчасово недоступний. Оголошення — у Discord.';
      status.classList.add('events-warning');
      if(!loaded){grid.setAttribute('aria-busy','false');grid.replaceChildren();const unavailable=el('div','events-empty');unavailable.append(el('span','micro-label','EUROFEST / КАЛЕНДАР'),el('h3','',archive ? 'Архів тимчасово недоступний.' : 'Точка збору — наш Discord.'),el('p','','Завітай до оголошень компанії, щоб дізнатися про наступний конвой.'));unavailable.append(link('Переглянути оголошення','https://discord.gg/qk5h7AK7Z4'));grid.append(unavailable);count.textContent='';}
    } finally{clearTimeout(timeout);fetching=false;refresh.disabled=false;}
  }
  search?.addEventListener('input',()=>{visible=24;if(loaded)render();});
  year?.addEventListener('change',()=>{visible=24;if(loaded)render();});
  more?.addEventListener('click',()=>{visible+=24;render();});
  refresh.addEventListener('click',loadEvents);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadEvents();});
  const seconds=Math.max(30,Math.min(600,Number(config.refreshSeconds)||60));
  setInterval(()=>{if(!document.hidden){if(loaded)render();loadEvents();}},seconds*1000);
  document.addEventListener('eurofest:language', () => {
    const locale = window.EUROFEST_I18N?.locale || 'uk-UA';
    formatter = new Intl.DateTimeFormat(locale, {timeZone:'Europe/Kyiv',day:'numeric',month:'long',year:'numeric'});
    monthFormatter = new Intl.DateTimeFormat(locale, {timeZone:'Europe/Kyiv',month:'short'});
    checkedFormatter = new Intl.DateTimeFormat(locale, {timeZone:'Europe/Kyiv',hour:'2-digit',minute:'2-digit'});
    if (loaded) render();
    if (dialog.open) { const event=liveEvents().find(e=>e.id===currentId); if(event) renderDetail(event); }
  });
  loadEvents();
})();
