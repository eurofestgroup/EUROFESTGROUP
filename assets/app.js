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
  const mobile = window.matchMedia('(max-width: 760px)');
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
  };
  toggle.addEventListener('click', () => {
    effects = !effects; explicitPreference = true; updateEffects();
    try { localStorage.setItem('eurofest-effects', effects ? 'on' : 'off'); } catch (_) {}
  });
  reduceMotion.addEventListener('change', () => { if (!explicitPreference) { effects = !reduceMotion.matches; updateEffects(); } });
  updateEffects();
  document.querySelectorAll('.principle, .convoy-panel, .join-card').forEach(card => card.classList.add('glass-surface'));
  let glowPending = false, glowTarget = null, glowPoint = null;
  document.addEventListener('pointermove', event => {
    if (!effects || reduceMotion.matches || event.pointerType !== 'mouse') return;
    const card = event.target.closest('.glass-surface');
    if (!card) return;
    glowTarget = card; glowPoint = { x: event.clientX, y: event.clientY };
    if (!glowPending) {
      glowPending = true;
      requestAnimationFrame(() => {
        const rect = glowTarget.getBoundingClientRect();
        glowTarget.style.setProperty('--glow-x', `${glowPoint.x - rect.left}px`);
        glowTarget.style.setProperty('--glow-y', `${glowPoint.y - rect.top}px`);
        glowPending = false;
      });
    }
  }, { passive: true });
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
