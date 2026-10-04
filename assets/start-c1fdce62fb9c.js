"use strict";
(async()=>{
  const view=document.getElementById('view'),files={"DATA":"assets/data-0cb2a7155183.json","VOCAB_DEFAULT":"assets/vocab_default-caca31e45770.json","CONJUG":"assets/conjug-6c3fc31d0fd1.json","PHRASES":"assets/phrases-28f22f9e5ed4.json","SOUTENU":"assets/soutenu-af19c9a2a2bd.json","TONE":"assets/tone-c2f0bff34a9f.json","COMM":"assets/comm-f2fb7d9ab7b5.json","IDIOMS":"assets/idioms-7d539f16b189.json","DIALOGUES":"assets/dialogues-00949ca0a7c7.json","VERB_INDEX":"assets/verb_index-3ce73b2ae0b1.json","LEARNING_PACK":"assets/learning_pack-33e88dbd6751.json","LEARNING_TOOLS":"assets/learning_tools-a8d5893c5d63.json"},limit=15000;
  const paint=(message,retry=false)=>{
    view.innerHTML='<section class="startup" aria-live="polite"><p class="startup-brand">GRAMMAIRE</p><h2>'+message+'</h2><p>'+(retry?'通信状況を確認して、もう一度お試しください。保存済みのデータは消えません。':'ホームを準備しています。教材は使う画面で読み込みます。')+'</p>'+(retry?'<button type="button" onclick="location.reload()">もう一度開く</button>':'')+'</section>';
  };
  const bounded=(promise,message,onTimeout)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{onTimeout?.();reject(Error(message));},limit);
    Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});
  });
  let savedCaches=[];
  async function resource(url){
    const absolute=new URL(url,location.href).href;
    for(const cache of savedCaches){
      try{const saved=await bounded(cache.match(absolute),'Cache timed out');if(saved?.ok)return saved;}catch(e){}
    }
    const controller=new AbortController();
    return bounded((async()=>{
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Resource unavailable');
      const bytes=await response.arrayBuffer();return new Response(bytes,{status:response.status,headers:response.headers});
    })(),'Network timed out',()=>controller.abort());
  }
  paint('アプリを開いています…');
  try{
    const style=document.getElementById('appStyles');
    const stylesOutcome=bounded(new Promise((resolve,reject)=>{
      if(style.sheet){style.media='all';resolve();return;}
      style.onload=()=>{style.media='all';resolve();};style.onerror=()=>reject(Error('Styles unavailable'));
    }),'Styles timed out').then(()=>null,e=>e);
    if('caches' in window){
      const prefix='grammaire-v2-'+encodeURIComponent(new URL('./',location.href).pathname)+'-';
      try{savedCaches=await bounded(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(prefix)).reverse().map(n=>caches.open(n)))),'Cache timed out');}catch(e){savedCaches=[];}
    }
    window.GRAMMAIRE_RESOURCE=resource;
    window.GRAMMAIRE_FILES=files;window.GRAMMAIRE_META={"dictionaryEntries":12118};
    window.GRAMMAIRE_ENTRY_POINTS=["openVerbDictionary","openDictionaryEntry","openDictionaryWord","openVerbEntry","openTenseHome","openTense","openTenseStory","randomVerbEntry","openVerbFromVotd","openVotd","renderHome","openLearningHub","openMore","openGrammarLibrary","openOralHome","openOralGuide","openOralText","openShadowHome","openShadow","openStoryBook","openStoryLibrary","openStoryChapter","openPackTenseHome","openPackComparison","openPackTenseGuide","openPackOralLibrary","openPackOralLesson","openLearningTools","openLearningDiagram","openLearningPractice","openLearningCommunication","openLearningMediation","openResumeHome","openResumeSet","openResumeImport","todayAgain","todayStart","todayDone","openSearch","openTopic","openAiGen","openAiGenInner","openAiItems","openAiItemsInner","startDrill","startBilan","startVocabStudySitu","openConjugTableFromCard","openExampleFavList","openFavList","openEssayHome","openEssayEditor","openDrawer","openVirelangues","openConjugHome","openConjugTable","startConjugDrill","openVocabHome","openVocabHomeInner","openUiSettings","startVocabStudy","startVocabStudyInner","startVocabStudyDeckLevel","openVocabTriage","openVocabTriageInner","startCommStudy","openCommHome","openCommHomeInner","openCommTask","openCommTaskInner","openDialogueList","startDialogueRandom","startDialogue","openCommOrder","openCommOrderInner","openCommEssay","openCommEssayInner","openToneHome","openToneHomeInner","startTone","openGenderHome","openGenderHomeInner","startGender","openCommAiGen","openToneAiGen","openToneAiList","startIdiomStudy","openIdiomHome","openIdiomTheme","startSoutenuStudy","openSoutenuHome","openSoutenuHomeInner","openSoutenuCat","openSoutenuCatInner","openMailStructure","openPhraseHome","openPhraseCat","openPhraseSaved","openReadingHome","openReadingGenerator","openReadingSet","startReadingQuiz","openReadingSaved","startSavedReadingQuiz"];
    window.GRAMMAIRE_READY=new Set();
    const pending=new Map();
    window.GRAMMAIRE_LOAD=async(keys,save=false)=>{
      // Refresh the cache inventory after the worker installs or updates.
      if('caches' in window)try{
        const prefix='grammaire-v2-'+encodeURIComponent(new URL('./',location.href).pathname)+'-';
        savedCaches=await bounded(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith(prefix)).map(n=>caches.open(n)))),'Cache timed out');
      }catch(e){}
      await Promise.all(keys.map(key=>{
        if(window.GRAMMAIRE_READY.has(key)&&!save)return;
        if(!pending.has(key))pending.set(key,(async()=>{
          const response=await resource(files[key]),value=await response.json();
          if(!window.GRAMMAIRE_READY.has(key)){window.GRAMMAIRE_DATA[key]=value;window.GRAMMAIRE_BIND_DATA(key,value);window.GRAMMAIRE_READY.add(key);}
        })().finally(()=>pending.delete(key)));
        return pending.get(key);
      }));
    };
    window.GRAMMAIRE_DATA=await (await resource("assets/bootstrap-836609ebd1be.json")).json();
    window.GRAMMAIRE_ASSETS={dictionaryBase:"data/fd85b1796598/",core:['./index.html',"assets/app-d85cc93e1d50.css","assets/app-6de295772162.js","assets/bootstrap-836609ebd1be.json"],shards:["data/fd85b1796598/verbs-00.json","data/fd85b1796598/verbs-01.json","data/fd85b1796598/verbs-02.json","data/fd85b1796598/verbs-03.json","data/fd85b1796598/verbs-04.json","data/fd85b1796598/verbs-05.json","data/fd85b1796598/verbs-06.json","data/fd85b1796598/verbs-07.json","data/fd85b1796598/verbs-08.json","data/fd85b1796598/verbs-09.json","data/fd85b1796598/verbs-10.json","data/fd85b1796598/verbs-11.json","data/fd85b1796598/verbs-12.json","data/fd85b1796598/verbs-13.json","data/fd85b1796598/verbs-14.json","data/fd85b1796598/verbs-15.json","data/fd85b1796598/verbs-16.json","data/fd85b1796598/verbs-17.json","data/fd85b1796598/verbs-18.json","data/fd85b1796598/verbs-19.json","data/fd85b1796598/verbs-20.json","data/fd85b1796598/verbs-21.json","data/fd85b1796598/verbs-22.json","data/fd85b1796598/verbs-23.json","data/fd85b1796598/verbs-24.json","data/fd85b1796598/verbs-25.json","data/fd85b1796598/verbs-26.json","data/fd85b1796598/verbs-27.json","data/fd85b1796598/verbs-28.json","data/fd85b1796598/verbs-29.json","data/fd85b1796598/verbs-30.json","data/fd85b1796598/verbs-31.json","data/fd85b1796598/verbs-32.json","data/fd85b1796598/verbs-33.json"]};
    const styleError=await stylesOutcome;if(styleError)throw styleError;
    await bounded(new Promise((resolve,reject)=>{
      const app=document.createElement('script');app.src="assets/app-6de295772162.js";
      app.onload=resolve;app.onerror=()=>reject(Error('App unavailable'));document.body.appendChild(app);
    }),'App timed out');
    document.getElementById('startupStyle')?.remove();
  }catch(e){console.error('Startup failed',e);paint('読み込みが進まないようです',true);}
})();
