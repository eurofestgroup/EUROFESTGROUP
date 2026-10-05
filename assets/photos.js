(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const grid = byId('photos-grid'), status = byId('photos-status'), more = byId('photos-more'), refresh = byId('photos-refresh');
  const dialog = byId('photo-dialog'), full = byId('photo-full'), error = byId('photo-error');
  const t = value => window.EUROFEST_I18N?.t(value) || value;
  const locale = () => window.EUROFEST_I18N?.locale || 'uk-UA';
  const config = window.EUROFEST_CONFIG || {};
  const endpoint = new URL(config.apiUrl || '/api/events', location.href);
  endpoint.pathname = endpoint.pathname.replace(/\/api\/events\/?$/, '/api/photos'); endpoint.search = ''; endpoint.hash = '';
  let photos = [], visible = 24, activeId = '', trigger = null, loading = false, loaded = false, lastUpdated = '', state = 'loading';
  const cardCache = new Map();
  let rendered = '';
  const safeImage = url => {
    try { const u = new URL(url); return u.protocol === 'https:' && ['cdn.discordapp.com', 'media.discordapp.net'].includes(u.hostname) && u.pathname.startsWith('/attachments/') && !u.username && !u.password ? u.href : ''; }
    catch (_) { return ''; }
  };
  const node = (tag, name, text) => { const element = document.createElement(tag); if (name) element.className = name; if (text !== undefined) element.textContent = text; return element; };
  const dateLabel = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).format(date);
  };
  function statusText() {
    if (state === 'loading') return t('Завантажуємо фотографії…');
    if (['unavailable', 'not_configured'].includes(state)) return t('Галерея тимчасово недоступна. Спробуй оновити сторінку пізніше.');
    if (state === 'stale') return t('Показуємо останні отримані дані. Оновлення тимчасово недоступне.');
    return lastUpdated ? t(`Оновлено ${new Date(lastUpdated).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })} · Київ`) : '';
  }
  function render() {
    grid.setAttribute('aria-busy', 'false');
    const displayed = photos.slice(0, visible);
    const signature=JSON.stringify([displayed,locale(),photos.length,photos.length ? '' : state]);
    if (signature === rendered) {status.textContent=statusText();return;}
    rendered=signature;
    const cards=[];
    for (const photo of displayed) {
      const key=JSON.stringify([photo,locale()]);
      if(cardCache.has(key)){cards.push(cardCache.get(key));continue;}
      const card = node('button', 'photo-card liquid-glass is-loading');card.setAttribute('aria-busy','true'); card.type = 'button'; card.dataset.photoId = photo.id;
      card.setAttribute('aria-label', photo.caption || t('Фото з події EUROFEST'));
      if (photo.caption) card.setAttribute('data-no-i18n', '');
      const placeholder=node('span','photo-placeholder','EUROFEST');placeholder.setAttribute('aria-hidden','true');
      const image = node('img'); image.alt = photo.caption || t('Фото з події EUROFEST');
      image.loading = 'lazy'; image.decoding = 'async'; image.width = 800; image.height = 600;
      // A Discord preview can fail while the original attachment still works.
      // Retry the original once; never loop on two unavailable URLs.
      image.addEventListener('load',()=>{card.classList.remove('is-loading','photo-unavailable');card.setAttribute('aria-busy','false');image.hidden=false;placeholder.remove();});
      let usedOriginal = photo.thumbnail === photo.url;
      image.addEventListener('error', () => {
        if (!usedOriginal) {
          usedOriginal = true;
          image.removeAttribute('srcset'); image.src = photo.url;
          return;
        }
        image.hidden = true;card.classList.remove('is-loading');card.setAttribute('aria-busy','false');placeholder.textContent='↗';card.classList.add('photo-unavailable');
      });
      if(window.EUROFEST_PHOTO_CACHE)window.EUROFEST_PHOTO_CACHE.bind(image,photo);else image.src=photo.thumbnail;
      const overlay = node('span', 'photo-card-meta'); overlay.append(node('span', '', dateLabel(photo.date)), node('span', 'photo-expand', '↗'));
      card.append(image, placeholder, overlay); card.addEventListener('click', () => openPhoto(photo.id, card)); cards.push(card);cardCache.set(key,card);
    }
    const desired=new Set(cards);
    // Keep existing nodes and image downloads when nothing changed.
    [...grid.children].forEach(card=>{if(!desired.has(card))card.remove();});
    cards.forEach((card,index)=>{if(grid.children[index]!==card)grid.insertBefore(card,grid.children[index]||null);});
    const validKeys=new Set(photos.map(photo=>JSON.stringify([photo,locale()])));
    for(const key of cardCache.keys())if(!validKeys.has(key))cardCache.delete(key);
    if (!photos.length) grid.append(node('p', 'community-empty', t(state === 'ok' ? 'Фотографії незабаром з’являться тут.' : state === 'loading' ? 'Завантажуємо фотографії…' : 'Галерея тимчасово недоступна. Спробуй оновити сторінку пізніше.')));
    window.EUROFEST_PHOTO_CACHE?.ahead(photos,visible,6);
    more.hidden = displayed.length >= photos.length;
    byId('photos-count').textContent = t(`Показано ${displayed.length} із ${photos.length}`);
    status.textContent = statusText();
  }
  const nextOriginal = new Image();nextOriginal.decoding='async';
  function displayPhoto() {
    const index = photos.findIndex(photo => photo.id === activeId), photo = photos[index];
    if (!photo) { if (dialog.open) dialog.close(); return; }
    error.hidden = true; full.hidden = false;
    if(full.getAttribute('src')!==photo.url){full.parentElement.classList.add('is-loading');full.src = photo.url;} full.alt = photo.caption || t('Фото з події EUROFEST');
    byId('photo-caption').textContent = photo.caption;
    byId('photo-position').textContent = `${index + 1} / ${photos.length}`;
    byId('photo-original').href = photo.url;
    window.EUROFEST_PHOTO_CACHE?.ahead(photos,index+1,6);
    const next=photos[(index+1)%photos.length];if(next && next.url!==photo.url && nextOriginal.src!==next.url)nextOriginal.src=next.url;
    byId('photo-prev').disabled = photos.length < 2; byId('photo-next').disabled = photos.length < 2;
  }
  function openPhoto(id, button) {
    activeId = id; trigger = button; displayPhoto();
    dialog.showModal(); document.body.classList.add('dialog-open'); byId('photo-close').focus();
  }
  function move(step) {
    if (!photos.length) return;
    const index = photos.findIndex(photo => photo.id === activeId);
    activeId = photos[(index + step + photos.length) % photos.length].id; displayPhoto();
  }
  full.addEventListener('load',()=>{full.parentElement.classList.remove('is-loading');full.hidden=false;error.hidden=true;});
  full.addEventListener('error', () => {full.parentElement.classList.remove('is-loading');full.hidden = true; error.hidden = false; });
  byId('photo-close').addEventListener('click', () => dialog.close());
  byId('photo-prev').addEventListener('click', () => move(-1)); byId('photo-next').addEventListener('click', () => move(1));
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    const replacement = [...grid.querySelectorAll('[data-photo-id]')].find(card => card.dataset.photoId === activeId);
    (trigger?.isConnected ? trigger : replacement || refresh).focus(); activeId = '';full.parentElement.classList.remove('is-loading');full.removeAttribute('src');nextOriginal.removeAttribute('src');
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  document.addEventListener('keydown', event => { if (dialog.open && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } });
  let swipe = null;
  full.addEventListener('pointerdown', event => { if (event.pointerType === 'touch' && event.isPrimary) swipe = { x: event.clientX, y: event.clientY }; }, { passive: true });
  full.addEventListener('pointercancel', () => { swipe = null; });
  full.addEventListener('pointerup', event => { if (swipe && event.pointerType === 'touch') { const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1); } swipe = null; }, { passive: true });
  more.addEventListener('click', () => { visible += 24; render(); const next = grid.children[Math.max(0, visible - 24)]; next?.focus({ preventScroll: true }); });
  async function load() {
    if (loading) return;
    loading = true; refresh.disabled = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(endpoint.href, { signal: controller.signal, credentials: 'omit', cache: 'no-cache' });
      if (!response.ok) throw Error('unavailable');
      const data = await response.json();
      if (!['ok', 'loading', 'unavailable', 'not_configured', 'stale'].includes(data.status) || (data.data !== null && !Array.isArray(data.data))) throw Error('invalid');
      state = data.status; lastUpdated = data.updated_at || '';
      photos = (data.data || []).slice(0, 500).filter(photo => typeof photo.id === 'string' && safeImage(photo.url)).map(photo => ({ ...photo, thumbnail: safeImage(photo.thumbnail) || safeImage(photo.url), caption: String(photo.caption || '').slice(0, 240) }));
      if(['ok','stale'].includes(state) && Array.isArray(data.data))window.EUROFEST_PHOTO_CACHE?.setPhotos(photos);
      loaded = true; render();
      if (dialog.open) displayPhoto();
    } catch (_) {
      state = loaded && photos.length ? 'stale' : 'unavailable';
      if (!lastUpdated || Date.now() - Date.parse(lastUpdated) > 600000) { photos = []; if (dialog.open) dialog.close(); }
      render();
    } finally { loading = false; refresh.disabled = false; clearTimeout(timeout); }
  }
  refresh.addEventListener('click', load);
  document.addEventListener('eurofest:language', () => { render(); if (dialog.open) displayPhoto(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  setInterval(() => { if (!document.hidden) load(); }, 60000);
  load();
})();
