(() => {
  'use strict';
  const scriptBase = new URL('.', document.currentScript?.src || new URL('assets/photo-cache.js',document.baseURI).href);
  const siteBase = new URL('../', scriptBase);
  const namespace = siteBase.pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'root';
  const cacheName = `eurofest-photos-v1-${namespace}`;
  const MAX_BYTES = 100 * 1024 * 1024;
  const MAX_FILE = 20 * 1024 * 1024;
  const config = window.EUROFEST_CONFIG || {};
  const endpoint = new URL(config.apiUrl || '/api/events', location.href);
  endpoint.pathname = endpoint.pathname.replace(/\/api\/events\/?$/, '/api/photos'); endpoint.search = ''; endpoint.hash = '';
  const valid = value => {
    try { const u=new URL(value); return u.protocol==='https:' && ['cdn.discordapp.com','media.discordapp.net'].includes(u.hostname) && u.pathname.startsWith('/attachments/') && !u.username && !u.password ? u : null; } catch (_) { return null; }
  };
  const key = photo => { const u=valid(photo.url);return u ? new URL(`__photo_cache/${encodeURIComponent(u.pathname)}`,siteBase).href : ''; };
  const supported = 'caches' in window && typeof Response !== 'undefined';
  let storagePromise = supported ? caches.open(cacheName).catch(()=>null) : Promise.resolve(null);
  let photos=[], running=0, warmed=false, fetchBusy=false, worker=null, workerFailed=false, workerSerial=0, retryTimer=0;
  let cleanupScheduled=false;
  const queue=[], jobs=new Map(), recentFailures=new Map(), objects=new Map(), bindings=new Set();
  let writes=Promise.resolve();
  const validPhoto = photo => photo && typeof photo.id==='string' && /^\d+$/.test(photo.id) && valid(photo.url);
  async function cached(photo) {
    const store=await storagePromise;
    if(!store)return null;
    try {const response=await store.match(key(photo));return response ? await response.blob() : null;} catch(_){return null;}
  }
  async function save(photo,blob) {
    writes=writes.catch(()=>{}).then(async()=>{
      if(!photos.some(item=>key(item)===key(photo)))return;
      const store=await storagePromise;if(!store || blob.size>MAX_BYTES)return;
      try {
        const entries=await store.keys();let total=0;const oldest=[];
        for(const request of entries){const response=await store.match(request);const size=Number(response?.headers.get('X-Photo-Bytes'))||0;total+=size;oldest.push({request,size,date:Number(response?.headers.get('X-Photo-Time'))||0});}
        const existing=oldest.find(item=>item.request.url===key(photo));if(existing)total-=existing.size;
        let count=oldest.length;for(const item of oldest.sort((a,b)=>a.date-b.date)){if(total+blob.size<=MAX_BYTES && count<500)break;if(item===existing)continue;await store.delete(item.request);total-=item.size;count--;}
        if(!photos.some(item=>key(item)===key(photo)))return;
        await store.put(key(photo),new Response(blob,{headers:{'Content-Type':blob.type||'image/webp','X-Photo-Bytes':String(blob.size),'X-Photo-Time':String(Date.now())}}));
      } catch(_){
        // Private mode/quota exhaustion must not break the gallery.
        try {const oldest=(await store.keys()).slice(0,20);for(const request of oldest)await store.delete(request);await store.put(key(photo),new Response(blob,{headers:{'Content-Type':blob.type||'image/webp','X-Photo-Bytes':String(blob.size),'X-Photo-Time':String(Date.now())}}));}catch(_){}
      }
    });
    await writes;
  }
  async function readImage(url) {
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(url,{signal:controller.signal,mode:'cors',credentials:'omit',cache:'force-cache',referrerPolicy:'no-referrer'});
      if(!response.ok || response.type==='opaque')throw Error('image_unavailable');
      if(Number(response.headers.get('Content-Length')||0)>MAX_FILE)throw Error('large');
      const type=response.headers.get('Content-Type')||'';
      if(!/^image\/(jpeg|png|webp|gif|avif)(?:;|$)/i.test(type))throw Error('invalid_image');
      let blob;
      if(response.body?.getReader){const reader=response.body.getReader(),chunks=[];let bytes=0;try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>MAX_FILE){await reader.cancel();throw Error('large');}chunks.push(part.value);}}finally{reader.releaseLock();}blob=new Blob(chunks,{type});}
      else blob=await response.blob();
      if(!blob.size || blob.size>MAX_FILE)throw Error('large');return blob;
    } finally {clearTimeout(timeout);}
  }
  const pendingWorker=new Map();
  async function compress(blob) {
    const head=new TextDecoder('latin1').decode(await blob.slice(0,256).arrayBuffer());
    if(/image\/gif/i.test(blob.type) || /ANIM|acTL|avis/.test(head))return blob;
    if(!workerFailed && 'Worker' in window && 'OffscreenCanvas' in window && 'createImageBitmap' in window){
      try {
        if(!worker){worker=new Worker(new URL('photo-preview-worker.js',scriptBase));worker.onmessage=event=>{const entry=pendingWorker.get(event.data.id);if(entry){pendingWorker.delete(event.data.id);clearTimeout(entry.timeout);entry.resolve(event.data.blob);}};worker.onerror=()=>{workerFailed=true;worker.terminate();worker=null;for(const entry of pendingWorker.values()){clearTimeout(entry.timeout);entry.resolve(entry.blob);}pendingWorker.clear();};}
        return await new Promise(resolve=>{const id=++workerSerial;const timeout=setTimeout(()=>{pendingWorker.delete(id);resolve(blob);},10000);pendingWorker.set(id,{resolve,timeout,blob});worker.postMessage({id,blob});});
      } catch(_){workerFailed=true;}
    }
    // Canvas fallback for browsers without an OffscreenCanvas worker.
    if('createImageBitmap' in window){let image;try{image=await createImageBitmap(blob);if(image.width*image.height>25000000)return blob;const scale=Math.min(1,800/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));return result && result.size<blob.size ? result : blob;}catch(_){return blob;}finally{image?.close();}}
    return blob;
  }
  async function obtain(photo){
    const existing=await cached(photo);if(existing)return existing;
    let blob;
    const sources=[...new Set([valid(photo.thumbnail)?.href,valid(photo.url)?.href].filter(Boolean))];
    for(const source of sources){try{blob=await readImage(source);break;}catch(_){}}
    if(!blob){const relay=new URL(`/api/photo-source/${photo.id}`,endpoint.origin);blob=await readImage(relay.href);}
    const preview=await compress(blob);await save(photo,preview);return preview;
  }
  function requestRetry(delay){if(retryTimer)return;retryTimer=setTimeout(()=>{retryTimer=0;if(warmed && !document.hidden){if(photos.length)warm();else fetchList();}},delay);}
  function pump(){
    if(document.hidden || navigator.onLine===false)return;
    queue.sort((a,b)=>a.priority-b.priority);
    while(running<2 && queue.length){const task=queue.shift();running++;obtain(task.photo).then(task.resolve,error=>{recentFailures.set(task.key,Date.now()+60000);requestRetry(61000);task.reject(error);}).finally(()=>{jobs.delete(task.key);running--;pump();});}
  }
  function ensure(photo,priority=3){
    if(!validPhoto(photo))return Promise.reject(Error('invalid'));
    const ident=key(photo);if(recentFailures.get(ident)>Date.now())return Promise.reject(Error('retry_later'));
    if(jobs.has(ident)){const task=jobs.get(ident);task.priority=Math.min(priority,task.priority);pump();return task.promise;}
    let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});const task={photo,key:ident,priority,promise,resolve,reject};jobs.set(ident,task);queue.push(task);pump();return promise;
  }
  function object(photo,blob){const ident=key(photo);if(!objects.has(ident))objects.set(ident,URL.createObjectURL(blob));return objects.get(ident);}
  function apply(binding,blob){if(binding.image.isConnected){binding.image.removeAttribute('srcset');binding.image.src=object(binding.photo,blob);}}
  function activate(binding){ensure(binding.photo,0).then(blob=>apply(binding,blob)).catch(()=>{if(binding.image.isConnected)binding.image.src=valid(binding.photo.thumbnail)?.href||binding.photo.url;});}
  const observer='IntersectionObserver' in window ? new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);const binding=[...bindings].find(item=>item.image===entry.target);if(binding)activate(binding);}}, {rootMargin:'700px'}) : null;
  function cleanBindings(){cleanupScheduled=false;for(const item of bindings)if(!item.image.isConnected){observer?.unobserve(item.image);bindings.delete(item);}const active=new Set([...bindings].map(item=>key(item.photo)));for(const [ident,url] of objects)if(!active.has(ident)){URL.revokeObjectURL(url);objects.delete(ident);}}
  function bind(image,photo){if(!cleanupScheduled){cleanupScheduled=true;queueMicrotask(cleanBindings);}const binding={image,photo};bindings.add(binding);cached(photo).then(blob=>{if(!image.isConnected){bindings.delete(binding);return;}if(blob)apply(binding,blob);else if(observer)observer.observe(image);else activate(binding);});}
  function warm(){if(!warmed)return;photos.slice(0,100).forEach(photo=>ensure(photo,3).catch(()=>{}));}
  function setPhotos(data){photos=(data||[]).filter(validPhoto).slice(0,500);const currentKeys=new Set(photos.map(key));for(let i=queue.length-1;i>=0;i--){const task=queue[i];if(!currentKeys.has(task.key)){queue.splice(i,1);jobs.delete(task.key);task.reject(Error('removed'));}}warm();
    const allowed=new Set(photos.map(key));for(const binding of bindings)if(!binding.image.isConnected){observer?.unobserve(binding.image);bindings.delete(binding);}
    for(const [ident,url] of objects)if(![...bindings].some(item=>key(item.photo)===ident && item.image.isConnected)){URL.revokeObjectURL(url);objects.delete(ident);}
    // Remove cached photos that have been deleted from the current Discord snapshot.
    storagePromise.then(async store=>{if(!store)return;try{for(const request of await store.keys())if(!allowed.has(request.url))await store.delete(request);}catch(_){}});
  }
  function ahead(list,index,count=6){list.slice(index,index+count).filter(validPhoto).forEach(photo=>ensure(photo,1).catch(()=>{}));}
  async function fetchList(){if(fetchBusy)return;fetchBusy=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(endpoint.href,{signal:controller.signal,credentials:'omit',cache:'no-cache'});if(!response.ok)throw Error();const payload=await response.json();if(['ok','stale'].includes(payload.status) && Array.isArray(payload.data)){setPhotos(payload.data);}else throw Error('photos_loading');}catch(_){requestRetry(30000);}finally{clearTimeout(timeout);fetchBusy=false;}}
  async function start(){warmed=true;if(!photos.length)await fetchList();else warm();
    if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')){navigator.serviceWorker.register(new URL('sw.js',siteBase),{scope:siteBase.pathname}).catch(()=>{});}
  }
  // Navigation within the same tab resumes warming rather than resetting the delay.
  let entered=window.performance?.timeOrigin || Date.now();try{const previous=Number(sessionStorage.getItem('eurofest-cache-entered'));if(previous && entered-previous<1800000)entered=previous;else sessionStorage.setItem('eurofest-cache-entered',String(entered));}catch(_){}
  const timer=setTimeout(()=>{if(!document.hidden)start();else warmed=true;},Math.max(0,entered+6000-Date.now()));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){pump();if(warmed){if(!photos.length)start();else warm();}}});
  window.addEventListener('online',()=>{pump();if(warmed && !photos.length)fetchList();});
  window.addEventListener('pagehide',()=>{for(const url of objects.values())URL.revokeObjectURL(url);objects.clear();});
  window.addEventListener('pageshow',event=>{if(event.persisted){for(const binding of bindings)if(binding.image.isConnected)activate(binding);}});
  window.EUROFEST_PHOTO_CACHE={bind,setPhotos,ahead,ensure,cached,cacheName};
})();
