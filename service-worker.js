const VERSION="a7b1f935f875";
const PREFIX='grammaire-v2-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+VERSION;
const CORE=["./","./index.html","./manifest.json","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png","assets/app-6ebc051d6dee.css","assets/app-39e425c00bf1.js","assets/start-e80dbdbd65bb.js","assets/bootstrap-9a8ffae86ca8.json","assets/lexicon_index-ed4529e78cec.json","assets/verb_index-8fe70ea93a56.json","assets/grammar_topics-f9d84ff48ee5.json"];
const PRESERVE=["assets/wordmap-aa63c97eb074.json","assets/search_index-1cc6006be55d.json","assets/data-1ca95361916d.json","assets/vocab_default-c6d46a2074ef.json","assets/conjug-6c3fc31d0fd1.json","assets/phrases-c7c9b458973a.json","assets/soutenu-220b3cbdbeb0.json","assets/tone-c2f0bff34a9f.json","assets/comm-1edbb5d53ec4.json","assets/idioms-04c05e7baad4.json","assets/dialogues-e29537d2d672.json","assets/verb_index-8fe70ea93a56.json","assets/learning_pack-fe91780e3c5b.json","assets/learning_tools-4e8f827987c6.json","assets/personal_program-7763e1d83482.json","assets/lexicon_index-ed4529e78cec.json","assets/grammar_topics-f9d84ff48ee5.json","assets/home_verbs-f5894feae96e.json","assets/story_le_passage-05a54a8c34a9.json","assets/story_les_billets_oublies-ea42756e8822.json","assets/story_advanced_la_place_des_autres-4e24bf6421d5.json","assets/story_advanced_une_bonne_nouvelle-8d6b6e381dfa.json","assets/story_advanced_la_saison_des_autres-8ed46676860e.json","assets/story_advanced_le_bruit_dune_chaise-99ae29ef723a.json","assets/story_advanced_le_nom_sur_lenveloppe-80d3ed027a74.json","assets/story_advanced_la_marge_des_lettres-80edc9b5c9a3.json","assets/story_novel_ce_que_la_nuit_a_entendu-e492cefe2483.json","data/c4dfe42d4069/verbs-00.json","data/c4dfe42d4069/verbs-01.json","data/c4dfe42d4069/verbs-02.json","data/c4dfe42d4069/verbs-03.json","data/c4dfe42d4069/verbs-04.json","data/c4dfe42d4069/verbs-05.json","data/c4dfe42d4069/verbs-06.json","data/c4dfe42d4069/verbs-07.json","data/c4dfe42d4069/verbs-08.json","data/c4dfe42d4069/verbs-09.json","data/c4dfe42d4069/verbs-10.json","data/c4dfe42d4069/verbs-11.json","data/c4dfe42d4069/verbs-12.json","data/c4dfe42d4069/verbs-13.json","data/c4dfe42d4069/verbs-14.json","data/c4dfe42d4069/verbs-15.json","data/c4dfe42d4069/verbs-16.json","data/c4dfe42d4069/verbs-17.json","data/c4dfe42d4069/verbs-18.json","data/c4dfe42d4069/verbs-19.json","data/c4dfe42d4069/verbs-20.json","data/c4dfe42d4069/verbs-21.json","data/c4dfe42d4069/verbs-22.json","data/c4dfe42d4069/verbs-23.json","data/c4dfe42d4069/verbs-24.json","data/c4dfe42d4069/verbs-25.json","data/c4dfe42d4069/verbs-26.json","data/c4dfe42d4069/verbs-27.json","data/c4dfe42d4069/verbs-28.json","data/c4dfe42d4069/verbs-29.json","data/c4dfe42d4069/verbs-30.json","data/c4dfe42d4069/verbs-31.json","data/c4dfe42d4069/verbs-32.json","data/c4dfe42d4069/verbs-33.json","data/lex-343dbe1acd27/words-00.json","data/lex-343dbe1acd27/words-01.json","data/lex-343dbe1acd27/words-02.json","data/lex-343dbe1acd27/words-03.json","data/lex-343dbe1acd27/words-04.json","data/lex-343dbe1acd27/words-05.json","data/lex-343dbe1acd27/words-06.json","data/lex-343dbe1acd27/words-07.json","data/lex-343dbe1acd27/words-08.json","data/lex-343dbe1acd27/words-09.json","data/lex-343dbe1acd27/words-10.json","data/lex-343dbe1acd27/words-11.json","data/lex-343dbe1acd27/words-12.json","data/lex-343dbe1acd27/words-13.json","data/lex-343dbe1acd27/words-14.json","data/lex-343dbe1acd27/words-15.json","data/lex-343dbe1acd27/words-16.json","data/lex-343dbe1acd27/words-17.json","data/lex-343dbe1acd27/words-18.json","data/lex-343dbe1acd27/words-19.json","data/lex-343dbe1acd27/words-20.json","data/lex-343dbe1acd27/words-21.json","data/lex-343dbe1acd27/words-22.json","data/lex-343dbe1acd27/words-23.json","data/lex-343dbe1acd27/words-24.json","data/lex-343dbe1acd27/words-25.json","data/lex-343dbe1acd27/words-26.json","data/lex-343dbe1acd27/words-27.json","data/lex-343dbe1acd27/words-28.json","data/lex-343dbe1acd27/words-29.json","data/lex-343dbe1acd27/words-30.json","data/lex-343dbe1acd27/words-31.json","data/lex-343dbe1acd27/words-32.json","data/lex-343dbe1acd27/words-33.json","data/lex-343dbe1acd27/words-34.json","data/lex-343dbe1acd27/words-35.json","data/lex-343dbe1acd27/words-36.json","data/lex-343dbe1acd27/words-37.json","data/lex-343dbe1acd27/words-38.json","data/lex-343dbe1acd27/words-39.json","data/lex-343dbe1acd27/words-40.json","data/lex-343dbe1acd27/words-41.json","data/lex-343dbe1acd27/words-42.json","data/lex-343dbe1acd27/words-43.json"];
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