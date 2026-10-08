'use strict';
const BASE = new URL('./',self.location.href);
const CACHE = 'eurofest-shell-refined-loop-20261007-' + BASE.pathname.replace(/[^a-zA-Z0-9]/g,'_');
const PREFIX = 'eurofest-shell-';
const ASSETS = ['index.html','photos.html','archive.html','events.html','news.html','404.html','assets/config.js','assets/premium.css?v=v5-20261006e','assets/premium.js?v=v5-20261006e','assets/style.css','assets/glass.css?v=glass-restored-20261005','assets/community.css?v=glass-restored-20261005','assets/responsive.css?v=photos-20261005','assets/photos.css?v=preview-fix-20261005','assets/archive.css','assets/lists.css?v=api-fix-20261006','assets/news.js?v=api-fix-20261006','assets/polish.css?v=dlc-links-20261005','assets/translations.js?v=polish-20261007','assets/i18n.js?v=polish-20261007','assets/app.js?v=polish-20261007','assets/gallery.js?v=api-fix-20261006','assets/community.js?v=api-fix-20261006','assets/photos.js?v=polish-20261007','assets/photo-cache.js?v=device-cache-20261005','assets/photo-preview-worker.js','assets/logo.webp','assets/convoy.webp','assets/brand-background.webp','assets/favicon.png','assets/experience.css?v=polish-20261007','assets/experience.js?v=polish-20261007','assets/fonts/eurofest-regular.woff2','assets/fonts/eurofest-medium.woff2','assets/fonts/eurofest-bold.woff2'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const store=await caches.open(CACHE);for(const path of ASSETS){try{const url=new URL(path,BASE);const response=await fetch(url,{cache:'reload'});if(response.ok)await store.put(url,response);}catch(_){}}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const suffix=BASE.pathname.replace(/[^a-zA-Z0-9]/g,'_');for(const name of await caches.keys())if(name.startsWith(PREFIX) && name.endsWith('-'+suffix) && name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET' || url.origin!==BASE.origin || !url.pathname.startsWith(BASE.pathname) || url.pathname.includes('/__photo_cache/') || url.pathname.includes('/api/') || /\.(?:mp4|webm)$/i.test(url.pathname))return;
  if(request.mode==='navigate' || url.pathname.endsWith('/config.js')){
    event.respondWith((async()=>{const store=await caches.open(CACHE);try{const response=await fetch(request);if(response.ok)await store.put(request,response.clone());return response;}catch(error){const cached=await store.match(request,{ignoreSearch:true});if(cached)return cached;throw error;}})());return;
  }
  if(!url.pathname.startsWith(new URL('assets/',BASE).pathname))return;
  event.respondWith((async()=>{const store=await caches.open(CACHE),cached=await store.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await store.put(request,response.clone());return response;})());
});
