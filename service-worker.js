const VERSION="22b821baa5ef";
const PREFIX='grammaire-v2-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+VERSION;
const CORE=["./","./index.html","./manifest.json","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png","assets/app-a9499b98a84b.css","assets/app-07b0b3e74d42.js","assets/start-4cb7f84a582e.js","assets/bootstrap-0c69ec7f215a.json","assets/lexicon_index-7a71f3c0de9e.json","assets/verb_index-3ce73b2ae0b1.json","assets/grammar_topics-7d0f9ec52c85.json"];
const PRESERVE=["assets/data-657d9a1b668b.json","assets/vocab_default-9c35b3c510be.json","assets/conjug-6c3fc31d0fd1.json","assets/phrases-28f22f9e5ed4.json","assets/soutenu-af19c9a2a2bd.json","assets/tone-c2f0bff34a9f.json","assets/comm-f2fb7d9ab7b5.json","assets/idioms-7d539f16b189.json","assets/dialogues-00949ca0a7c7.json","assets/verb_index-3ce73b2ae0b1.json","assets/learning_pack-33e88dbd6751.json","assets/learning_tools-840ebf33d8fb.json","assets/lexicon_index-7a71f3c0de9e.json","assets/grammar_topics-7d0f9ec52c85.json","assets/home_verbs-f5894feae96e.json","data/fd85b1796598/verbs-00.json","data/fd85b1796598/verbs-01.json","data/fd85b1796598/verbs-02.json","data/fd85b1796598/verbs-03.json","data/fd85b1796598/verbs-04.json","data/fd85b1796598/verbs-05.json","data/fd85b1796598/verbs-06.json","data/fd85b1796598/verbs-07.json","data/fd85b1796598/verbs-08.json","data/fd85b1796598/verbs-09.json","data/fd85b1796598/verbs-10.json","data/fd85b1796598/verbs-11.json","data/fd85b1796598/verbs-12.json","data/fd85b1796598/verbs-13.json","data/fd85b1796598/verbs-14.json","data/fd85b1796598/verbs-15.json","data/fd85b1796598/verbs-16.json","data/fd85b1796598/verbs-17.json","data/fd85b1796598/verbs-18.json","data/fd85b1796598/verbs-19.json","data/fd85b1796598/verbs-20.json","data/fd85b1796598/verbs-21.json","data/fd85b1796598/verbs-22.json","data/fd85b1796598/verbs-23.json","data/fd85b1796598/verbs-24.json","data/fd85b1796598/verbs-25.json","data/fd85b1796598/verbs-26.json","data/fd85b1796598/verbs-27.json","data/fd85b1796598/verbs-28.json","data/fd85b1796598/verbs-29.json","data/fd85b1796598/verbs-30.json","data/fd85b1796598/verbs-31.json","data/fd85b1796598/verbs-32.json","data/fd85b1796598/verbs-33.json","data/lex-e5daf7d2efc9/words-00.json","data/lex-e5daf7d2efc9/words-01.json","data/lex-e5daf7d2efc9/words-02.json","data/lex-e5daf7d2efc9/words-03.json","data/lex-e5daf7d2efc9/words-04.json","data/lex-e5daf7d2efc9/words-05.json","data/lex-e5daf7d2efc9/words-06.json","data/lex-e5daf7d2efc9/words-07.json","data/lex-e5daf7d2efc9/words-08.json","data/lex-e5daf7d2efc9/words-09.json","data/lex-e5daf7d2efc9/words-10.json","data/lex-e5daf7d2efc9/words-11.json","data/lex-e5daf7d2efc9/words-12.json","data/lex-e5daf7d2efc9/words-13.json","data/lex-e5daf7d2efc9/words-14.json","data/lex-e5daf7d2efc9/words-15.json","data/lex-e5daf7d2efc9/words-16.json","data/lex-e5daf7d2efc9/words-17.json","data/lex-e5daf7d2efc9/words-18.json","data/lex-e5daf7d2efc9/words-19.json","data/lex-e5daf7d2efc9/words-20.json","data/lex-e5daf7d2efc9/words-21.json","data/lex-e5daf7d2efc9/words-22.json","data/lex-e5daf7d2efc9/words-23.json","data/lex-e5daf7d2efc9/words-24.json","data/lex-e5daf7d2efc9/words-25.json","data/lex-e5daf7d2efc9/words-26.json","data/lex-e5daf7d2efc9/words-27.json","data/lex-e5daf7d2efc9/words-28.json","data/lex-e5daf7d2efc9/words-29.json","data/lex-e5daf7d2efc9/words-30.json","data/lex-e5daf7d2efc9/words-31.json","data/lex-e5daf7d2efc9/words-32.json","data/lex-e5daf7d2efc9/words-33.json","data/lex-e5daf7d2efc9/words-34.json","data/lex-e5daf7d2efc9/words-35.json","data/lex-e5daf7d2efc9/words-36.json","data/lex-e5daf7d2efc9/words-37.json","data/lex-e5daf7d2efc9/words-38.json","data/lex-e5daf7d2efc9/words-39.json","data/lex-e5daf7d2efc9/words-40.json","data/lex-e5daf7d2efc9/words-41.json","data/lex-e5daf7d2efc9/words-42.json","data/lex-e5daf7d2efc9/words-43.json"];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const target=await caches.open(CACHE);await target.addAll(CORE);
    for(const name of await caches.keys()){
      if(!name.startsWith(PREFIX)||name===CACHE)continue;
      const previous=await caches.open(name);
      for(const url of PRESERVE){const saved=await previous.match(url);if(saved)await target.put(url,saved);}
    }
  })());
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
    if(cached)return cached;
    if(event.request.mode==='navigate'){
      const shell=await cache.match('./index.html');if(shell)return shell;
    }
    try{
      const controller=new AbortController();
      let timer;
      const response=await Promise.race([
        fetch(event.request,{signal:controller.signal}),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Network timed out'));},15000);})
      ]).finally(()=>clearTimeout(timer));
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