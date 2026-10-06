(() => {
  'use strict';
  const root = document.getElementById('news-grid');
  if (!root) return;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const stamp = value => {
    if (typeof value !== 'string' || !value) return '';
    // TruckersMP dates without a zone suffix represent UTC.
    const normalized = /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : value.replace(' ', 'T') + 'Z';
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(window.EUROFEST_I18N?.locale || 'uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).format(date);
  };
  const link = (text, href, className = 'text-link') => {
    const node = el('a', className, text);
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid');
      node.href = url.href;
    } catch (_) { node.href = 'https://truckersmp.com/vtc/76299/news'; }
    node.target = '_blank'; node.rel = 'noopener noreferrer';
    return node;
  };
  const items = state => (Array.isArray(state.data) ? state.data : []).filter(item => item && typeof item.title === 'string' && typeof item.url === 'string');
  function card(item, featured) {
    const article = el('article', `community-card news-card liquid-glass${featured ? ' news-featured' : ''}`);
    const meta = el('div', 'news-meta');
    meta.append(el('span', '', item.pinned ? 'ЗАКРІПЛЕНО' : 'EUROFEST JOURNAL'), el('span', '', stamp(item.published_at)));
    const title = el('h3'); title.setAttribute('data-no-i18n', ''); title.append(link(item.title, item.url, 'news-title'));
    const summary = el('p', 'news-summary', item.summary || 'Читайте повну публікацію на TruckersMP.');
    if (item.summary) summary.setAttribute('data-no-i18n', '');
    const author = el('span', '', item.author || 'EUROFEST GROUP'); author.setAttribute('data-no-i18n', '');
    const foot = el('div', 'news-foot'); foot.append(author, link('Читати новину ↗', item.url));
    article.append(meta, title, summary, foot);
    return article;
  }
  function updateStatus(state) {
    const labels = { loading: 'Завантажуємо…', unavailable: 'Тимчасово не вдалося завантажити дані.', stale: 'Показуємо останні отримані дані. Оновлення тимчасово недоступне.' };
    const date = new Date(state.updated_at || '');
    document.getElementById('news-status').textContent = labels[state.status] || (Number.isNaN(date.getTime()) ? '' : `Оновлено ${date.toLocaleTimeString(window.EUROFEST_I18N?.locale || 'uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })} · Київ`);
  }
  function empty(state, searching = false) {
    root.append(el('p', 'community-empty', searching ? 'Новин за цим запитом немає.' : state.data ? 'Нові історії EUROFEST незабаром з’являться тут.' : 'Публікації доступні на сторінці компанії у TruckersMP.'));
  }
  window.EUROFEST_NEWS = {
    renderPreview(state) {
      root.replaceChildren(); root.setAttribute('aria-busy', 'false');
      const shown = items(state).slice(0, 6);
      if (!shown.length) empty(state);
      shown.forEach((item, index) => root.append(card(item, index === 0)));
      updateStatus(state);
    }
  };
  if (!document.querySelector('[data-news-list]')) return;

  const config = window.EUROFEST_CONFIG || {};
  const refreshButton = document.getElementById('news-refresh');
  const search = document.getElementById('news-search');
  const previous = document.getElementById('news-previous');
  const next = document.getElementById('news-next');
  const pagination = document.getElementById('news-pagination');
  const count = document.getElementById('news-count');
  const pageLabel = document.getElementById('news-page');
  const pageSize = 12;
  let page = 1, latest = null, busy = false, signature = '';
  let api;
  try {
    const base = new URL(config.apiUrl || '/api/events', location.href);
    base.pathname = base.pathname.replace(/\/events\/?$/, '/news'); base.search = ''; base.hash = '';
    api = new URL(config.newsApiUrl || base.href, location.href);
  } catch (_) { api = null; }
  function render() {
    if (!latest) return;
    const query = search.value.trim().toLocaleLowerCase();
    const selected = items(latest).filter(item => !query || [item.title, item.author, item.summary].join(' ').toLocaleLowerCase().includes(query));
    const pages = Math.max(1, Math.ceil(selected.length / pageSize));
    page = Math.min(page, pages);
    const start = (page - 1) * pageSize;
    const shown = selected.slice(start, start + pageSize);
    pagination.hidden = pages <= 1; previous.disabled = page === 1; next.disabled = page === pages;
    pageLabel.textContent = `Сторінка ${page} із ${pages}`;
    count.textContent = selected.length ? `Показано ${start + 1}–${start + shown.length} із ${selected.length}` : 'Показано 0 із 0';
    const value = JSON.stringify([shown, page, query, window.EUROFEST_I18N?.locale, latest.data === null]);
    if (signature !== value) {
      signature = value;
      root.replaceChildren(); root.setAttribute('aria-busy', 'false');
      if (!shown.length) empty(latest, !!query);
      shown.forEach((item, index) => root.append(card(item, page === 1 && index === 0)));
    }
    updateStatus(latest);
  }
  async function refresh() {
    if (busy) return;
    busy = true; refreshButton.disabled = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 30000);
    try {
      if (!api || !['http:', 'https:'].includes(api.protocol) || (location.protocol === 'https:' && api.protocol !== 'https:')) throw new Error('invalid_api');
      const response = await fetch(api.href, { signal: controller.signal, cache: 'no-cache', credentials: 'omit', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('unavailable');
      const state = await response.json();
      if (!state || typeof state.status !== 'string' || (state.data !== null && !Array.isArray(state.data))) throw new Error('invalid');
      latest = state;
    } catch (error) {
      console.warn('[EUROFEST news API]', error);
      if (latest?.data) latest = { ...latest, status: 'stale' };
      else latest = { data: null, status: 'unavailable' };
    } finally {
      clearTimeout(timeout); busy = false; refreshButton.disabled = false; render();
    }
  }
  function turnPage(offset) {
    page += offset; render();
    const reduce = document.body.classList.contains('effects-off') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('news-title').scrollIntoView({ block: 'start', behavior: reduce ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));
  search.addEventListener('input', () => { page = 1; render(); });
  refreshButton.addEventListener('click', refresh);
  document.addEventListener('eurofest:language', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  refresh();
})();
