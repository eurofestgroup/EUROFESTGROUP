'use strict';
const BASE = new URL('./',self.location.href);
const CACHE = 'eurofest-shell-premium-20261006-' + BASE.pathname.replace(/[^a-zA-Z0-9]/g,'_');
const PREFIX = 'eurofest-shell-';
const ASSETS = ['index.html','photos.html','archive.html','events.html','news.html','assets/config.js','assets/premium.css?v=premium-20261006','assets/premium.js?v=premium-20261006','assets/style.css','assets/glass.css?v=glass-restored-20261005','assets/community.css?v=glass-restored-20261005','assets/responsive.css?v=photos-20261005','assets/photos.css?v=preview-fix-20261005','assets/archive.css','assets/lists.css?v=preview-6-20261005','assets/news.js?v=preview-6-20261005','assets/polish.css?v=dlc-links-20261005','assets/translations.js?v=dlc-lookup-20261005','assets/i18n.js?v=lists-20261005','assets/app.js?v=polish-20261005','assets/gallery.js?v=dlc-lookup-20261005','assets/community.js?v=lists-20261005','assets/photos.js?v=polish-20261005','assets/photo-cache.js?v=device-cache-20261005','assets/photo-preview-worker.js','assets/logo.webp','assets/convoy.webp','assets/brand-background.webp','assets/favicon.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const store=await caches.open(CACHE);for(const path of ASSETS){try{const url=new URL(path,BASE);const response=await fetch(url,{cache:'reload'});if(response.ok)await store.put(url,response);}catch(_){}}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const suffix=BASE.pathname.replace(/[^a-zA-Z0-9]/g,'_');for(const name of await caches.keys())if(name.startsWith(PREFIX) && name.endsWith('-'+suffix) && name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET' || url.origin!==BASE.origin || !url.pathname.startsWith(BASE.pathname) || url.pathname.includes('/__photo_cache/') || url.pathname.includes('/api/'))return;
  if(request.mode==='navigate' || url.pathname.endsWith('/config.js')){
    event.respondWith((async()=>{const store=await caches.open(CACHE);try{const response=await fetch(request);if(response.ok)await store.put(request,response.clone());return response;}catch(error){const cached=await store.match(request,{ignoreSearch:true});if(cached)return cached;throw error;}})());return;
  }
  if(!url.pathname.startsWith(new URL('assets/',BASE).pathname))return;
  event.respondWith((async()=>{const store=await caches.open(CACHE),cached=await store.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await store.put(request,response.clone());return response;})());
});
