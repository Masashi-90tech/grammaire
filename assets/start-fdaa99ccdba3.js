"use strict";
(async()=>{
  const view=document.getElementById('view'),files={"DATA":"assets/data-0cb2a7155183.json","VOCAB_DEFAULT":"assets/vocab_default-caca31e45770.json","CONJUG":"assets/conjug-6c3fc31d0fd1.json","PHRASES":"assets/phrases-28f22f9e5ed4.json","SOUTENU":"assets/soutenu-af19c9a2a2bd.json","TONE":"assets/tone-c2f0bff34a9f.json","COMM":"assets/comm-f2fb7d9ab7b5.json","IDIOMS":"assets/idioms-7d539f16b189.json","DIALOGUES":"assets/dialogues-00949ca0a7c7.json","VERB_INDEX":"assets/verb_index-3ce73b2ae0b1.json","LEARNING_PACK":"assets/learning_pack-33e88dbd6751.json"},limit=15000;
  let complete=0,failed=false;
  const paint=(message,retry=false)=>{
    view.innerHTML='<section class="startup" aria-live="polite"><p class="startup-brand">GRAMMAIRE</p><h2>'+message+'</h2><p>'+(retry?'通信状況を確認して、もう一度お試しください。保存済みのデータは消えません。':'教材を準備しています。 '+complete+' / '+Object.keys(files).length)+'</p>'+(retry?'<button type="button" onclick="location.reload()">もう一度開く</button>':'')+'</section>';
  };
  const bounded=(promise,message,onTimeout)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{onTimeout?.();reject(Error(message));},limit);
    Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});
  });
  paint('アプリを開いています…');
  try{
    const style=document.getElementById('appStyles');
    const stylesReady=bounded(new Promise((resolve,reject)=>{
      if(style.sheet){style.media='all';resolve();return;}
      style.onload=()=>{style.media='all';resolve();};
      style.onerror=()=>reject(Error('Styles unavailable'));
    }),'Styles timed out');
    // Attach immediately so a CSS failure cannot become an unhandled rejection.
    const stylesOutcome=stylesReady.then(()=>null,e=>e);
    let savedCaches=[];
    if('caches' in window){
      const prefix='grammaire-v2-'+encodeURIComponent(new URL('./',location.href).pathname)+'-';
      try{savedCaches=await bounded(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(prefix)).reverse().map(n=>caches.open(n)))),'Cache timed out');}catch(e){savedCaches=[];}
    }
    async function resource(url){
      const absolute=new URL(url,location.href).href;
      for(const cache of savedCaches){
        try{const saved=await bounded(cache.match(absolute),'Cache timed out');if(saved?.ok)return saved;}catch(e){}
      }
      const controller=new AbortController();
      return bounded((async()=>{
        const response=await fetch(url,{signal:controller.signal});
        if(!response.ok)throw Error('Resource unavailable');
        // Include body download in the limit, not just response headers.
        const bytes=await response.arrayBuffer();
        return new Response(bytes,{status:response.status,headers:response.headers});
      })(),'Network timed out',()=>controller.abort());
    }
    const pairs=await Promise.all(Object.entries(files).map(async([key,url])=>{
      const response=await resource(url),value=await response.json();
      complete++;if(!failed)paint('教材を読み込んでいます…');
      return [key,value];
    }));
    const styleError=await stylesOutcome;if(styleError)throw styleError;
    window.GRAMMAIRE_DATA=Object.fromEntries(pairs);
    window.GRAMMAIRE_ASSETS={dictionaryBase:"data/fd85b1796598/"};
    await bounded(new Promise((resolve,reject)=>{
      const app=document.createElement('script');app.src="assets/app-56e0334f614c.js";
      app.onload=resolve;app.onerror=()=>reject(Error('App unavailable'));
      document.body.appendChild(app);
    }),'App timed out');
    document.getElementById('startupStyle')?.remove();
  }catch(e){
    failed=true;console.error('Startup failed',e);
    paint('読み込みが進まないようです',true);
  }
})();
