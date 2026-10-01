"use strict";
(async()=>{
  const view=document.getElementById('view');
  view.innerHTML='<div class="card"><p role="status">学習データを読み込み中…</p></div>';
  try{
    const files={"DATA":"assets/data-0cb2a7155183.json","VOCAB_DEFAULT":"assets/vocab_default-caca31e45770.json","CONJUG":"assets/conjug-6c3fc31d0fd1.json","PHRASES":"assets/phrases-28f22f9e5ed4.json","SOUTENU":"assets/soutenu-af19c9a2a2bd.json","TONE":"assets/tone-c2f0bff34a9f.json","COMM":"assets/comm-f2fb7d9ab7b5.json","IDIOMS":"assets/idioms-7d539f16b189.json","DIALOGUES":"assets/dialogues-00949ca0a7c7.json","VERB_INDEX":"assets/verb_index-3ce73b2ae0b1.json","LEARNING_PACK":"assets/learning_pack-761a20594ea5.json"};
    const pairs=await Promise.all(Object.entries(files).map(async([key,url])=>{
      const r=await fetch(url);if(!r.ok)throw Error(url);return [key,await r.json()];
    }));
    window.GRAMMAIRE_DATA=Object.fromEntries(pairs);
    window.GRAMMAIRE_ASSETS={dictionaryBase:"data/fd85b1796598/"};
    const app=document.createElement('script');app.src="assets/app-ca4034600c72.js";
    app.onerror=()=>{view.innerHTML='<div class="card">画面を読み込めませんでした。ページを再読み込みしてください。</div>';};
    document.body.appendChild(app);
  }catch(e){
    console.error('Data loading failed',e);
    view.innerHTML='<div class="card"><p>学習データを読み込めませんでした。初回はインターネット接続が必要です。</p><p class="small" role="status">'+String(e?.message||e)+'</p><button class="btn" onclick="location.reload()">再読み込み</button></div>';
  }
})();