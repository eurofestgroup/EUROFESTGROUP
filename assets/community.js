(() => {
  'use strict';
  const config = window.EUROFEST_CONFIG || {};
  const base = new URL(config.apiUrl || '/api/events', location.href);
  base.pathname = base.pathname.replace(/\/api\/events\/?$/, '/api/community');
  base.search = ''; base.hash = '';
  const url = config.communityApiUrl || base.href;
  const labels = { founder: 'Засновник', senior: 'Вище керівництво', management: 'Керівництво' };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const safe = value => {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; }
    catch (_) { return ''; }
  };
  const link = (label, url, className = 'text-link') => {
    const node = el('a', className, label);
    node.href = safe(url) || 'https://truckersmp.com/vtc/76299';
    node.target = '_blank'; node.rel = 'noopener noreferrer';
    return node;
  };
  const picture = (url, name, className) => {
    const wrap = el('div', className);
    const fallback = el('span', 'image-initials', Array.from(name || 'EF').slice(0, 2).join('').toUpperCase());
    fallback.setAttribute('aria-hidden', 'true'); wrap.append(fallback);
    if (safe(url)) {
      const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.addEventListener('load', () => { fallback.hidden = true; });
      img.addEventListener('error', () => { img.remove(); fallback.hidden = false; }, { once: true });
      img.src = safe(url); wrap.append(img);
    }
    return wrap;
  };
  const stamp = value => {
    if (!value) return '';
    // TMP's date strings represent UTC even when no zone suffix is supplied.
    const normalized = /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : value.replace(' ', 'T') + 'Z';
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(window.EUROFEST_I18N?.locale || 'uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' }).format(date);
  };
  const status = (key, state) => {
    const node = document.getElementById(`${key}-status`);
    const labels = { loading: 'Завантажуємо…', unavailable: 'Тимчасово не вдалося завантажити дані.', not_configured: 'Знайомся з командою в нашому Discord.', stale: 'Показуємо останні отримані дані. Оновлення тимчасово недоступне.' };
    node.textContent = labels[state.status] || (state.updated_at ? `Оновлено ${new Date(state.updated_at).toLocaleTimeString(window.EUROFEST_I18N?.locale || 'uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })} · Київ` : '');
  };
  const empty = (root, text) => root.append(el('p', 'community-empty', text));
  function renderProfile(state) {
    const data = state.data;
    document.getElementById('vtc-count').textContent = data ? String(data.members_count) : '—';
    document.getElementById('vtc-verification').textContent = !data ? 'Немає даних' : data.verified ? 'Verified' : data.validated ? 'Validated' : 'Без верифікації';
    document.getElementById('vtc-verification').classList.toggle('is-verified', !!(data?.verified || data?.validated));
    status('profile', state);
  }
  function renderNews(state) {
    const root = document.getElementById('news-grid'); root.replaceChildren(); root.setAttribute('aria-busy', 'false');
    if (!state.data?.length) empty(root, state.data ? 'Нові історії EUROFEST незабаром з’являться тут.' : 'Публікації доступні на сторінці компанії у TruckersMP.');
    (state.data || []).forEach((item, i) => {
      const card = el('article', `community-card news-card liquid-glass${i === 0 ? ' news-featured' : ''}`);
      const meta = el('div', 'news-meta');
      meta.append(el('span', '', item.pinned ? 'ЗАКРІПЛЕНО' : 'EUROFEST JOURNAL'), el('span', '', stamp(item.published_at)));
      const title = el('h3'); title.setAttribute('data-no-i18n', ''); title.append(link(item.title, item.url, 'news-title'));
      card.append(meta, title, el('p', 'news-summary', item.summary || 'Читайте повну публікацію на TruckersMP.'));
      if (item.summary) card.querySelector('.news-summary').setAttribute('data-no-i18n', '');
      const foot = el('div', 'news-foot'); foot.append(el('span', '', item.author || 'EUROFEST GROUP'), link('Читати новину ↗', item.url));
      card.append(foot); root.append(card);
    });
    status('news', state);
  }
  function renderTeam(state) {
    const root = document.getElementById('team-grid'); root.replaceChildren(); root.setAttribute('aria-busy', 'false');
    if (!state.data?.length) empty(root, state.data ? 'Команда формується. Познайомитися з нами можна в Discord.' : 'Наша команда — у Discord.');
    for (const tier of ['founder', 'senior', 'management']) {
      const people = (state.data || []).filter(person => person.tier === tier);
      if (!people.length) continue;
      const group = el('div', 'team-group'); group.append(el('h3', 'team-group-title', labels[tier]));
      const list = el('div', 'team-members');
      people.forEach(person => {
        const card = el('article', 'community-card person-card liquid-glass ' + (tier === 'founder' ? 'founder-card' : ''));
        card.append(picture(person.avatar, person.name, 'person-avatar'));
        const copy = el('div', 'person-copy'); copy.append(el('span', 'person-role', labels[tier]), el('h4', '', person.name), link('Профіль Discord ↗', person.url));
        copy.querySelector('h4').setAttribute('data-no-i18n', '');
        card.append(copy); list.append(card);
      });
      group.append(list); root.append(group);
    }
    status('team', state);
  }
  function renderPartners(state) {
    const root = document.getElementById('partners-grid'); root.replaceChildren(); root.setAttribute('aria-busy', 'false');
    if (!state.data?.length) empty(root, state.data ? 'Підтверджені партнерства з’являтимуться тут.' : 'Список партнерів тимчасово недоступний.');
    (state.data || []).forEach(partner => {
      const card = link('', partner.url, 'community-card partner-card liquid-glass');
      card.append(picture(partner.logo, partner.name, 'partner-logo'), el('h3', '', partner.name), el('span', 'partner-arrow', '↗'));
      card.querySelector('h3').setAttribute('data-no-i18n', '');
      root.append(card);
    });
    status('partners', state);
  }
  let busy = false, last = null;
  async function refresh() {
    if (busy) return;
    busy = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      for (const key of ['profile', 'news', 'team', 'partners']) if (!data[key] || !('status' in data[key])) throw new Error('invalid');
      if (data.profile.data && typeof data.profile.data.members_count !== 'number') throw new Error('invalid');
      for (const key of ['news', 'team', 'partners']) if (data[key].data !== null && !Array.isArray(data[key].data)) throw new Error('invalid');
      last = { data, received: Date.now() };
      renderProfile(data.profile); renderNews(data.news); renderTeam(data.team); renderPartners(data.partners);
      const invite = safe(data.invite_url);
      if (invite && /^https:\/\/discord\.com\/channels\/\d+\/1352090871830417582$/.test(invite)) {
        document.querySelectorAll('[data-invite-event]').forEach(a => { a.href = invite; });
        document.getElementById('invite-hint').textContent = 'Відкриється канал запрошень EUROFEST. Для доступу приєднайся до нашого Discord.';
      }
    } catch (_) {
      const missing = { status: 'unavailable', data: null };
      if (!last) { renderProfile(missing); renderNews(missing); renderTeam(missing); renderPartners(missing); }
      else {
        for (const key of ['profile', 'news', 'team', 'partners']) { last.data[key].status = last.data[key].data === null ? 'unavailable' : 'stale'; status(key, last.data[key]); }
        const teamTime = Date.parse(last.data.team.updated_at || '') || last.received;
        if (Date.now() - teamTime > 900000) { last.data.team = missing; renderTeam(missing); }
      }
    } finally { clearTimeout(timeout); busy = false; }
  }
  document.getElementById('community-refresh').addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  document.addEventListener('eurofest:language', () => {
    if (last) { renderProfile(last.data.profile); renderNews(last.data.news); renderTeam(last.data.team); renderPartners(last.data.partners); }
  });
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
