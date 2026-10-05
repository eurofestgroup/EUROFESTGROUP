(() => {
  'use strict';
  // Public links are editable here. No secrets or accounts are needed.
  const discordUrl = 'https://discord.gg/qk5h7AK7Z4';
  document.querySelectorAll('[data-link="discord"]').forEach(link => { link.href = discordUrl; });
  document.getElementById('year').textContent = new Date().getFullYear();
  const menu = document.querySelector('.menu-button');
  const nav = document.getElementById('navigation');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.header')) setMenu(false); });
  const mobile = window.matchMedia('(max-width: 1100px)');
  mobile.addEventListener('change', () => setMenu(false));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.effects-toggle');
  let effects = !reduceMotion.matches;
  let explicitPreference = false;
  try {
    const saved = localStorage.getItem('eurofest-effects');
    if (saved !== null) { effects = saved === 'on'; explicitPreference = true; }
  } catch (_) { /* The site also works with storage blocked. */ }
  const updateEffects = () => {
    document.documentElement.classList.toggle('effects-off', !effects);
    toggle.setAttribute('aria-pressed', String(effects));
    toggle.textContent = effects ? 'Ефекти: увімкнено' : 'Ефекти: вимкнено';
    if (!effects) document.querySelectorAll('.liquid-glass.is-lit').forEach(surface => surface.classList.remove('is-lit'));
  };
  toggle.addEventListener('click', () => {
    effects = !effects; explicitPreference = true; updateEffects();
    try { localStorage.setItem('eurofest-effects', effects ? 'on' : 'off'); } catch (_) {}
  });
  reduceMotion.addEventListener('change', () => { if (!explicitPreference) { effects = !reduceMotion.matches; updateEffects(); } });
  updateEffects();
  document.querySelectorAll('.principle, .convoy-panel, .join-card').forEach(card => card.classList.add('glass-surface'));
  const glassSelector = '.photo-card, .community-card, .header, .nav-discord, .button, .principle, .convoy-panel, .join-card, .event-filters, .event-filters button, .event-card, .event-date, .event-open, .events-empty, .event-dialog, .event-close, .effects-toggle, .faq details';
  const decorateGlass = root => {
    if (root.matches?.(glassSelector)) root.classList.add('liquid-glass');
    root.querySelectorAll(glassSelector).forEach(surface => surface.classList.add('liquid-glass'));
  };
  decorateGlass(document);
  // Cards and dialog controls are created after the events API responds.
  if ('MutationObserver' in window) {
    const glassObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) decorateGlass(node);
      }));
    });
    ['events-grid', 'event-detail'].forEach(id => {
      const root = document.getElementById(id);
      if (root) glassObserver.observe(root, { childList: true, subtree: true });
    });
  }
  let glowFrame = 0, glowTarget = null, glowPoint = null, litSurface = null;
  const clearGlassLight = () => {
    if (glowFrame) cancelAnimationFrame(glowFrame);
    glowFrame = 0;
    litSurface?.classList.remove('is-lit');
    litSurface = glowTarget = glowPoint = null;
  };
  document.addEventListener('pointermove', event => {
    if (!effects || reduceMotion.matches || document.hidden || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || event.pointerType !== 'mouse') {
      clearGlassLight(); return;
    }
    const surface = event.target.closest?.(glassSelector);
    if (!surface) { clearGlassLight(); return; }
    glowTarget = surface; glowPoint = { x: event.clientX, y: event.clientY };
    if (!glowFrame) {
      glowFrame = requestAnimationFrame(() => {
        glowFrame = 0;
        if (!effects || reduceMotion.matches || !glowTarget?.isConnected || !glowPoint) { clearGlassLight(); return; }
        const rect = glowTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) { clearGlassLight(); return; }
        const x = Math.max(0, Math.min(100, (glowPoint.x - rect.left) / rect.width * 100));
        const y = Math.max(0, Math.min(100, (glowPoint.y - rect.top) / rect.height * 100));
        if (litSurface !== glowTarget) litSurface?.classList.remove('is-lit');
        glowTarget.style.setProperty('--glass-x', `${x.toFixed(2)}%`);
        glowTarget.style.setProperty('--glass-y', `${y.toFixed(2)}%`);
        glowTarget.classList.add('is-lit');
        litSurface = glowTarget;
      });
    }
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) clearGlassLight(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearGlassLight(); });
  window.addEventListener('blur', clearGlassLight);
  window.addEventListener('scroll', clearGlassLight, { passive: true });
  reduceMotion.addEventListener('change', clearGlassLight);
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  }
  const progress = document.querySelector('.scroll-progress');
  let pending = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
    pending = false;
  };
  window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
})();
