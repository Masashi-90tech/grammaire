const VERSION="6f7c1b7200ca";
const PREFIX='grammaire-v2-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+VERSION;
const CORE=["./","./index.html","./manifest.json","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png","assets/app-67759e1c520e.css","assets/app-0aed9c35fc4f.js","assets/start-446eb4119d56.js","assets/bootstrap-9a8ffae86ca8.json","assets/lexicon_index-6295f14c4498.json","assets/verb_index-1169ce6b419e.json","assets/grammar_topics-985c83bf7e5e.json"];
const PRESERVE=["assets/data-e97363f0830e.json","assets/vocab_default-4ad0f040519c.json","assets/conjug-6c3fc31d0fd1.json","assets/phrases-28f22f9e5ed4.json","assets/soutenu-af19c9a2a2bd.json","assets/tone-c2f0bff34a9f.json","assets/comm-f2fb7d9ab7b5.json","assets/idioms-7d539f16b189.json","assets/dialogues-00949ca0a7c7.json","assets/verb_index-1169ce6b419e.json","assets/learning_pack-98294dec3d8d.json","assets/learning_tools-137906a1c089.json","assets/personal_program-cb516eeab248.json","assets/lexicon_index-6295f14c4498.json","assets/grammar_topics-985c83bf7e5e.json","assets/home_verbs-f5894feae96e.json","assets/story_le_passage-a3d11baffc5f.json","assets/story_les_billets_oublies-4cd2daf4fa67.json","assets/story_advanced_la_place_des_autres-5387b0cbc0ed.json","assets/story_advanced_une_bonne_nouvelle-448f7bf616d0.json","assets/story_advanced_la_saison_des_autres-3f00abc23ac3.json","assets/story_advanced_le_bruit_dune_chaise-0d1729b96e21.json","assets/story_advanced_le_nom_sur_lenveloppe-9cc09051ba98.json","assets/story_advanced_la_marge_des_lettres-5a497637c0e7.json","assets/story_novel_ce_que_la_nuit_a_entendu-e492cefe2483.json","data/3933142bcea9/verbs-00.json","data/3933142bcea9/verbs-01.json","data/3933142bcea9/verbs-02.json","data/3933142bcea9/verbs-03.json","data/3933142bcea9/verbs-04.json","data/3933142bcea9/verbs-05.json","data/3933142bcea9/verbs-06.json","data/3933142bcea9/verbs-07.json","data/3933142bcea9/verbs-08.json","data/3933142bcea9/verbs-09.json","data/3933142bcea9/verbs-10.json","data/3933142bcea9/verbs-11.json","data/3933142bcea9/verbs-12.json","data/3933142bcea9/verbs-13.json","data/3933142bcea9/verbs-14.json","data/3933142bcea9/verbs-15.json","data/3933142bcea9/verbs-16.json","data/3933142bcea9/verbs-17.json","data/3933142bcea9/verbs-18.json","data/3933142bcea9/verbs-19.json","data/3933142bcea9/verbs-20.json","data/3933142bcea9/verbs-21.json","data/3933142bcea9/verbs-22.json","data/3933142bcea9/verbs-23.json","data/3933142bcea9/verbs-24.json","data/3933142bcea9/verbs-25.json","data/3933142bcea9/verbs-26.json","data/3933142bcea9/verbs-27.json","data/3933142bcea9/verbs-28.json","data/3933142bcea9/verbs-29.json","data/3933142bcea9/verbs-30.json","data/3933142bcea9/verbs-31.json","data/3933142bcea9/verbs-32.json","data/3933142bcea9/verbs-33.json","data/lex-5418b2f64a37/words-00.json","data/lex-5418b2f64a37/words-01.json","data/lex-5418b2f64a37/words-02.json","data/lex-5418b2f64a37/words-03.json","data/lex-5418b2f64a37/words-04.json","data/lex-5418b2f64a37/words-05.json","data/lex-5418b2f64a37/words-06.json","data/lex-5418b2f64a37/words-07.json","data/lex-5418b2f64a37/words-08.json","data/lex-5418b2f64a37/words-09.json","data/lex-5418b2f64a37/words-10.json","data/lex-5418b2f64a37/words-11.json","data/lex-5418b2f64a37/words-12.json","data/lex-5418b2f64a37/words-13.json","data/lex-5418b2f64a37/words-14.json","data/lex-5418b2f64a37/words-15.json","data/lex-5418b2f64a37/words-16.json","data/lex-5418b2f64a37/words-17.json","data/lex-5418b2f64a37/words-18.json","data/lex-5418b2f64a37/words-19.json","data/lex-5418b2f64a37/words-20.json","data/lex-5418b2f64a37/words-21.json","data/lex-5418b2f64a37/words-22.json","data/lex-5418b2f64a37/words-23.json","data/lex-5418b2f64a37/words-24.json","data/lex-5418b2f64a37/words-25.json","data/lex-5418b2f64a37/words-26.json","data/lex-5418b2f64a37/words-27.json","data/lex-5418b2f64a37/words-28.json","data/lex-5418b2f64a37/words-29.json","data/lex-5418b2f64a37/words-30.json","data/lex-5418b2f64a37/words-31.json","data/lex-5418b2f64a37/words-32.json","data/lex-5418b2f64a37/words-33.json","data/lex-5418b2f64a37/words-34.json","data/lex-5418b2f64a37/words-35.json","data/lex-5418b2f64a37/words-36.json","data/lex-5418b2f64a37/words-37.json","data/lex-5418b2f64a37/words-38.json","data/lex-5418b2f64a37/words-39.json","data/lex-5418b2f64a37/words-40.json","data/lex-5418b2f64a37/words-41.json","data/lex-5418b2f64a37/words-42.json","data/lex-5418b2f64a37/words-43.json"];
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