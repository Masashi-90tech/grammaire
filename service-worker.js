const VERSION="3983d2a1e6f7";
const PREFIX='grammaire-v2-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+VERSION;
const CORE=["./","./index.html","./manifest.json","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png","assets/app-70e4afe98ff2.css","assets/app-7e3dcc2e3b32.js","assets/start-0a055fe89be9.js","assets/bootstrap-665e51e28007.json","assets/lexicon_index-7a71f3c0de9e.json","assets/verb_index-3ce73b2ae0b1.json","assets/grammar_topics-c916e819e70f.json"];
const PRESERVE=["assets/data-1bc0fc08fffe.json","assets/vocab_default-2795694eac9d.json","assets/conjug-6c3fc31d0fd1.json","assets/phrases-28f22f9e5ed4.json","assets/soutenu-af19c9a2a2bd.json","assets/tone-c2f0bff34a9f.json","assets/comm-f2fb7d9ab7b5.json","assets/idioms-7d539f16b189.json","assets/dialogues-00949ca0a7c7.json","assets/verb_index-3ce73b2ae0b1.json","assets/learning_pack-e78f276e0242.json","assets/learning_tools-4e339412a601.json","assets/lexicon_index-7a71f3c0de9e.json","assets/grammar_topics-c916e819e70f.json","assets/home_verbs-f5894feae96e.json","assets/story_le_passage-a3d11baffc5f.json","assets/story_les_billets_oublies-4cd2daf4fa67.json","assets/story_advanced_la_place_des_autres-5387b0cbc0ed.json","assets/story_advanced_une_bonne_nouvelle-448f7bf616d0.json","assets/story_advanced_la_saison_des_autres-3f00abc23ac3.json","assets/story_advanced_le_bruit_dune_chaise-0d1729b96e21.json","assets/story_advanced_le_nom_sur_lenveloppe-9cc09051ba98.json","assets/story_advanced_la_marge_des_lettres-5a497637c0e7.json","assets/story_novel_ce_que_la_nuit_a_entendu-04b301a13304.json","data/fd85b1796598/verbs-00.json","data/fd85b1796598/verbs-01.json","data/fd85b1796598/verbs-02.json","data/fd85b1796598/verbs-03.json","data/fd85b1796598/verbs-04.json","data/fd85b1796598/verbs-05.json","data/fd85b1796598/verbs-06.json","data/fd85b1796598/verbs-07.json","data/fd85b1796598/verbs-08.json","data/fd85b1796598/verbs-09.json","data/fd85b1796598/verbs-10.json","data/fd85b1796598/verbs-11.json","data/fd85b1796598/verbs-12.json","data/fd85b1796598/verbs-13.json","data/fd85b1796598/verbs-14.json","data/fd85b1796598/verbs-15.json","data/fd85b1796598/verbs-16.json","data/fd85b1796598/verbs-17.json","data/fd85b1796598/verbs-18.json","data/fd85b1796598/verbs-19.json","data/fd85b1796598/verbs-20.json","data/fd85b1796598/verbs-21.json","data/fd85b1796598/verbs-22.json","data/fd85b1796598/verbs-23.json","data/fd85b1796598/verbs-24.json","data/fd85b1796598/verbs-25.json","data/fd85b1796598/verbs-26.json","data/fd85b1796598/verbs-27.json","data/fd85b1796598/verbs-28.json","data/fd85b1796598/verbs-29.json","data/fd85b1796598/verbs-30.json","data/fd85b1796598/verbs-31.json","data/fd85b1796598/verbs-32.json","data/fd85b1796598/verbs-33.json","data/lex-610575a8829a/words-00.json","data/lex-610575a8829a/words-01.json","data/lex-610575a8829a/words-02.json","data/lex-610575a8829a/words-03.json","data/lex-610575a8829a/words-04.json","data/lex-610575a8829a/words-05.json","data/lex-610575a8829a/words-06.json","data/lex-610575a8829a/words-07.json","data/lex-610575a8829a/words-08.json","data/lex-610575a8829a/words-09.json","data/lex-610575a8829a/words-10.json","data/lex-610575a8829a/words-11.json","data/lex-610575a8829a/words-12.json","data/lex-610575a8829a/words-13.json","data/lex-610575a8829a/words-14.json","data/lex-610575a8829a/words-15.json","data/lex-610575a8829a/words-16.json","data/lex-610575a8829a/words-17.json","data/lex-610575a8829a/words-18.json","data/lex-610575a8829a/words-19.json","data/lex-610575a8829a/words-20.json","data/lex-610575a8829a/words-21.json","data/lex-610575a8829a/words-22.json","data/lex-610575a8829a/words-23.json","data/lex-610575a8829a/words-24.json","data/lex-610575a8829a/words-25.json","data/lex-610575a8829a/words-26.json","data/lex-610575a8829a/words-27.json","data/lex-610575a8829a/words-28.json","data/lex-610575a8829a/words-29.json","data/lex-610575a8829a/words-30.json","data/lex-610575a8829a/words-31.json","data/lex-610575a8829a/words-32.json","data/lex-610575a8829a/words-33.json","data/lex-610575a8829a/words-34.json","data/lex-610575a8829a/words-35.json","data/lex-610575a8829a/words-36.json","data/lex-610575a8829a/words-37.json","data/lex-610575a8829a/words-38.json","data/lex-610575a8829a/words-39.json","data/lex-610575a8829a/words-40.json","data/lex-610575a8829a/words-41.json","data/lex-610575a8829a/words-42.json","data/lex-610575a8829a/words-43.json"];
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
  if(event.data?.type==='skip-waiting'){self.skipWaiting();return;}
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