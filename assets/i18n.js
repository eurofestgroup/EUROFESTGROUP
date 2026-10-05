(() => {
  'use strict';
  const dictionary = window.EUROFEST_TRANSLATIONS || {};
  let language = 'uk';
  try { language = new URLSearchParams(location.search).get('lang') || localStorage.getItem('eurofest-language') || 'uk'; } catch (_) {}
  if (!['uk', 'en'].includes(language)) language = 'uk';
  const history = new WeakMap();
  const translate = source => {
    if (language === 'uk') return source;
    const core = source.trim();
    let text = dictionary[core];
    if (text === undefined) {
      const patterns = [
        [/^Через (\d+) (?:день|дні|днів)$/, (_, n) => `In ${n} ${n === '1' ? 'day' : 'days'}`],
        [/^Оновлено о (.+) · Київ$/, (_, time) => `Updated at ${time} · Kyiv`],
        [/^Оновлено (.+) · Київ$/, (_, time) => `Updated ${time} · Kyiv`],
        [/^(.+) · час за Києвом$/, (_, date) => `${date} · Kyiv time`],
        [/^Карта маршруту: (.+)$/, (_, title) => `Route map: ${title}`],
        [/^Обкладинка події: (.+)$/, (_, title) => `Event cover: ${title}`],
        [/^Деталі: (.+)$/, (_, title) => `Details: ${title}`],
        [/^Маршрут: (.+)$/, (_, title) => `Route: ${title}`],
        [/^Слот: (.+)$/, (_, title) => `Slot: ${title}`],
        [/^Фото: (\d+)$/, (_, n) => `Photos: ${n}`],
        [/^Показано (\d+) із (\d+)$/, (_, n, total) => `Showing ${n} of ${total}`],
        [/^Показано (\d+)–(\d+) із (\d+)$/, (_, first, last, total) => `Showing ${first}–${last} of ${total}`],
        [/^Сторінка (\d+) із (\d+)$/, (_, n, total) => `Page ${n} of ${total}`]
      ];
      for (const [pattern, replace] of patterns) if (pattern.test(core)) { text = core.replace(pattern, replace); break; }
    }
    return text === undefined ? source : source.replace(core, text);
  };
  const translateValue = (node, key, value, set) => {
    let record = history.get(node);
    if (!record) { record = {}; history.set(node, record); }
    if (!record[key] || record[key].rendered !== value) record[key] = { original: value, rendered: value };
    const translated = translate(record[key].original);
    record[key].rendered = translated;
    if (translated !== value) set(translated);
  };
  function apply(root = document.documentElement) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!root.parentElement?.closest('script,style,noscript,[data-no-i18n]')) translateValue(root, 'text', root.nodeValue, value => { root.nodeValue = value; });
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches('script,style,noscript,[data-no-i18n]')) return;
    for (const key of ['aria-label', 'title', 'alt', 'placeholder']) if (root.hasAttribute(key)) translateValue(root, key, root.getAttribute(key), value => root.setAttribute(key, value));
    if (root.matches('meta[name="description"]')) translateValue(root, 'content', root.content, value => { root.content = value; });
    for (const child of root.childNodes) apply(child);
  }
  function updateButtons() {
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  }
  function updateLinks() {
    document.querySelectorAll('a[href]').forEach(anchor => {
      const raw = anchor.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;
      try {
        const url = new URL(raw, location.href);
        if (url.origin === location.origin && /\/(?:index|photos|archive|events|news)\.html$/.test(url.pathname)) {
          url.searchParams.set('lang', language);
          anchor.setAttribute('href', url.pathname + url.search + url.hash);
        }
      } catch (_) {}
    });
  }
  function setLanguage(next) {
    if (!['uk', 'en'].includes(next)) return;
    language = next;
    document.documentElement.lang = language;
    try { localStorage.setItem('eurofest-language', language); } catch (_) {}
    try { const url = new URL(location.href); url.searchParams.set('lang', language); window.history.replaceState(null, '', url); } catch (_) {}
    apply(); updateButtons(); updateLinks();
    document.dispatchEvent(new CustomEvent('eurofest:language', { detail: { language } }));
  }
  window.EUROFEST_I18N = { t: translate, apply, setLanguage, get language() { return language; }, get locale() { return language === 'en' ? 'en-GB' : 'uk-UA'; } };
  document.documentElement.lang = language;
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  apply(); updateButtons(); updateLinks();
  const pending = new Set(); let scheduled = false;
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(node => pending.add(node));
      else pending.add(record.target);
    }
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => { scheduled = false; for (const node of pending) if (node.isConnected) { let parent=node.parentNode, covered=false;while(parent){if(pending.has(parent)){covered=true;break;}parent=parent.parentNode;}if(!covered)apply(node); } pending.clear(); });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'alt', 'title', 'placeholder'] });
})();
