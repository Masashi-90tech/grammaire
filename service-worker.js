const VERSION="3865c7fa9b2d";
const PREFIX='grammaire-v2-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+VERSION;
const CORE=["./","./index.html","./manifest.json","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png","assets/app-99fad72552cb.css","assets/app-c9e11954a4eb.js","assets/start-51ba19c4cd97.js","assets/data-0cb2a7155183.json","assets/vocab_default-caca31e45770.json","assets/conjug-6c3fc31d0fd1.json","assets/phrases-28f22f9e5ed4.json","assets/soutenu-af19c9a2a2bd.json","assets/tone-c2f0bff34a9f.json","assets/comm-f2fb7d9ab7b5.json","assets/idioms-7d539f16b189.json","assets/dialogues-00949ca0a7c7.json","assets/verb_index-3ce73b2ae0b1.json","assets/learning_pack-761a20594ea5.json"];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request);
    if(cached&&event.request.mode!=='navigate')return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone()).catch(()=>{});
      else if(cached)return cached;
      return response;
    }catch(e){
      if(cached)return cached;
      if(event.request.mode==='navigate'){
        const shell=await cache.match('./index.html');if(shell)return shell;
      }
      return new Response('Offline: this resource has not been saved.',{status:503});
    }
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='dictionary-cache-status'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),scope=new URL(self.registration.scope);
    const urls=Array.isArray(event.data.urls)?event.data.urls.slice(0,100):[];
    let saved=0;
    for(const value of urls){
      const url=new URL(value,scope);
      if(url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)&&await cache.match(url.href))saved++;
    }
    event.ports[0].postMessage({saved});
  })());
});