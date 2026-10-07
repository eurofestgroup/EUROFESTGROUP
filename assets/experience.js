(() => {
  'use strict';
  const root = document.documentElement;
  const config = window.EUROFEST_CONFIG || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reduced.matches && !root.classList.contains('effects-off');
  const script = document.currentScript || document.querySelector('script[src*="assets/experience.js"]');
  const base = new URL('../', script?.src || new URL('assets/experience.js', document.baseURI));
  try { sessionStorage.setItem('eurofest-site-base', base.pathname); } catch (_) {}
  root.classList.toggle('gallery-magazine', config.galleryMagazine === true);

  // Reserve the initial card layout while the existing API loaders do their work.
  for (const grid of document.querySelectorAll('#events-grid,#news-grid,#photos-grid')) {
    if (grid.getAttribute('aria-busy') !== 'true') continue;
    const skeletons = document.createElement('div');
    skeletons.className = 'ef-skeleton-grid'; skeletons.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div'); card.className = 'ef-skeleton-card';
      card.innerHTML = '<span class="ef-skeleton-cover"></span><span class="ef-skeleton-line"></span><span class="ef-skeleton-line short"></span>';
      skeletons.append(card);
    }
    grid.prepend(skeletons);
    const observer = new MutationObserver(() => {
      if (!skeletons.isConnected || grid.getAttribute('aria-busy') === 'false' || grid.querySelector('.event-card,.news-card,.photo-card')) {
        observer.disconnect(); skeletons.remove();
      }
    });
    observer.observe(grid, { childList: true, attributes: true, attributeFilter: ['aria-busy'] });
  }
  const prepareImage = img => {
    if (!img.matches('.photo-card img,.event-card img,.person-avatar img,.partner-logo img') || img.dataset.efFade) return;
    img.dataset.efFade = '1'; img.classList.add('ef-image-fade');
    const reveal = () => img.classList.add('ef-image-ready');
    if (img.complete && img.naturalWidth) reveal();
    else img.addEventListener('load', reveal, { once: true });
  };
  document.querySelectorAll('img').forEach(prepareImage);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.tagName === 'IMG') prepareImage(node);
      node.querySelectorAll('img').forEach(prepareImage);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Four persistent destinations, within the current GitHub project directory.
  const icons = [
    '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/>',
    '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8m-8 4h8m-8 4h4"/>',
    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>'
  ];
  const destinations = [
    ['index.html', 'Головна'], ['events.html', 'Події'],
    ['news.html', 'Новини'], ['photos.html', 'Фото']
  ];
  const dock = document.createElement('nav');
  dock.className = 'mobile-dock';
  dock.setAttribute('aria-label', 'Швидка навігація');
  const current = location.pathname.split('/').pop() || 'index.html';
  destinations.forEach(([file, label], index) => {
    const link = document.createElement('a');
    link.dataset.page = file;
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[index] + '</svg>';
    const text = document.createElement('span'); text.textContent = label;
    link.append(text);
    if (file === current || (current === 'archive.html' && file === 'events.html')) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', file === current ? 'page' : 'location');
    }
    dock.append(link);
  });
  document.body.append(dock); document.body.classList.add('has-mobile-dock');
  const localAnchors = document.querySelector('base')
    ? [...document.querySelectorAll('a[href^="#"]')].map(link => [link, link.getAttribute('href')])
    : [];
  function updateDock() {
    dock.querySelectorAll('a').forEach(link => {
      const url = new URL(link.dataset.page, base);
      url.searchParams.set('lang', window.EUROFEST_I18N?.language || 'uk');
      link.href = url.pathname + url.search;
    });
    localAnchors.forEach(([link, hash]) => { link.href = location.pathname + location.search + hash; });
    window.EUROFEST_I18N?.apply(dock);
  }
  document.addEventListener('eurofest:language', updateDock); updateDock();

  // Native cross-document transitions, with a short fade for older browsers.
  const nativeTransitions = typeof document.startViewTransition === 'function' && 'onpageswap' in window && 'onpagereveal' in window;
  let navigationToken = 0, departing = false, pageAnimation = null;
  window.addEventListener('pageshow', () => {
    navigationToken++; departing = false; pageAnimation?.cancel(); pageAnimation = null;
    if (!nativeTransitions && motionAllowed() && typeof document.body.animate === 'function') {
      pageAnimation = document.body.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin || !url.pathname.startsWith(base.pathname) || !/\/(?:index|events|news|photos|archive|404)\.html$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (nativeTransitions || !motionAllowed() || typeof document.body.animate !== 'function') return;
    event.preventDefault();
    if (departing) return;
    departing = true; const token = ++navigationToken; pageAnimation?.cancel();
    pageAnimation = document.body.animate([{ opacity: 1 }, { opacity: .2 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    pageAnimation.finished.catch(() => {}).then(() => { if (token === navigationToken) location.assign(url.href); });
  });

  // Pointer and keyboard feedback uses one small, reusable highlight per button.
  const pressSelector = '.button,.nav-discord,.event-open,.photo-control,.event-close,.effects-toggle,.community-footer button,.event-filters button,.language-switch button,.mobile-dock a,.gallery-actions button,#events-refresh';
  let pressed = null;
  function releasePress() { pressed?.classList.remove('is-pressed'); pressed = null; }
  function press(target) {
    if (!motionAllowed() || target.disabled) return;
    releasePress(); pressed = target;
    target.classList.add('glass-pressable', 'is-pressed');
    if (getComputedStyle(target).position === 'static') target.classList.add('press-relative');
    let glint = target.querySelector('.press-glint');
    if (!glint) {
      glint = document.createElement('span'); glint.className = 'press-glint';
      glint.setAttribute('aria-hidden', 'true'); target.append(glint);
    }
    glint.getAnimations?.().forEach(animation => animation.cancel());
    glint.animate?.([
      { opacity: 0, transform: 'translateX(-65%)' },
      { opacity: .8, offset: .32 },
      { opacity: 0, transform: 'translateX(65%)' }
    ], { duration: 380, easing: 'ease-out' });
  }
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const button = event.target.closest?.(pressSelector); if (button) press(button);
  }, { passive: true });
  ['pointerup', 'pointercancel'].forEach(name => document.addEventListener(name, releasePress, { passive: true }));
  document.addEventListener('keydown', event => {
    if (event.repeat || !['Enter', ' '].includes(event.key)) return;
    const button = event.target.closest?.(pressSelector); if (button) press(button);
  });
  document.addEventListener('keyup', releasePress);
  window.addEventListener('blur', releasePress);

  // One clipped image morphs between a thumbnail and the actual image bounds.
  let zoom = null;
  function stopZoom() {
    const old = zoom; zoom = null;
    if (!old) return;
    clearTimeout(old.timeout); old.animation?.cancel();
    old.layer?.remove(); old.dialog.classList.remove('photo-motion-running');
  }
  function capture(button) {
    const image = button?.querySelector('img');
    if (!motionAllowed() || !image?.complete || !image.naturalWidth || image.hidden || typeof image.animate !== 'function') return null;
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight, rect, radius: parseFloat(getComputedStyle(button).borderTopLeftRadius) || 16 };
  }
  function fit(image, ratio) {
    const box = image.getBoundingClientRect();
    const width = Math.min(box.width, box.height * ratio), height = width / ratio;
    return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
  }
  function clippedFrame(small, large, radius) {
    const scale = Math.max(small.width / large.width, small.height / large.height);
    const x = small.left + small.width / 2 - large.left - large.width / 2;
    const y = small.top + small.height / 2 - large.top - large.height / 2;
    const insetX = Math.max(0, (large.width - small.width / scale) / 2);
    const insetY = Math.max(0, (large.height - small.height / scale) / 2);
    return {
      transform: 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')',
      clipPath: 'inset(' + insetY + 'px ' + insetX + 'px round ' + radius / scale + 'px)'
    };
  }
  function layer(dialog, source, rect) {
    const node = document.createElement('div'); node.className = 'photo-zoom-layer'; node.setAttribute('aria-hidden', 'true');
    Object.assign(node.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    const image = document.createElement('img'); image.alt = ''; image.src = source;
    node.append(image); dialog.append(node); dialog.classList.add('photo-motion-running');
    return node;
  }
  const expanded = { transform: 'none', clipPath: 'inset(0px 0px round 8px)' };
  function openZoom(dialog, full, snapshot) {
    stopZoom();
    if (!snapshot || !motionAllowed() || !dialog.open) return;
    dialog.classList.add('photo-motion-running');
    const target = fit(full, snapshot.width / snapshot.height);
    if (!target.width || !target.height) { dialog.classList.remove('photo-motion-running'); return; }
    const node = layer(dialog, snapshot.src, target);
    const state = { dialog, full, layer: node, animation: null, ready: full.complete && full.naturalWidth > 0, timeout: 0 };
    zoom = state;
    state.animation = node.animate([clippedFrame(snapshot.rect, target, snapshot.radius), expanded], { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    state.animation.finished.catch(() => {}).then(() => { if (zoom === state && state.ready) stopZoom(); });
    // Keep the sharp-enough preview visible if the original is still arriving.
    state.timeout = setTimeout(() => { if (zoom === state) stopZoom(); }, 13000);
  }
  function settleZoom() {
    if (!zoom) return;
    zoom.ready = true;
    if (zoom.animation?.playState !== 'running') stopZoom();
  }
  function closeZoom(dialog, full, button) {
    const snapshot = capture(button);
    stopZoom();
    if (!motionAllowed() || typeof dialog.animate !== 'function') return null;
    const visible = snapshot && snapshot.rect.bottom > 0 && snapshot.rect.top < innerHeight && snapshot.rect.right > 0 && snapshot.rect.left < innerWidth;
    if (!visible || full.hidden) {
      const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
      const state = { dialog, animation }; zoom = state;
      return animation.finished.catch(() => {}).then(() => { if (zoom === state) stopZoom(); });
    }
    const loaded = full.complete && full.naturalWidth > 0;
    const rect = fit(full, loaded ? full.naturalWidth / full.naturalHeight : snapshot.width / snapshot.height);
    if (!rect.width || !rect.height) return null;
    const node = layer(dialog, loaded ? full.currentSrc || full.src : snapshot.src, rect);
    const state = { dialog, layer: node, animation: null }; zoom = state;
    state.animation = node.animate([expanded, clippedFrame(snapshot.rect, rect, snapshot.radius)], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    return state.animation.finished.catch(() => {}).then(() => { if (zoom === state) stopZoom(); });
  }
  window.EUROFEST_PHOTO_MOTION = { capture, open: openZoom, close: closeZoom, settle: settleZoom, stop: stopZoom };

  // The video never gets a src on a phone, with reduced motion or data saving.
  const video = document.getElementById('hero-video');
  const hero = video?.closest('.hero');
  const desktop = window.matchMedia('(min-width: 1101px)');
  const connection = navigator.connection;
  let videoReady = false, heroVisible = true, videoFailed = false, startingVideo = false;
  const videoEligible = () => config.heroVideo === true && videoReady && desktop.matches && motionAllowed() && !document.hidden && heroVisible && !videoFailed && !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType);
  function syncVideo() {
    if (!video) return;
    if (!videoEligible()) { if (!video.paused) video.pause(); hero.classList.remove('hero-video-ready'); return; }
    if (!video.hasAttribute('src')) {
      const source = video.dataset.webm && video.canPlayType('video/webm;codecs="vp9"') ? video.dataset.webm : video.dataset.src;
      video.muted = true; video.src = new URL(source, base).href;
    }
    if (!video.paused || startingVideo) return;
    startingVideo = true;
    const play = video.play();
    Promise.resolve(play).catch(() => { hero.classList.remove('hero-video-ready'); }).finally(() => { startingVideo = false; });
  }
  if (video && config.heroVideo === true) {
    video.addEventListener('playing', () => { if (videoEligible()) hero.classList.add('hero-video-ready'); else syncVideo(); });
    video.addEventListener('error', () => { videoFailed = true; hero.classList.remove('hero-video-ready'); video.removeAttribute('src'); video.load(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; syncVideo(); }, { threshold: .01 });
      observer.observe(hero);
    }
    desktop.addEventListener('change', syncVideo);
    connection?.addEventListener?.('change', syncVideo);
    setTimeout(() => { videoReady = true; syncVideo(); }, 8000);
  }
  function updateMotion() {
    root.classList.toggle('motion-suppressed', !motionAllowed());
    const policy = document.getElementById('eurofest-navigation-policy');
    const navigation = '@view-transition{navigation:' + (nativeTransitions && motionAllowed() ? 'auto' : 'none') + '}';
    if (policy && policy.textContent !== navigation) policy.textContent = navigation;
    if (!motionAllowed()) {
      releasePress(); stopZoom();
      document.querySelectorAll('.press-glint').forEach(glint => glint.getAnimations?.().forEach(animation => animation.cancel()));
      pageAnimation?.cancel();
    }
    syncVideo();
  }
  document.addEventListener('eurofest:effects', updateMotion);
  reduced.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releasePress(); syncVideo(); });
  updateMotion();
})();
