
"use strict";
/* Dictionary records are deliberately separate from vocabulary/drill records. */
const VERB_INDEX = window.GRAMMAIRE_DATA.VERB_INDEX;
const VERB_INLINE = null;
const verbByLemma = new Map(VERB_INDEX.map(v=>[v.fr,v]));
const verbSuggestions = ['être','avoir','aller','faire','dire','venir','pouvoir','savoir','vouloir','devoir','voir','prendre','parler','apprendre','comprendre','mettre','donner','trouver','travailler','aimer'];
const verbShards = new Map();
let verbQuery = '', verbPage = 0, verbFilter = 'all', verbActive = null;
const VERB_TENSE_NAMES = {
  present:'直説法現在', imparfait:'直説法半過去', passe_simple:'直説法単純過去（主に書き言葉）',
  futur:'直説法単純未来', conditionnel:'条件法現在', subjonctif:'接続法現在',
  subjonctif_imparfait:'接続法半過去（主に文学）', imperatif:'命令法現在',
  passe_compose:'直説法複合過去', plus_que_parfait:'直説法大過去', passe_anterieur:'直説法前過去（主に書き言葉）',
  futur_anterieur:'直説法前未来', conditionnel_passe:'条件法過去', subjonctif_passe:'接続法過去',
  subjonctif_pqp:'接続法大過去（主に文学）', imperatif_passe:'命令法過去（まれ）'
};
const VERB_AUX = {
  avoir:{present:['ai','as','a','avons','avez','ont'],imparfait:['avais','avais','avait','avions','aviez','avaient'],passe_simple:['eus','eus','eut','eûmes','eûtes','eurent'],futur:['aurai','auras','aura','aurons','aurez','auront'],conditionnel:['aurais','aurais','aurait','aurions','auriez','auraient'],subjonctif:['aie','aies','ait','ayons','ayez','aient'],subjonctif_imparfait:['eusse','eusses','eût','eussions','eussiez','eussent'],imperatif:['','aie','','ayons','ayez','']},
  'être':{present:['suis','es','est','sommes','êtes','sont'],imparfait:['étais','étais','était','étions','étiez','étaient'],passe_simple:['fus','fus','fut','fûmes','fûtes','furent'],futur:['serai','seras','sera','serons','serez','seront'],conditionnel:['serais','serais','serait','serions','seriez','seraient'],subjonctif:['sois','sois','soit','soyons','soyez','soient'],subjonctif_imparfait:['fusse','fusses','fût','fussions','fussiez','fussent'],imperatif:['','sois','','soyons','soyez','']}
};
function verbPracticeAllowed(fr){
  const v = verbByLemma.get(String(fr).replace(/^(se |s['’])/,''));
  return !v || !v.flags.some(f=>['古語','地方語','要確認'].includes(f));
}
function verbBadges(v){ return v.flags.map(f=>`<span class="pill">${esc(f)}</span>`).join(' '); }
function openVerbDictionary(query){
  if(typeof query==='string'){verbQuery=query;verbPage=0;}
  verbActive=null; titleEl.textContent='動詞辞書'; setBack(renderHome,'ホーム');
  el.innerHTML=`<div class="card"><div class="spread"><h2>動詞を調べる</h2><span class="pill">${VERB_INDEX.length.toLocaleString()} 見出し</span></div>
    <label for="verbSearch" class="small muted">フランス語・日本語・英語</label>
    <input id="verbSearch" type="search" placeholder="例：aller / 行く / go" value="${esc(verbQuery)}" oninput="verbQuery=this.value;verbPage=0;renderVerbResults()" autocapitalize="off" spellcheck="false">
    <p class="small muted">アクセントなしでも検索できます。地方語・古語も検索対象です。これらは練習問題には入りません。</p>
    <label class="small" for="verbFilter">表示する項目 </label><select id="verbFilter" onchange="verbFilter=this.value;verbPage=0;renderVerbResults()">
    <option value="all">すべて</option><option value="ready">訳・例文あり</option><option value="regional">地方語・古語</option></select>
    <details style="margin-top:12px"><summary>収録状況・オフライン利用</summary>
    <p class="small muted">訳・例文あり ${VERB_INDEX.filter(v=>v.status!=='pending').length.toLocaleString()}語。残りは見出し・活用を先に収録し、訳と例文を整備しています。活用には提供データを含み、全形の校閲は未完了です。</p>
    <button class="btn small" id="verbOffline" onclick="cacheVerbDictionary()">辞書全体をこの端末に保存</button><p class="small" id="verbOfflineStatus" role="status"></p></details>
    </div><div id="verbResults" aria-live="polite"></div>`;
  document.getElementById('verbFilter').value=verbFilter; renderVerbResults();
}
function renderVerbResults(){
  const box=document.getElementById('verbResults');if(!box)return;
  const q=gsNorm(verbQuery.trim()).replace(/^(se |s')/,'');
  let hits=VERB_INDEX.filter(v=>(verbFilter!=='ready'||v.status!=='pending') &&
    (verbFilter!=='regional'||v.flags.some(f=>f==='地方語'||f==='古語')) && gsNorm([v.fr,v.ja,v.en].join(' ')).includes(q));
  if(q)hits.sort((a,b)=>(gsNorm(a.fr)===q?0:gsNorm(a.fr).startsWith(q)?1:2)-(gsNorm(b.fr)===q?0:gsNorm(b.fr).startsWith(q)?1:2));
  else hits.sort((a,b)=>{const rank=fr=>{const n=verbSuggestions.indexOf(fr);return n<0?100:n;};return rank(a.fr)-rank(b.fr);});
  const size=40,total=hits.length;verbPage=Math.max(0,Math.min(verbPage,Math.ceil(total/size)-1));
  box.innerHTML=`<p class="small muted">${total.toLocaleString()}件${total?' ・ '+(verbPage*size+1)+'–'+Math.min(total,(verbPage+1)*size):''}</p>
    <div class="verb-results">${hits.slice(verbPage*size,(verbPage+1)*size).map(v=>`<button class="card verb-result" onclick="openVerbEntry(${v.id})"><span class="verb-head" lang="fr">${esc(v.fr)}</span> ${verbBadges(v)}<span class="verb-meaning">${esc(v.ja||'訳・例文を整備中')}</span><span class="small muted" lang="en">${esc(v.en)}</span></button>`).join('')}</div>
    ${!total?'<div class="card">一致する動詞が見つかりませんでした。</div>':''}
    <div class="actions"><button class="btn" ${verbPage===0?'disabled':''} onclick="verbPage--;renderVerbResults();window.scrollTo(0,0)">前へ</button><button class="btn" ${(verbPage+1)*size>=total?'disabled':''} onclick="verbPage++;renderVerbResults();window.scrollTo(0,0)">次へ</button></div>`;
}
async function getVerbShard(shard){
  if(VERB_INLINE)return VERB_INLINE[shard];
  if(!verbShards.has(shard)){
    const promise=fetch(`${window.GRAMMAIRE_ASSETS.dictionaryBase}verbs-${shard}.json`).then(r=>{if(!r.ok)throw Error('辞書データを取得できません');return r.json();}).catch(e=>{verbShards.delete(shard);throw e;});
    verbShards.set(shard,promise);
  }
  return verbShards.get(shard);
}
async function openVerbEntry(id, fromSearch=false){
  const meta=VERB_INDEX.find(v=>v.id===id);if(!meta)return;
  verbActive=id;titleEl.textContent=meta.fr;setBack(fromSearch?()=>openSearch():()=>openVerbDictionary(),fromSearch?'検索':'動詞辞書');
  el.innerHTML=`<div class="card" id="verbDetail" data-entry="${id}"><p role="status">読み込み中…</p></div>`;
  try{
    const shard=await getVerbShard(meta.shard),v=shard[String(id)];
    if(!document.querySelector(`#verbDetail[data-entry="${id}"]`))return;
    if(!v)throw Error('動詞が見つかりません');
    const src=[...new Set([...(v.sources||[]),...(v.conjugationSources||[])])].filter(s=>/^https:\/\//.test(s));
    el.innerHTML=`<div id="verbDetail" data-entry="${id}"><div class="card"><div class="spread"><div><div class="verb-head" lang="fr">${v.pronominalOnly?'(se / s’) ':''}${esc(v.fr)}</div>${verbBadges(v)}</div><button class="btn small" id="verbSpeak" aria-label="動詞を読み上げる">🔊</button></div>
      <p>${esc(v.ja||'訳・例文を整備中')}</p><p class="muted" lang="en">${esc(v.en)}</p>
      ${v.construction?`<p class="small">${esc(v.construction)}</p>`:''}${v.note?`<p class="small muted">${esc(v.note)}</p>`:''}
      ${v.exFr?`<div class="ex"><p lang="fr">${esc(v.exFr)}</p><p>${esc(v.exJa)}</p><p class="small muted" lang="en">${esc(v.exEn)}</p></div>`:''}
      ${v.flags.length?'<p class="small muted">辞書での参照用です。練習問題には出題しません。</p>':''}
      <details><summary class="small">参照先・活用について</summary><p class="small">語義の確認に辞書を参照。新規例文は独自に作成しています。活用形は提供された表をもとに、一部を修正しています。空欄は未収録または通常使わない形です。</p>${src.map((s,i)=>`<a class="small" href="${esc(s)}" target="_blank" rel="noopener noreferrer">辞書を参照 ${i+1}</a> `).join('')}</details></div>
      <div class="card"><h2>活用を調べる</h2>${v.paradigms.length>1?`<label for="verbParadigm">語義・活用の型 </label><select id="verbParadigm">${v.paradigms.map((p,i)=>`<option value="${i}">${esc(p.label||'型 '+(i+1))}</option>`).join('')}</select>`:''}
      <label for="verbMode">表示 </label><select id="verbMode"><option value="simple">単純時制</option><option value="compound">複合時制</option><option value="nonfinite">不定詞・分詞・ジェロンディフ</option></select>
      <div id="verbForms"></div></div></div>`;
    document.getElementById('verbSpeak').onclick=()=>speakFr(v.pronominalOnly?( /^[aeiouyéèêâîôûœ]/.test(v.fr)?"s'":'se ')+v.fr:v.fr);
    const render=()=>renderVerbForms(v,Number(document.getElementById('verbParadigm')?.value||0),document.getElementById('verbMode').value);
    document.getElementById('verbMode').onchange=render;
    if(document.getElementById('verbParadigm'))document.getElementById('verbParadigm').onchange=render;
    render();window.scrollTo(0,0);
  }catch(e){if(document.querySelector(`#verbDetail[data-entry="${id}"]`))el.innerHTML=`<div class="card"><p>この動詞の詳細を読み込めませんでした。未保存の場合はオンラインで開いてください。</p><button class="btn" onclick="openVerbEntry(${id},${fromSearch})">再試行</button></div>`;}
}
function verbReflexive(form,i,imperative=false){
  if(!form)return '';
  if(imperative)return form+'-'+({1:'toi',3:'nous',4:'vous'}[i]||'');
  const pro=['me','te','se','nous','vous','se'][i];
  return (i!==3&&i!==4&&/^[aeiouyéèêâîôûœ]/.test(form)?pro.slice(0,-1)+"'":pro+' ')+form;
}
function verbTable(tid,forms){
  const first=forms[0]?.[0]||'';
  const je=/^[aeiouyéèêàâîïôûœ]/i.test(first)?'j’':/^h/i.test(first)?'je / j’':'je';
  const labels=tid.startsWith('imperatif')?['','tu','','nous','vous','']:[je,'tu','il / elle / on','nous','vous','ils / elles'];
  return `<details class="verb-tense" ${tid==='present'||tid==='passe_compose'?'open':''}><summary>${esc(VERB_TENSE_NAMES[tid]||tid)}</summary><table class="cj-table"><tbody>${forms.map((f,i)=>labels[i]?`<tr><th scope="row">${labels[i]}</th><td lang="fr">${esc(f.length?f.join(' / '):'—')}</td></tr>`:'').join('')}</tbody></table></details>`;
}
function renderVerbForms(v,pi,mode,override){
  const p=v.paradigms[pi],box=document.getElementById('verbForms');
  if(v.flags.includes('要確認')){box.innerHTML='<p>見出しのつづり・語の実在性を確認中のため、活用の表示を保留しています。</p>';return;}
  if(v.conjugationRestriction==='imperfect-present-participle-infinitive'){
    const note='<p class="small muted">florir は使用する形が限られます。Académie の語義解説に従い、半過去・現在分詞・不定詞を掲載しています。</p>';
    box.innerHTML=note+(mode==='simple'?verbTable('imparfait',p.forms.imparfait):mode==='nonfinite'?`<dl class="verb-nonfinite"><dt>不定詞</dt><dd lang="fr">${esc(v.fr)}</dd><dt>現在分詞</dt><dd lang="fr">${esc(p.presentParticiple)}</dd></dl>`:'<p>この見出しでは、複合時制を通常の使用形として掲載していません。</p>');return;
  }
  const aux=override||(v.pronominalOnly?'être':p.aux);
  if(mode==='simple'){
    box.innerHTML=`<p class="small muted">${v.pronominalOnly?'代名詞を含む形です。':'表は主語を除いた活用形です。'} 接続法では que を前に置きます。提供データの全形校閲は未完了です。</p>`+
      Object.entries(p.forms).map(([tid,forms])=>verbTable(tid,forms.map((a,i)=>a.map(f=>v.pronominalOnly?verbReflexive(f,i,tid==='imperatif'):f)))).join('');return;
  }
  if(mode==='nonfinite'){
    const pp=esc(p.pp||'—'),pres=esc(p.presentParticiple||'—');
    const inf=v.pronominalOnly?verbReflexive(v.fr,2):v.fr;
    const part=p.presentParticiple?(v.pronominalOnly?verbReflexive(p.presentParticiple,2):p.presentParticiple):'';
    box.innerHTML=`<dl class="verb-nonfinite"><dt>不定詞現在</dt><dd lang="fr">${esc(inf)}</dd><dt>不定詞過去</dt><dd lang="fr">${aux&&p.pp?esc((v.pronominalOnly?"s'être":aux)+' '+p.pp):'助動詞の確認待ち'}</dd><dt>現在分詞</dt><dd lang="fr">${esc(part||'—')}</dd><dt>過去分詞（男性単数）</dt><dd lang="fr">${pp}</dd><dt>複合分詞</dt><dd lang="fr">${aux&&p.pp?esc((v.pronominalOnly?"s'étant":aux==='être'?'étant':'ayant')+' '+p.pp):'助動詞の確認待ち'}</dd><dt>ジェロンディフ現在</dt><dd lang="fr">${part?'en '+esc(part):'—'}</dd><dt>ジェロンディフ過去</dt><dd lang="fr">${aux&&p.pp?esc('en '+(v.pronominalOnly?"s'étant":aux==='être'?'étant':'ayant')+' '+p.pp):'助動詞の確認待ち'}</dd></dl><p class="small muted">代名詞は主語に合わせます。分詞は文中の一致規則に従います。</p>`;return;
  }
  if(!aux){
    box.innerHTML='<p>この見出しは助動詞や代名動詞の用法を確認中です。誤った複合形を示さないため、単純時制を先に収録しています。</p>';return;
  }
  const mapping={passe_compose:'present',plus_que_parfait:'imparfait',passe_anterieur:'passe_simple',futur_anterieur:'futur',conditionnel_passe:'conditionnel',subjonctif_passe:'subjonctif',subjonctif_pqp:'subjonctif_imparfait',imperatif_passe:'imperatif'};
  const feminine=pp=>pp.endsWith('e')?pp:pp+'e';
  const plural=pp=>/[sx]$/.test(pp)?pp:pp+'s';
  const participles=i=>{
    if(aux==='avoir')return [p.pp];
    const singular=[p.pp,feminine(p.pp)],multiple=singular.map(plural);
    return [...new Set(i===4?[...singular,...multiple]:i>=3?multiple:singular)];
  };
  box.innerHTML=`<p class="small muted">助動詞 ${esc(aux)} ＋ 過去分詞 <b>${esc(p.pp||'—')}</b>。${v.pronominalOnly?'代名動詞では目的語によって一致が変わるため、表は「助動詞 ＋ 過去分詞の基本形」で組み立てを示します。':'être は男性形・女性形を併記します。vous は単数敬称・複数の両方を示します。avoir は直接目的語が前に置かれる場合に一致が必要です。'}</p>`+
    Object.entries(mapping).map(([tid,base])=>verbTable(tid,VERB_AUX[aux][base].map((a,i)=>{
      const allowed=base==='imperatif'?p.forms.imperatif?.[i]?.length:Object.values(p.forms).some(forms=>forms[i]?.length);
      if(!a||!p.pp||!allowed)return [];
      return v.pronominalOnly?[verbReflexive(a,i,tid==='imperatif_passe')+' + '+p.pp]:participles(i).map(pp=>a+' '+pp);
    }))).join('')+
    '<p class="small muted">条件法過去第二形は、接続法大過去と同じ形を用いる文学的な用法です。</p>';
}
async function cacheVerbDictionary(){
  const button=document.getElementById('verbOffline'),status=document.getElementById('verbOfflineStatus');
  if(VERB_INLINE){status.textContent='このHTMLに辞書全体が入っています。';return;}
  if(!('serviceWorker' in navigator)){status.textContent='この環境では端末への保存に対応していません。';return;}
  button.disabled=true;
  try{
    if(!navigator.serviceWorker.controller)throw Error('初回の読み込み後にページを一度開き直してください。');
    const shards=[...new Set(VERB_INDEX.map(v=>v.shard))];let done=0;
    for(const s of shards){
      // Fetch even when already in memory, so the active worker can persist every shard.
      const r=await fetch(`${window.GRAMMAIRE_ASSETS.dictionaryBase}verbs-${s}.json`);if(!r.ok)throw Error('データの保存に失敗しました。');await r.json();
      status.textContent=`辞書を保存中 ${++done} / ${shards.length}`;
    }
    const saved=await new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      const timeout=setTimeout(()=>{channel.port1.close();reject(Error('保存を確認できませんでした。ページを開き直して再試行してください。'));},10000);
      channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data.saved);};
      navigator.serviceWorker.controller.postMessage({type:'dictionary-cache-status',urls:shards.map(s=>new URL(`${window.GRAMMAIRE_ASSETS.dictionaryBase}verbs-${s}.json`,location.href).href)},[channel.port2]);
    });
    if(saved!==shards.length)throw Error('一部を端末に保存できませんでした。空き容量やブラウザーの保存設定を確認してください。');
    status.textContent='辞書全体を保存しました。オフラインでも参照できます（端末側で保存データが消去された場合を除きます）。';
  }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
}

function grammarDiagram(tid){
  const node=(a,b)=>`<span class="grammar-node"><b>${a}</b>${b}</span>`;
  const arrow='<span class="grammar-arrow" aria-hidden="true">→</span>';
  const flow=(...items)=>`<div class="grammar-flow">${items.join(arrow)}</div>`;
  const maps={
    'rel-qui-que': ['qui / que は関係節の中での役割で選ぶ',
      flow(node('qui = 主語','La femme <b>qui parle</b>…'),node('誰が話す？','la femme'))+
      flow(node('que = 直接目的語','La femme <b>que je connais</b>…'),node('誰を知っている？','la femme'))+
      '<p class="small">先行詞が人か物かでは決まりません。que は母音の前で qu’：le livre qu’il lit。</p>'],
    'temps-pc-imparfait': ['背景の中に、出来事を置く',
      '<div class="timeline"><span>過去</span><span>出来事<br><b>le téléphone a sonné</b></span><span>今</span></div>'+
      flow(node('半過去：背景・進行','Je lisais.'),node('複合過去：起きた出来事','Le téléphone a sonné.'))+
      '<p lang="fr">Je lisais quand le téléphone a sonné.</p><p class="small">本を読んでいたら、電話が鳴った。長さだけでなく、背景として描くか、区切りのある出来事として語るかで選びます。</p>'],
    'temps-pqp': ['過去の時点より、さらに前',
      '<div class="timeline"><span>先に完了<br><b>était parti</b></span><span>過去の基準点<br><b>je suis arrivé</b></span><span>今</span></div>'+
      '<p lang="fr">Quand je suis arrivé, Paul était déjà parti.</p><p class="small">私が着いた時点で、ポールはすでに出発していた。</p>'],
    'cond-present': ['si の節と、その結果をつなぐ',
      flow(node('実現可能な条件','si + 現在'),node('結果の一例','未来'))+
      '<p lang="fr">Si tu viens, je préparerai le dîner.</p>'+
      flow(node('今・未来の仮定','si + 半過去'),node('仮定の結果','条件法現在'))+
      '<p lang="fr">Si j’avais le temps, je voyagerais.</p><p class="small">仮定を導く si の直後に、条件法を置かないのが基本です。</p>'],
    'cond-passe': ['実現しなかった過去を振り返る',
      flow(node('過去の仮定','si + 大過去'),node('実現しなかった結果','条件法過去'))+
      '<p lang="fr">Si j’avais su, je serais venu.</p><p class="small">知っていたら、来たのに。条件法過去には、確定していない情報を伝える用法もあります。</p>'],
    'double-pronoms': ['平叙文・否定命令の代名詞の順番',
      flow(node('①','me / te / se<br>nous / vous'),node('②','le / la / les'),node('③','lui / leur'),node('④','y'),node('⑤','en'),node('','動詞'))+
      '<p lang="fr">Je <b>le lui</b> donne. / Ne <b>le lui</b> donne pas.</p><p class="small">使う代名詞だけを並べます。肯定命令では動詞が先：Donne-le-moi. / Donnez-le-lui. すべての組合せが使えるわけではありません。</p>'],
    'negation': ['ne … pas は活用している動詞を挟む',
      flow(node('主語','Je'),node('否定の前半','ne'),node('活用した動詞','comprends'),node('否定の後半','pas'))+
      '<p lang="fr">Je n’ai pas compris.</p><p class="small">複合時制では助動詞を挟みます。不定詞の否定は ne pas comprendre。話し言葉では ne が省かれることがあります。</p>'],
    'pron-y-en': ['置き換えるまとまりを探す',
      flow(node('à + 物・事柄／場所','Je pense à ce projet.'),node('y','J’y pense.'))+
      flow(node('de + まとまり','Je parle de ce projet.'),node('en','J’en parle.'))+
      '<p class="small">人に対する penser à なら Je pense à lui / à elle。y・en に機械的に置き換えません。</p>']
  };
  const d=maps[tid];return d?`<aside class="grammar-map" aria-label="文法の図解"><h3>${d[0]}</h3>${d[1]}</aside>`:'';
}

const DATA = window.GRAMMAIRE_DATA.DATA;
const VOCAB_DEFAULT = window.GRAMMAIRE_DATA.VOCAB_DEFAULT;
const CONJUG = window.GRAMMAIRE_DATA.CONJUG;
const PHRASES = window.GRAMMAIRE_DATA.PHRASES;
const SOUTENU = window.GRAMMAIRE_DATA.SOUTENU;
const TONE = window.GRAMMAIRE_DATA.TONE;
const COMM = window.GRAMMAIRE_DATA.COMM;
const IDIOMS = window.GRAMMAIRE_DATA.IDIOMS;
const DIALOGUES = window.GRAMMAIRE_DATA.DIALOGUES;

/* ---------- 早口言葉（CIREFE / Université Rennes II, Gil Prévôt 配布資料より） ----------
   hard: 日本語話者にとって特にきつい音を含むもの                                        */
const VIRELANGUES = [
 {fr:"Ton thé t'a-t-il ôté ta toux ?\nMon thé ne m'a rien ôté du tout.",
  ja:"「君のお茶は咳を取ってくれた？」「僕のお茶は何も取ってくれなかったよ」",
  focus:"[t] の連続。t を破裂させたままリエゾンを処理する"},
 {fr:"Je veux et j'exige d'exquises excuses.",
  ja:"私は見事な謝罪を望むし、要求する。",
  focus:"x の二つの読み [ks] と [gz] の切り替え"},
 {fr:"Le fisc fixe exprès chaque taxe fixe exclusivement au luxe et à l'exquis.\nAu luxe et à l'exquis, le fisc fixe chaque taxe fixe exprès.",
  ja:"税務署はわざと、贅沢品と高級品にだけ固定税を課す。",
  focus:"[ksk] [kss] の連続。口の中で子音が渋滞する"},
 {fr:"Ces cyprès sont si près qu'on ne sait s'ils en sont. S'ils en sont scions-les. Nous y serons à six à scier ces cyprès pour pouvoir être assis.",
  ja:"この糸杉たちはあまりに近くて、その一部なのか分からない。もしそうなら切ってしまおう。座れるように六人でこの糸杉を切りに行こう。",
  focus:"[s] と [si] の連続。scions / serons / assis を混同しないこと"},
 {fr:"Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?\nArchi-sèches sont-elles sèches les chaussettes de cette archiduchesse ?",
  ja:"大公妃の靴下は乾いてる？カラカラに乾いてる？",
  focus:"[ʃ] と [s] の交替。フランスで最も有名な早口言葉", hard:true},
 {fr:"Chasseur qui chassez, sachez chasser sans chien.",
  ja:"狩りをする狩人よ、犬なしで狩ることを覚えよ。",
  focus:"[ʃ] と [s] の交替（短いので入門用）", hard:true},
 {fr:"Le dindon défiant se dandine avec dédain tandis que les dindonneaux indociles déguerpissent dans les dahlias.",
  ja:"高慢な七面鳥が見下したように体を揺らして歩く一方、言うことを聞かない雛たちはダリアの茂みへ逃げていく。",
  focus:"[d] の連続と鼻母音 [ɛ̃]/[ɑ̃]/[ɔ̃] の区別", hard:true},
 {fr:"Françoise froisse fébrilement une feuille de chêne.",
  ja:"フランソワーズは神経質そうに樫の葉をくしゃくしゃにする。",
  focus:"[fR] の連続。f のあとすぐ喉の r を出す", hard:true},
 {fr:"Un hibou doux et roux hurla et hulula comme un fou.",
  ja:"優しくて赤茶色のフクロウが、狂ったように叫びホーホーと鳴いた。",
  focus:"[u] の連続と有音の h（hibou / hurla はリエゾンしない）"},
 {fr:"L'assassin sur son sein suçait son sang sans cesse.",
  ja:"暗殺者は自分の胸で絶え間なく血を吸っていた。",
  focus:"[s] の連続と鼻母音 [ɛ̃]/[ɑ̃] の打ち分け", hard:true},
 {fr:"Ciel ! Si ceci se sait, ces soins sont sans succès.",
  ja:"なんてことだ！これが知れたら、この手当ては無駄になる。",
  focus:"[sjɛl] [si] [sɛ] [swɛ̃] と s のあとの母音が毎回変わる"},
 {fr:"Anastase esquisse l'exquise extase.",
  ja:"アナスタズは見事な恍惚を描き出す。",
  focus:"[s] / [ks] / [gz] の三つ巴"},
 {fr:"Trois tortues à triste tête trottaient sur trois toits très étroits.",
  ja:"悲しい顔をした三匹の亀が、とても狭い三つの屋根の上を歩いていた。",
  focus:"[tR] の連続。t のあとすぐ喉の r", hard:true},
 {fr:"Alerte ! Arlette allaite.",
  ja:"警報だ！アルレットが授乳している。",
  focus:"l と r の位置が入れ替わるだけ。日本語話者に一番効く", hard:true},
];
const VOCAB_DEFAULT_PREFIX = "vocab5000_";
const POS_DECK_NAME = {
  NOM:"名詞", VER:"動詞", ADJ:"形容詞", ADV:"副詞", PRE:"前置詞",
  PRO:"代名詞", DET:"限定詞", CONJ:"接続詞", INTJ:"間投詞", LOC:"成句・熟語", NUM:"数詞"
};
const POS_DECK_ORDER = ["NOM","VER","ADJ","ADV","PRE","PRO","DET","CONJ","INTJ","LOC","NUM"];
// 仕事で使う表現は「難しい単語」ではなく一般語の組み合わせ（faire le point sur, procéder à
// la consignation …）であることが多く、品詞別デッキだと会議用・現場用がバラバラに散る。
// そこで situ に機能別のタグを持たせ、品詞とは別の軸としてまとめて回せるようにする。
// カード自体は品詞デッキに属したまま（idも進捗も1つ）で、ここは絞り込みビューにすぎない。
const BIZ_SITU = [
  {situ:"会議・調整",   sub:"打ち合わせ・段取り"},
  {situ:"メール・報告", sub:"書面・報告の定型"},
  {situ:"採用・人事",   sub:"求人・面接・契約・評価"},
  {situ:"HSE・現場指示", sub:"安全・現場での指示"},
  {situ:"保全・検査",   sub:"保全・検査・工事準備"},
  {situ:"施設管理",     sub:"建物・設備の運用"},
];

/* ---------- 状態管理 ---------- */
const LS_KEY = "grammaire.v1";
const ALPHA = 0.15;           // ema の更新率
const EMA_INIT = 0.5;         // 未着手トピックの初期値
const MIN_WEIGHT = 0.1;       // 正答率100%でも残す最低出題重み
const NEW_CARDS_PER_SESSION = 20; // 1回の「新しい単語」セッションで出す上限

// 画面上部に赤帯でエラーを表示する。console.errorだけだとスマホ実機で
// 何が起きているか本人にもこちらにも分からないため、致命的でないエラーも
// 極力ここに出して「何が起きたか」をスクショで共有できるようにする。
function showErrorBanner(msg){
  try{
    let b = document.getElementById("errBanner");
    if(!b){
      b = document.createElement("div");
      b.id = "errBanner";
      b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:9999;background:#a43d33;color:#fff;"
        + "padding:10px 40px 10px 14px;font-size:13px;line-height:1.4;box-shadow:0 2px 8px rgba(0,0,0,.25)";
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.setAttribute("aria-label", "閉じる");
      closeBtn.style.cssText = "position:absolute;right:8px;top:6px;background:none;border:none;color:#fff;"
        + "font-size:18px;line-height:1;cursor:pointer;padding:4px 6px";
      closeBtn.onclick = () => b.remove();
      b.appendChild(closeBtn);
      const span = document.createElement("span");
      span.id = "errBannerText";
      b.appendChild(span);
      document.body.appendChild(b);
    }
    document.getElementById("errBannerText").textContent = msg;
  }catch(e){ /* バナー表示自体が失敗しても本体機能は止めない */ }
}

let state = load();
// 端末idを振ったら即保存する（保存せずに再読み込みすると毎回別の端末扱いになり、
// 自分の書き出しファイルを読み込み直したときに二重に数えてしまうため）
if(ensureDevId(state)){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }
seedDefaultVocab();
let session = null;

function defaultState(){ return {progress:{}, items:{}, log:{}, vocabLog:{}, vocabReviewLog:{}, vocabDecks:{}, vocabCards:{}, vocabProgress:{}, vocabSeeded:false,
  vocabFav:{}, vocabNotes:{}, exampleFav:{}, conjug:{stats:{}, tenses:["present","passe_compose"], group:"all", lv:2, best:0},
  readingSets:{}, readingSaved:{}, phraseFav:{}, phraseText:{}, phraseCustom:{}, uiTheme:"kanban", uiColorMode:"auto", uiExMode:"general", essays:{},
  aiItems:{}, aiOff:{}, aiBad:{}, aiCommDrills:{}, aiTone:{}, dlgStats:{}, ctrByDev:{}}; }
// 単語の見出し語（fr）からアクセントを落として作る安定id。配列インデックスではなく
// 語そのものから作るため、後からgen/*.txtにファイルを追加して行の並びが変わっても
// 既存語のidはずれない（旧方式はdeckId+"_"+配列内インデックスで、途中にファイルを
// 挿し込むと同じpos内の後続語のindexが全部ずれ、既に学習済みのカードが別の語に
// 差し替わってしまう不具合があった——2026-09-16判明）。
// côte/côtéのようにアクセント違いだけでスラグが衝突する語は、buildPosIdMap()側で
// 出現順に_2,_3…を付けて一意化する。
function vocabStableId(deckId, fr){
  let slug = (fr||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  if(!slug) slug = "x";
  return deckId + "_" + slug;
}
// 同梱5,002語超のカード実体を、pos別デッキごとに安定id付きで一度だけ組み立てる
// （stateには入れない＝localStorageのサイズに影響しない）。
// var で宣言する（let だと、このファイル冒頭の let state = load() の時点ではまだ
// TDZ内でアクセスできず、load()内の移行処理からdefaultCardById()を呼ぶとエラーになるため）。
var _defaultCardById = null;
var _defaultIdsByDeck = null;
function ensureDefaultVocabIndex(){
  if(_defaultCardById) return;
  _defaultCardById = {};
  _defaultIdsByDeck = {};
  const byPos = {};
  VOCAB_DEFAULT.forEach(c=>{ (byPos[c.pos] = byPos[c.pos] || []).push(c); });
  POS_DECK_ORDER.forEach(pos=>{
    const list = byPos[pos];
    if(!list || !list.length) return;
    const deckId = VOCAB_DEFAULT_PREFIX + pos.toLowerCase();
    const seen = {};
    const ids = [];
    list.forEach(c=>{
      const base = vocabStableId(deckId, c.fr);
      let id = base, n = 2;
      while(seen[id]){ id = base + "_" + n; n++; }
      seen[id] = true;
      ids.push(id);
      _defaultCardById[id] = {
        front:c.fr, back:`${c.ja}　/　${c.en}`, deckId,
        fr:c.fr, pos:c.pos, posJa:c.posJa, level:c.level, ja:c.ja, en:c.en,
        gram:c.gram, constr:c.constr, situ:c.situ, exFr:c.exFr, exJa:c.exJa, exEn:c.exEn,
        gFr:c.gFr, gJa:c.gJa, gEn:c.gEn, senses:c.senses
      };
    });
    _defaultIdsByDeck[deckId] = ids;
  });
}
function defaultCardById(){ ensureDefaultVocabIndex(); return _defaultCardById; }
function defaultDeckIds(deckId){ ensureDefaultVocabIndex(); return _defaultIdsByDeck[deckId] || []; }
// カードidから内容を引く共通の入口。インポートしたデッキのカードとタップ登録した
// ブックマーク（adhoc）はstate.vocabCardsに実データがあるのでそのまま返し、
// 同梱5,002語はdefaultCardById()側から返す。
function getCard(id){
  return state.vocabCards[id] || defaultCardById()[id] || soutenuCardById()[id] || commCardById()[id] || idiomCardById()[id];
}
// 上品なフランス語（SOUTENU）の各表現を、単語カードと同じSRSで回せるカードとして組み立てる。
// 同梱語彙と同じく state には複製保存せず、HTMLに埋め込んだ SOUTENU から都度作る。
// idはデータ側に固定で持たせてある（sout_+見出しのスラグ）。配列位置に依存しないので、
// 後から表現を追加・並べ替えしても既存の進捗がずれない。
// 品詞デッキには入れないので、単語ホームの件数・レベル別内訳には影響しない。
let _soutenuCardById = null, _soutenuCatById = null;
function ensureSoutenuIndex(){
  if(_soutenuCardById) return;
  _soutenuCardById = {}; _soutenuCatById = {};
  (SOUTENU.sections||[]).forEach(sec=>(sec.cats||[]).forEach(cat=>{
    _soutenuCatById[cat.id] = Object.assign({sectionId: sec.id, sectionTitle: sec.title}, cat);
    (cat.items||[]).forEach(it=>{
      _soutenuCardById[it.id] = {
        id: it.id, soutenu:true, catId:cat.id, catTitle:cat.title,
        front: it.std, fr: it.std, back: it.sout, sout: it.sout, lv: it.lv,
        posJa: "上品な言い方", ja: it.ja, ok: it.ok, ng: it.ng||"",
        exFr: it.exFr, exJa: it.exJa, use: it.use||[], plain: it.plain||""
      };
    });
  }));
}
function soutenuCardById(){ ensureSoutenuIndex(); return _soutenuCardById; }
function soutenuCat(catId){ ensureSoutenuIndex(); return _soutenuCatById[catId]; }
function soutenuCatIds(catId){ const c = soutenuCat(catId); return c ? c.items.map(it=>it.id) : []; }
function soutenuAllIds(sectionId){
  const out = [];
  (SOUTENU.sections||[]).forEach(sec=>{ if(!sectionId || sec.id===sectionId) (sec.cats||[]).forEach(cat=>(cat.items||[]).forEach(it=>out.push(it.id))); });
  return out;
}
const SOUT_LV = {1:{label:"日常で使える", cls:"lv1"}, 2:{label:"改まった場面", cls:"lv2"}, 3:{label:"文語・読めればいい", cls:"lv3"}};
function soutLvPill(lv){ const L = SOUT_LV[lv] || SOUT_LV[1]; return `<span class="pill sout-${L.cls}">${esc(L.label)}</span>`; }

// 名詞カードの定冠詞（le / la / l' / les）を gram 列の性の表記から機械導出する。
// データ側には冠詞を持たせない（gram列が唯一の正）。導出できない語（インポートした
// デッキ・タップ登録の即席カード・性の表記がない語）は null を返し、何も付けない。
// 有音のh（h aspiré）で始まる語はエリジオンしないので明示リストで除外する。
const H_ASPIRE = new Set(["hamburger","hangar","homard","hanche","héros","hall","hache","hauteur",
  "hasard","hâte","haine","halte","harnais","honte","harcèlement","handicap","hiérarchie",
  "haut","hausse","hibou","hockey","hors-d'œuvre","hublot","huit","hurlement","hutte",
  // 2026-09 レビュー追加（同梱語彙のh始まり名詞を全件点検して不足分を補充）
  "haricot","haie","hotte","hameau","hérisson","handball","hareng","harpe","hêtre","houx"]);
function nounArticle(c){
  if(!c || c.pos !== "NOM" || !c.fr || !c.gram) return null;
  const g = String(c.gram).trim();
  const word = String(c.fr).trim();
  const first = word.split(/\s/)[0].toLowerCase();
  // gram列に「h 有音」「h aspiré」と書かれた語もリストと同様に扱う（リスト漏れの保険）
  const hAspire = H_ASPIRE.has(first) || /h\s*(有音|aspiré)/i.test(g);
  const vowelStart = /^[aàâäeéèêëiîïoôöuùûüœæ]/i.test(word) ||
    (/^h/i.test(word) && !hAspire);
  // 複数でしか使わない語（「男性・複数」「女性複数」「女性・複数のみ」等）。
  // 「男性複数: cristaux」のように不規則複数形の注記だけの語は単数扱い。
  if(/^(男性|女性)・?複数(のみ)?$/.test(g)) return {art:"les", sep:" "};
  if(/^男女同形|意味が変わる/.test(g)) return vowelStart ? {art:"l'", sep:""} : {art:"le / la", sep:" "};
  if(/^男性/.test(g)) return vowelStart ? {art:"l'", sep:""} : {art:"le", sep:" "};
  if(/^女性/.test(g)) return vowelStart ? {art:"l'", sep:""} : {art:"la", sep:" "};
  return null;
}
// 表示用HTML（冠詞は薄く、見出し語は通常の濃さ）
function nounWithArticleHtml(c){
  const a = nounArticle(c);
  const w = esc(c.front);
  if(!a) return w;
  return `<span class="noun-art">${esc(a.art)}${a.sep}</span>${w}`;
}
// 読み上げ用テキスト（冠詞が一意に決まるときだけ冠詞ごと読む。性を耳でも覚えられる）
function nounSpeakText(c){
  const a = nounArticle(c);
  const w = c.fr || c.front;
  if(!a || a.art.indexOf("/") >= 0) return w;
  return a.art + a.sep + w;
}
function seedDefaultVocab(){
  // 同梱の5000語超を初回起動時にだけ、品詞別デッキに分けて自動追加する。
  // ユーザーがデッキを削除しても再追加しないよう vocabSeeded フラグで一度きりにする。
  // カード本体（訳・例文等）はstateに複製保存しない——HTMLに埋め込み済みのVOCAB_DEFAULTから
  // getCard()がその都度組み立てる。以前は複製していたため、学習前の時点でlocalStorageが
  // 2MB超（大半が単語データの重複）になっていた問題があった。
  if(state.vocabSeeded) return;
  state.vocabSeeded = true;
  if(!VOCAB_DEFAULT.length){ save(); return; }
  POS_DECK_ORDER.forEach(pos=>{
    const deckId = VOCAB_DEFAULT_PREFIX + pos.toLowerCase();
    const ids = defaultDeckIds(deckId);
    if(!ids.length) return;
    if(state.vocabDecks[deckId]) return;
    const name = `単語帳: ${POS_DECK_NAME[pos]||pos}（${ids.length}語）`;
    state.vocabDecks[deckId] = {id:deckId, name, createdAt:Date.now(), cardIds:ids};
  });
  state.vocabPosSeen = POS_DECK_ORDER.filter(pos=>defaultDeckIds(VOCAB_DEFAULT_PREFIX + pos.toLowerCase()).length);
  save();
}
function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const d = defaultState();
      const s = Object.assign(d, JSON.parse(raw));
      // 後から追加したキーが古い保存データに無い場合の補完（浅いマージでは届かない入れ子の分）
      s.conjug = Object.assign(defaultState().conjug, s.conjug || {});
      if(!Array.isArray(s.conjug.tenses) || !s.conjug.tenses.length) s.conjug.tenses = ["present","passe_compose"];
      if(!s.vocabFav) s.vocabFav = {};
      if(!s.vocabNotes) s.vocabNotes = {};
      if(!s.vocabLog) s.vocabLog = {};
      if(!s.vocabReviewLog) s.vocabReviewLog = {};
      if(!s.exampleFav) s.exampleFav = {};
      if(!s.readingSets) s.readingSets = {};
      if(!s.readingSaved) s.readingSaved = {};
      if(!s.phraseFav) s.phraseFav = {};
      if(!s.phraseText) s.phraseText = {};
      if(!s.phraseCustom) s.phraseCustom = {};
      // uiVocabHome（単語ホームだけの表示切り替え）は uiTheme（アプリ全体のテーマ切り替え）に統合した。
      // 旧キーが残っていれば一度だけ引き継ぐ。
      if(!s.uiTheme) s.uiTheme = s.uiVocabHome || "kanban";
      delete s.uiVocabHome;
      if(!s.uiColorMode) s.uiColorMode = "auto";
      if(!s.uiExMode) s.uiExMode = "general";
      if(!s.essays) s.essays = {};
      if(!s.aiItems) s.aiItems = {};
      if(!s.aiOff) s.aiOff = {};
      if(!s.aiBad) s.aiBad = {};
      if(!s.aiCommDrills) s.aiCommDrills = {};
      if(!s.aiTone) s.aiTone = {};
      if(!s.dlgStats) s.dlgStats = {};
      // 旧バージョンが複製保存した同梱5,002語のカード実体をlocalStorageから除去する
      // （getCard()がVOCAB_DEFAULTから組み立てるので不要。1回だけ効く一方向の掃除）。
      // この時点ではまだ save() が使うグローバルstateが未確定なので直接setItemする。
      if(s.vocabCards){
        let removed = 0;
        Object.keys(s.vocabCards).forEach(id=>{
          if(id.startsWith(VOCAB_DEFAULT_PREFIX)){ delete s.vocabCards[id]; removed++; }
        });
        if(removed){
          try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }
          catch(e){ console.warn("旧データ掃除後の保存に失敗", e); }
        }
      }
      // 単語カードidの生成方式を「配列インデックス」から「見出し語ベースの安定id」に
      // 移行する（旧方式は、後からgen/*.txtに新しい単語ファイルを追加すると同じpos内の
      // 既存語の並び順が変わり、同じidが別の語を指すようになってしまう不具合があった
      // ——2026-09-16、本人からの「単語カードのレベル別が出てこない」報告で発覚）。
      // 1回だけ実行: 旧方式（deckId+"_"+数字）のidを検出し、現時点でそのidが指している
      // 語（＝本人が実際に学習してきた語）に新しい安定idを割り当て直し、復習履歴・
      // お気に入り・メモを引き継ぐ。以降は見出し語ベースなので、新しい単語ファイルを
      // 追加しても既存語のidはもうずれない。
      const wasIdsMigrated = !!s.vocabIdsMigrated;
      if(!wasIdsMigrated){
        s.vocabIdsMigrated = true;
        POS_DECK_ORDER.forEach(pos=>{
          const deckId = VOCAB_DEFAULT_PREFIX + pos.toLowerCase();
          const deck = s.vocabDecks[deckId];
          if(!deck || !Array.isArray(deck.cardIds)) return;
          const newIds = defaultDeckIds(deckId);
          deck.cardIds.forEach(oldId=>{
            if(oldId.indexOf(deckId+"_") !== 0) return;
            const rest = oldId.slice(deckId.length+1);
            if(!/^\d+$/.test(rest)) return; // 見出し語スラグは数字だけにはならないので旧方式のみ検出
            const newId = newIds[parseInt(rest,10)];
            if(!newId || newId === oldId) return;
            if(s.vocabProgress[oldId]){ if(!s.vocabProgress[newId]) s.vocabProgress[newId] = s.vocabProgress[oldId]; delete s.vocabProgress[oldId]; }
            if(s.vocabFav[oldId]){ if(!s.vocabFav[newId]) s.vocabFav[newId] = s.vocabFav[oldId]; delete s.vocabFav[oldId]; }
            if(s.vocabNotes[oldId]){ if(!s.vocabNotes[newId]) s.vocabNotes[newId] = s.vocabNotes[oldId]; delete s.vocabNotes[oldId]; }
          });
          // 進捗・お気に入り・メモの引き継ぎが終わったら、デッキのcardIds自体も
          // 新方式のid一覧に丸ごと差し替える（旧idを残したままだと次の「補充」処理が
          // 旧idと新idを両方持つ二重状態と誤認してしまうため）。
          deck.cardIds = newIds.slice();
        });
      }
      // 既存デッキに、後から追加された語（新しい単語ファイル分。ビジネス語彙等）を補充する。
      // 安定id方式なので既存語のidは変わらず、無いものだけ末尾に追加する。
      let vocabSynced = false;
      // 同梱語に新しい品詞（数詞NUMなど）が増えたときは、その品詞デッキを一度だけ作る。
      // vocabPosSeen＝これまでに作った品詞デッキ。ユーザーが自分で消したデッキは作り直さない。
      // このキーが無い古いデータは、数詞デッキ追加（2026-09-26）より前なので NUM 以外は作成済みとみなす。
      if(s.vocabSeeded && !Array.isArray(s.vocabPosSeen)){
        s.vocabPosSeen = POS_DECK_ORDER.filter(pos=>pos !== "NUM");
        vocabSynced = true;
      }
      if(s.vocabSeeded){
        POS_DECK_ORDER.forEach(pos=>{
          if(s.vocabPosSeen.includes(pos)) return;
          const deckId = VOCAB_DEFAULT_PREFIX + pos.toLowerCase();
          const ids = defaultDeckIds(deckId);
          if(!ids.length) return;
          if(!s.vocabDecks[deckId]) s.vocabDecks[deckId] = {id:deckId, name:`単語帳: ${POS_DECK_NAME[pos]||pos}（${ids.length}語）`, createdAt:Date.now(), cardIds:ids.slice()};
          s.vocabPosSeen.push(pos);
          vocabSynced = true;
        });
      }
      POS_DECK_ORDER.forEach(pos=>{
        const deckId = VOCAB_DEFAULT_PREFIX + pos.toLowerCase();
        const deck = s.vocabDecks[deckId];
        if(!deck || !Array.isArray(deck.cardIds)) return;
        const newIds = defaultDeckIds(deckId);
        const have = new Set(deck.cardIds);
        const missing = newIds.filter(id=>!have.has(id));
        if(missing.length){
          deck.cardIds = deck.cardIds.concat(missing);
          deck.name = `単語帳: ${POS_DECK_NAME[pos]||pos}（${deck.cardIds.length}語）`;
          vocabSynced = true;
        }
      });
      if(!wasIdsMigrated || vocabSynced){
        try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }
        catch(e){ console.warn("単語id移行/補充後の保存に失敗", e); }
      }
      return s;
    }
  }catch(e){ console.warn("localStorage 読み込み失敗", e); }
  return defaultState();
}
function save(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch(e){
    console.warn("localStorage 保存失敗", e);
    showErrorBanner("進捗を保存できませんでした（" + (e && e.name || "エラー") + "）。プライベートブラウズ中か、ストレージの空き容量が無い可能性があります。");
  }
}
function prog(tid){
  if(!state.progress[tid]) state.progress[tid] = {ema:EMA_INIT, attempts:0, correct:0, lastAt:null};
  return state.progress[tid];
}
function recordAnswer(item, correct){
  const p = prog(item.topic_id);
  p.ema = p.ema*(1-ALPHA) + (correct?1:0)*ALPHA;
  p.attempts++;
  if(correct) p.correct++;
  p.lastAt = Date.now();
  const s = state.items[item.id] || {seen:0, correct:0, lastAt:null};
  s.seen++; if(correct) s.correct++; s.lastAt = Date.now();
  state.items[item.id] = s;
  const day = todayStamp();
  state.log[day] = (state.log[day]||0) + 1;
  save();
}

/* ---------- 出題ロジック ---------- */
function weightOf(tid){
  const p = state.progress[tid];
  const ema = p ? p.ema : EMA_INIT;
  return Math.max(MIN_WEIGHT, 1 - ema);
}
function shuffle(a){
  const r = a.slice();
  for(let i=r.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [r[i],r[j]]=[r[j],r[i]]; }
  return r;
}
// 出題プール。同梱の問題に、そのトピックのAI生成問題（出題オンのもの・除外していないもの）を合流させる。
// ドリルも bilan もここを通るので、AI生成問題は自然に両方へ混ざる。
function itemsOf(tid){ return DATA.items.filter(i=>i.topic_id===tid).concat(aiActiveItemsOf(tid)); }
function aiItemsOf(tid){ return Object.values(state.aiItems||{}).filter(i=>i.topic_id===tid).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)); }
function aiTopicOn(tid){ const o = (state.aiOff||{})[tid]; return !(o && o.off); }
function aiActiveItemsOf(tid){ return aiTopicOn(tid) ? aiItemsOf(tid).filter(i=>!(state.aiBad||{})[i.id]) : []; }
function findItem(id){ return DATA.items.find(i=>i.id===id) || (state.aiItems||{})[id]; }

// 未出題・間違えた問題を優先しつつ、同じ問題の連続を避ける
// src: "all"（通常：同梱＋出題オンのAI問題）／"ai"（AI生成の問題だけ。オン/オフの設定に関係なく、外した問題は除く）
function drillPool(tid, src){
  if(src === "ai") return aiItemsOf(tid).filter(i=>!(state.aiBad||{})[i.id]);
  return itemsOf(tid);
}
function pickDrill(tid, n, src){
  const pool = drillPool(tid, src).map(it=>{
    const s = state.items[it.id];
    let score = Math.random();
    if(!s) score += 1.5;                                   // 未出題を優先
    else{
      const acc = s.seen ? s.correct/s.seen : 0;
      score += (1-acc)*1.2;                                // 正答率が低いほど優先
      const days = (Date.now()-(s.lastAt||0))/86400000;
      score += Math.min(days,7)/14;                        // 久しぶりのものを少し優先
    }
    return {it, score};
  });
  pool.sort((a,b)=>b.score-a.score);
  return shuffle(pool.slice(0, Math.max(n, Math.min(n+4, pool.length))).map(x=>x.it)).slice(0,n);
}

// bilan: 弱いトピックほど多く出す。トピック名は伏せる。
function pickBilan(n){
  const tids = DATA.topics.map(t=>t.id).filter(tid=>itemsOf(tid).length>0);
  const weights = tids.map(weightOf);
  const total = weights.reduce((a,b)=>a+b,0);
  const out = [];
  tids.forEach((tid,idx)=>{
    const share = Math.round(n * weights[idx] / total);
    if(share>0) out.push(...pickDrill(tid, Math.min(share, itemsOf(tid).length)));
  });
  // 端数調整
  while(out.length < n){
    const tid = tids[Math.floor(Math.random()*tids.length)];
    const cand = itemsOf(tid).filter(i=>!out.includes(i));
    if(!cand.length) break;
    out.push(cand[Math.floor(Math.random()*cand.length)]);
  }
  return shuffle(out).slice(0,n);
}

/* ---------- 解答の照合 ---------- */
function normalize(s){
  return (s||"")
    .replace(/[’ʼ`´]/g,"'")   // アポストロフィの揺れを吸収
    .replace(/\s+/g," ")
    .replace(/\s*([.?!;:])\s*$/,"")               // 文末の約物は無視
    .replace(/\s+'/g,"'").replace(/'\s+/g,"'")
    .trim()
    .toLowerCase();
}
function matches(input, item){
  const norm = normalize(input);
  if(!norm) return false;
  const list = item.accepted_answers || [item.correct_answer];
  return list.some(a=>normalize(a)===norm);
}

/* ---------- AI相談プロンプト ---------- */
function buildPrompt(item, userAnswer){
  const t = DATA.topics.find(x=>x.id===item.topic_id) || {};
  const L = [];
  L.push("フランス語の文法練習をしています。私の答案を添削してください。");
  L.push("");
  L.push("【文法項目】" + (t.name_jp||item.topic_id) + (item.target_structure ? "（"+item.target_structure+"）" : ""));
  if(item.prompt_jp) L.push("【問題（日本語）】" + item.prompt_jp);
  if(item.prompt_fr) L.push("【問題（フランス語）】" + item.prompt_fr);
  L.push("【私の答案】" + (userAnswer||"（無回答）"));
  L.push("【模範解答】" + (item.model_answer || item.correct_answer));
  L.push("");
  L.push("次の点を日本語で説明してください。");
  L.push("1. 私の答案は文法的に正しいか。誤りがあれば、どこがどう違うか。");
  L.push("2. 模範解答と違う場合、それは誤りなのか、それとも許容される別解なのか。");
  L.push("3. この文法項目について、私が取り違えている可能性のある考え方があれば指摘してください。");
  return L.join("\n");
}
async function copyText(txt, btn){
  try{
    await navigator.clipboard.writeText(txt);
    if(btn){ const o=btn.textContent; btn.textContent="コピーしました"; setTimeout(()=>btn.textContent=o,1600); }
    return true;
  }catch(e){
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    let ok=false;
    try{ ok = document.execCommand("copy"); }catch(_){}
    document.body.removeChild(ta);
    if(btn){ const o=btn.textContent; btn.textContent = ok?"コピーしました":"手動でコピーしてください"; setTimeout(()=>btn.textContent=o,1900); }
    return ok;
  }
}

/* ---------- 描画ユーティリティ ---------- */
const el = document.getElementById("view");
const backBtn = document.getElementById("backBtn");
const titleEl = document.getElementById("title");
function esc(s){ return (s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function fmtPct(x){ return Math.round(x*100) + "%"; }
function setBack(fn,label){
  if(fn){ backBtn.classList.remove("hidden"); backBtn.textContent = label||"戻る"; backBtn.onclick = fn; }
  else backBtn.classList.add("hidden");
}

/* ---------- ホーム ---------- */
function renderHome(){
  titleEl.textContent = "Grammaire";
  setBack(null);
  // 「今日の回答数」と同じ範囲（文法・単語・読解の回答をすべて含む state.log）で累計する
  const totalAns = Object.values(state.log||{}).reduce((a,n)=>a+(+n||0),0);
  const today = state.log[todayStamp()] || 0;
  const streak = currentStreak();
  const started = DATA.topics.filter(t=>state.progress[t.id]&&state.progress[t.id].attempts>0);

  let h = "";
  h += `<button class="card gs-entry" onclick="openSearch('')">🔍 <span class="muted">アプリ全体を検索（単語・文法・表現・会話…）</span></button>`;
  h += `<button class="card gs-entry" onclick="openVerbDictionary('')">📖 <span>動詞辞書 <span class="muted">${VERB_INDEX.length.toLocaleString()}見出し・意味と活用を調べる</span></span></button>`;
  h += todayCardHtml();
  h += `<div class="grid3" style="margin-bottom:14px">
    <div class="stat"><b>${streak>0?"🔥"+streak:0}</b><span>連続学習日数</span></div>
    <div class="stat"><b>${today}</b><span>今日の回答数</span></div>
    <div class="stat"><b>${totalAns}</b><span>累計回答数</span></div>
  </div>`;

  // 単語モード（Anki風）
  h += `<div class="card"><div class="spread">
    <div><h2 style="margin:0">単語（Anki風）</h2>
      <p class="small muted" style="margin:4px 0 0">${vocabDueCount()}枚 復習待ち ・ ${vocabNewCount()}枚 未着手 ・ ${vocabTotalCount()}枚 登録済み</p></div>
    <button class="btn primary" onclick="openVocabHome()">開く</button>
  </div></div>`;

  // 動詞活用の瞬発ドリル
  h += `<div class="card"><div class="spread">
    <div><h2 style="margin:0">動詞活用ドリル</h2>
      <p class="small muted" style="margin:4px 0 0">不定詞・時制・人称から活用形を即答する練習。${CONJUG.verbs.length}動詞 × ${CONJUG.tenses.length}時制</p></div>
    <button class="btn" onclick="openConjugHome()">開く</button>
  </div></div>`;

  // 早口言葉などの読み物は左上の☰メニューに集約した（ホームにドリルが埋もれないように）

  // 正答率バーチャート
  h += `<div class="card"><div class="spread" style="margin-bottom:12px">
    <h2 style="margin:0">トピック別 正答率</h2>
    <span class="small muted">${started.length}/${DATA.topics.length} 着手</span></div>`;
  if(!started.length){
    h += `<p class="muted small" style="margin:0">まだデータがない。ドリルを何問か解くとここに苦手が並ぶ。</p>`;
  }else{
    h += `<div class="chart">`;
    const sorted = started.slice().sort((a,b)=>state.progress[a.id].ema - state.progress[b.id].ema);
    sorted.forEach(t=>{
      const p = state.progress[t.id];
      const pct = p.ema;
      const cls = pct<0.6 ? "low" : (pct<0.8 ? "mid" : "");
      h += `<div class="chart-row"><div>
        <div class="chart-label">${esc(t.name_jp)}</div>
        <div class="chart-track"><div class="chart-fill ${cls}" style="width:${Math.round(pct*100)}%"></div></div>
      </div><div class="chart-val">${fmtPct(pct)}</div></div>`;
    });
    h += `</div>`;
  }
  h += `</div>`;

  h += `<div class="card"><h2>bilan（総合テスト）</h2>
    <p class="small muted" style="margin:0 0 12px">複数トピックを混ぜて出題する。どの文法項目かは伏せられるので、自分で判断する必要がある。正答率の低いトピックほど多く出る。</p>
    <div class="actions" style="margin-top:0">
      <button class="btn primary" onclick="startBilan(10)">10問</button>
      <button class="btn" onclick="startBilan(20)">20問</button>
      <button class="btn" onclick="startBilan(30)">30問</button>
    </div></div>`;

  // トピック一覧
  const fams = [];
  DATA.topics.forEach(t=>{ if(!fams.includes(t.family||"")) fams.push(t.family||""); });
  const famName = {relatifs:"関係代名詞", connecteurs:"接続詞", subjonctif:"接続法", conditionnel:"条件法",
    participes:"分詞・ジェロンディフ", temps:"時制", pronoms:"代名詞", determinants:"冠詞・限定詞",
    verbes:"動詞の語法", syntaxe:"文の組み立て", prepositions:"前置詞",
    adverbes:"副詞", communication:"コミュニケーション", derivation:"語の派生（語族）", nuances:"まぎらわしい語の使い分け"};
  fams.forEach(f=>{
    h += `<h3>${esc(famName[f]||f)}</h3><div class="card" style="padding:4px 16px">`;
    DATA.topics.filter(t=>(t.family||"")===f).forEach(t=>{
      const p = state.progress[t.id];
      const n = itemsOf(t.id).length;
      const meta = p&&p.attempts ? `${fmtPct(p.ema)} ・ ${p.attempts}回` : `${n}問`;
      h += `<div class="topic" onclick="openTopic('${t.id}')">
        <span class="lvl">${esc(t.level)}</span>
        <span class="tname">${esc(t.name_jp)}</span>
        <span class="tmeta">${meta}</span>
      </div>`;
    });
    h += `</div>`;
  });

  h += `<div class="card"><h2>設定</h2>
    <div class="actions" style="margin-top:0">
      <button class="btn small" onclick="exportProgress()">進捗を書き出す</button>
      <button class="btn small" onclick="document.getElementById('impFile').click()">進捗を読み込む</button>
      <button class="btn small" onclick="resetProgress()">進捗をリセット</button>
    </div>
    <input type="file" id="impFile" accept="application/json" class="hidden" onchange="importProgress(this)">
    <p class="small muted" style="margin:12px 0 0">進捗はこの端末のブラウザ内にだけ保存される。別の端末で続けたいときは書き出したファイルを読み込む。</p>
  </div>`;

  h += `<p class="footer-note">全${DATA.items.length}問 ・ ${DATA.topics.length}トピック（A2〜C1）・ 単語${vocabTotalCount()}語 ・ 活用ドリル${CONJUG.verbs.length}動詞<br>学習履歴は端末に保存します。初回・更新時・未保存の辞書を開く際には通信します。保存済みの内容はオフラインでも利用できます。</p>`;
  el.innerHTML = h;
}



/* ---------- 今日の10分 ----------
   ホームからすぐ始められる短い一続きの練習：単語の復習10枚 → 苦手な文法3問 → 会話の続き1本。
   既存のドリルをそのまま順に呼び、各ドリルの終了画面から「次へ」で戻ってくる。
   その日の進み具合は state.todayPlan（端末ごと・同期しない）に持つ。日付が変われば作り直す。 */
const TODAY_STEPS = [
  {id:"vocab", label:"単語の復習 10枚", min:4},
  {id:"grammar", label:"苦手な文法 3問", min:3},
  {id:"scene", label:"会話の続き 1本", min:3},
];
function todayPlan(){
  const d = todayStamp();
  if(!state.todayPlan || state.todayPlan.day !== d) state.todayPlan = {day:d, vocab:false, grammar:false, scene:false, round:1};
  return state.todayPlan;
}
function todayCardHtml(){
  const p = todayPlan();
  const next = TODAY_STEPS.find(st=>!p[st.id]);
  const allDone = !next;
  return `<div class="card today-card"><div class="spread" style="align-items:flex-start">
    <div><h2 style="margin:0">今日の10分</h2>
      <div class="today-steps">${TODAY_STEPS.map(st=>`<span class="today-step ${p[st.id]?"done":""}">${p[st.id]?"✓":"○"} ${esc(st.label)}</span>`).join("")}</div>
    </div>
    ${allDone
      ? `<div style="text-align:right"><div class="small" style="font-weight:600;color:var(--accent)">完了 🎉</div><button class="btn small" style="margin-top:6px" onclick="todayAgain()">もう1セット</button></div>`
      : `<button class="btn primary" onclick="todayStart()">${TODAY_STEPS.some(st=>p[st.id]) ? "続きから" : "始める"}</button>`}
  </div></div>`;
}
function todayAgain(){ const p = todayPlan(); p.vocab = p.grammar = p.scene = false; p.round = (p.round||1) + 1; save(); todayStart(); }
function todayStart(){
  try{
    const p = todayPlan();
    const next = TODAY_STEPS.find(st=>!p[st.id]);
    if(!next) return renderHome();
    const back = {fn:()=>todayDone(next.id), label:"今日の10分"};
    if(next.id === "vocab"){
      let ids = shuffle(vocabDueIds(null)).slice(0, 10);
      if(ids.length < 10) ids = ids.concat(vocabNewIds(null).slice(0, 10 - ids.length));
      if(!ids.length){ p.vocab = true; save(); return todayStart(); }
      vocabSession = null;
      startVocabStudy(ids, "all", "今日の10分：単語", back);
    } else if(next.id === "grammar"){
      const items = todayGrammarItems(3);
      if(!items.length){ p.grammar = true; save(); return todayStart(); }
      session = {items, idx:0, results:[], mode:"bilan", requeued:[], requeuedOnce:{}, today:true};
      renderQuestion();
    } else {
      const d = todayDialogue();
      if(!d){ p.scene = true; save(); return todayStart(); }
      startDialogue(d.id, ()=>renderHome(), "今日の10分");
    }
  }catch(e){ showErrorBanner("今日の10分でエラー： " + e.message); }
}
function todayDone(stepId){
  const p = todayPlan();
  p[stepId] = true;
  save();
  if(TODAY_STEPS.every(st=>p[st.id])){ renderHome(); window.scrollTo(0,0); return; }
  todayStart();
}
// 苦手な文法：着手済みトピックを正答率（ema）の低い順に並べ、上位のトピックから1問ずつ。
// 着手が少なければ bilan と同じ重み付けで補う。短時間で終わるよう選択式・穴埋めを優先する。
function todayGrammarItems(n){
  const quick = it=> it.type==="mcq" || it.type==="fill_blank";
  const started = DATA.topics.filter(t=>state.progress[t.id] && state.progress[t.id].attempts>0)
    .sort((a,b)=>state.progress[a.id].ema - state.progress[b.id].ema);
  const out = [];
  for(const t of started){
    if(out.length >= n) break;
    const cand = itemsOf(t.id).filter(quick);
    if(cand.length) out.push(cand[Math.floor(Math.random()*cand.length)]);
  }
  if(out.length < n){
    pickBilan(n*3).filter(quick).forEach(it=>{ if(out.length < n && !out.includes(it)) out.push(it); });
  }
  return out.slice(0, n);
}
// 会話の続き：まだやっていないものから。全部やったら一番前にやったものから。
function todayDialogue(){
  if(!DIALOGUES.length) return null;
  const fresh = DIALOGUES.filter(d=>!state.dlgStats[d.id]);
  if(fresh.length) return fresh[Math.floor(Math.random()*fresh.length)];
  return DIALOGUES.slice().sort((a,b)=>(state.dlgStats[a.id].lastAt||0) - (state.dlgStats[b.id].lastAt||0))[0];
}

/* ---------- アプリ全体の検索 ----------
   単語・文法トピック・活用表・上品なフランス語・トーン選択・コミュニケーション・会話の続き・
   慣用句・文例集を一度に探す。「断る」と入れれば、単語も文例もトーン問題も会話タスクも並ぶ。
   照合は大文字小文字・アクセントを無視した部分一致（日本語はそのまま部分一致）。
   索引は初回だけ作ってメモリに置く（データはビルド時に埋め込み済みで変わらないため）。 */
let _gsIndex = null, _gsQuery = "", _gsTimer = null, _gsMore = {};
function gsNorm(t){ return String(t||"").normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[’‘]/g,"'").toLowerCase(); }
function gsBuildIndex(){
  if(_gsIndex) return _gsIndex;
  const X = [];
  const add = (group, key, text, rec)=>X.push(Object.assign({group, key, t: gsNorm(text)}, rec));
  // 単語（同梱語彙）
  Object.entries(defaultCardById()).forEach(([id,c])=>{
    const senses = (c.senses||[]).map(s=>s[0]+" "+s[1]).join(" ");
    add("vocab", id, [c.fr, c.ja, c.en, senses].join(" | "), {id, fr:c.fr, frN:gsNorm(c.fr), label:c.fr, sub:c.ja + (c.senses&&c.senses.length ? "／" + c.senses.map(s=>s[0]).join("／") : ""), level:c.level, posJa:c.posJa});
  });
  // 文法トピック
  DATA.topics.forEach(t=>add("topic", t.id, [t.name_jp, t.name_fr, t.explanation_jp, (t.examples||[]).map(e=>(e.fr||"")+" "+(e.jp||e.ja||"")).join(" ")].join(" | "), {id:t.id, label:t.name_jp, sub:(t.name_fr||"") + "・" + t.level}));
  // 活用表
  CONJUG.verbs.forEach(v=>add("conj", v.fr, v.fr + " | " + v.ja, {id:v.fr, fr:v.fr, frN:gsNorm(v.fr), label:v.fr, sub:v.ja}));
  VERB_INDEX.forEach(v=>add("verb", v.id, [v.fr,v.ja,v.en].join(" | "), {id:v.id, fr:v.fr, frN:gsNorm(v.fr), label:v.fr, sub:[v.ja||"訳・例文を整備中",...v.flags].join(" ・ ")}));
  // 上品なフランス語
  Object.values(soutenuCardById()).forEach(c=>add("sout", c.id, [c.std, c.sout, c.ja, c.ok, c.ng, c.plain, c.exFr, c.exJa, (c.use||[]).join(" ")].join(" | "), {id:c.id}));
  // トーン選択
  (TONE.cats||[]).forEach(cat=>(cat.items||[]).forEach(it=>add("tone", it.id, [it.situ].concat(it.opts.map(o=>o.fr+" "+o.note)).join(" | "), {item:it, catTitle:cat.title})));
  // コミュニケーション（タスクと表現）
  (COMM.tasks||[]).forEach(t=>{
    add("comm", t.id, [t.title, t.sub, t.situation_ja].join(" | "), {id:t.id, label:t.title, sub:t.sub});
    (t.roles||[]).forEach(r=>(r.items||[]).forEach(it=>add("commx", it.id, [it.std, it.ja, it.note, it.exFr, it.exJa].join(" | "), {taskId:t.id, label:it.std, sub:it.ja + "（" + t.title + "／" + r.title + "）"})));
  });
  // 会話の続き
  DIALOGUES.forEach(d=>add("dlg", d.id, [d.title_ja, d.situation_ja].concat(d.turns.map(tu=> tu.who==="other" ? tu.fr+" "+tu.ja : (tu.prompt_ja||"")+" "+tu.options.map(o=>o.fr+" "+o.ja).join(" "))).join(" | "), {id:d.id, label:d.title_ja, sub:d.situation_ja}));
  // 慣用句
  Object.values(idiomCardById()).forEach(c=>add("idiom", c.id, [c.fr, c.ja, c.lit, c.note, c.exFr, c.exJa].join(" | "), {id:c.id}));
  // 文例集
  (PHRASES||[]).forEach(cat=>(cat.items||[]).forEach(it=>add("phrase", it.id, [it.fr, it.ja, it.note].join(" | "), {catId:cat.id, label:it.fr, sub:it.ja + "（" + cat.title + "）"})));
  _gsIndex = X;
  return X;
}
const GS_GROUPS = [
  {id:"vocab", title:"単語", n:12}, {id:"verb", title:"動詞辞書", n:12}, {id:"conj", title:"活用表", n:8}, {id:"topic", title:"文法トピック", n:8},
  {id:"sout", title:"上品なフランス語", n:5}, {id:"tone", title:"場面別トーン選択", n:5},
  {id:"comm", title:"コミュニケーション（タスク）", n:6}, {id:"commx", title:"コミュニケーション（表現）", n:8},
  {id:"dlg", title:"会話の続きを考える", n:6}, {id:"idiom", title:"慣用句", n:5}, {id:"phrase", title:"文例集", n:8},
];
function openSearch(q){
  try{
    vocabSession = null; _soutView = {type:"search"}; _idiomView = {type:"search"};
    titleEl.textContent = "検索";
    setBack(renderHome, "ホーム");
    if(typeof q === "string") _gsQuery = q;
    el.innerHTML = `<div class="card" style="padding:12px 14px">
      <input type="search" id="gsInput" placeholder="単語・表現・文法・場面を探す（例: 断る / refuser / 接続法）" value="${esc(_gsQuery)}"
        oninput="gsOnInput(this.value)" autocorrect="off" autocapitalize="off" spellcheck="false">
      <div class="small muted" style="margin-top:6px">フランス語はアクセントなしでも探せる。日本語でも探せる。</div>
    </div><div id="gsResult"></div>`;
    const inp = document.getElementById("gsInput");
    if(inp && !_gsQuery) inp.focus();
    renderSearchResults();
  }catch(e){ showErrorBanner("検索の表示でエラー： " + e.message); }
}
function gsOnInput(v){
  _gsQuery = v; _gsMore = {};
  clearTimeout(_gsTimer);
  _gsTimer = setTimeout(renderSearchResults, 150);
}
function gsMore(g){ _gsMore[g] = true; const y = window.scrollY; renderSearchResults(); window.scrollTo(0,y); }
function renderSearchResults(){
  try{
    const box = document.getElementById("gsResult"); if(!box) return;
    const nq = gsNorm(_gsQuery).trim();
    if(!nq){ box.innerHTML = `<p class="small muted" style="margin:8px 4px">探したい語を入れる。</p>`; return; }
    const idx = gsBuildIndex();
    const hits = {};
    idx.forEach(r=>{ if(r.t.indexOf(nq) >= 0) (hits[r.group] = hits[r.group] || []).push(r); });
    // 単語・活用表は見出しの一致を先頭に
    ["vocab","conj","verb"].forEach(g=>{ if(hits[g]) hits[g].sort((a,b)=>{
      const sa = a.frN===nq ? 0 : (a.frN.indexOf(nq)===0 ? 1 : (a.frN.indexOf(nq)>=0 ? 2 : 3));
      const sb = b.frN===nq ? 0 : (b.frN.indexOf(nq)===0 ? 1 : (b.frN.indexOf(nq)>=0 ? 2 : 3));
      return sa - sb || a.fr.length - b.fr.length; }); });
    const total = Object.values(hits).reduce((a,l)=>a+l.length,0);
    let h = `<p class="small muted" style="margin:4px 4px 8px">${total}件</p>`;
    if(total){
      h += `<div class="actions" style="margin:0 0 8px">` + GS_GROUPS.filter(g=>hits[g.id]).map(g=>`<a class="cj-chip" href="#gs_${g.id}" onclick="event.preventDefault();document.getElementById('gs_${g.id}').scrollIntoView({block:'start'})">${esc(g.title)} ${hits[g.id].length}</a>`).join("") + `</div>`;
    }
    const q = _gsQuery.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
    GS_GROUPS.forEach(g=>{
      const list = hits[g.id]; if(!list) return;
      const shown = _gsMore[g.id] ? list : list.slice(0, g.n);
      h += `<h3 id="gs_${g.id}" style="margin:16px 0 6px">${esc(g.title)}（${list.length}）</h3>`;
      if(g.id === "sout"){ const m = soutenuCardById(); h += shown.map(r=>soutenuItemCardHtml(m[r.id], true)).join(""); }
      else if(g.id === "idiom"){ const m = idiomCardById(); h += shown.map(r=>idiomItemCardHtml(m[r.id], true)).join(""); }
      else if(g.id === "tone"){
        h += shown.map(r=>{ const ok = r.item.opts.find(o=>o.tag==="ok"); return `<div class="card" style="padding:12px 14px">
          <div class="small muted">${esc(r.catTitle)}</div><div style="margin:2px 0 6px"><b>${esc(r.item.situ)}</b></div>
          ${r.item.opts.map(o=>`<div class="small" style="margin:3px 0"><span class="tone-tag ${o.tag}">${TONE_TAG[o.tag]}</span><span class="tone-fr">${esc(o.fr)}</span><span class="tone-note">${esc(o.note)}</span></div>`).join("")}
        </div>`; }).join("");
      } else {
        h += `<div class="card" style="padding:4px 14px">` + shown.map(r=>{
          let on = "";
          if(g.id === "vocab") {
            const dictionaryEntry=verbByLemma.get(r.fr);
            on = dictionaryEntry && !verbPracticeAllowed(r.fr) ? `openVerbEntry(${dictionaryEntry.id},true)` : `startVocabStudy(['${r.id}'],'all','検索：${esc(r.fr).replace(/'/g,"\\'")}',{fn:()=>openSearch(),label:'検索'})`;
          }
          else if(g.id === "topic") on = `openTopic('${r.id}')`;
          else if(g.id === "conj") on = `openConjugTable('${r.id.replace(/'/g,"\\'")}', ()=>openSearch(), '検索')`;
          else if(g.id === "verb") on = `openVerbEntry(${r.id},true)`;
          else if(g.id === "comm") on = `openCommTask('${r.id}')`;
          else if(g.id === "commx") on = `openCommTask('${r.taskId}')`;
          else if(g.id === "dlg") on = `startDialogue('${r.id}', ()=>openSearch(), '検索')`;
          else if(g.id === "phrase") on = `openPhraseCat('${r.catId}')`;
          const pills = g.id === "vocab" ? `${r.level ? `<span class="pill">${esc(r.level)}</span>` : ""}<span class="pill">${esc(r.posJa||"")}</span>` : "";
          return `<div class="topic gs-row" onclick="${on}">
            <span class="tname"><span class="gs-label">${esc(r.label)}</span> ${pills}<br><span class="small muted">${esc(r.sub||"")}</span></span>
          </div>`;
        }).join("") + `</div>`;
      }
      if(!_gsMore[g.id] && list.length > g.n) h += `<div class="actions" style="margin-top:4px"><button class="btn small" onclick="gsMore('${g.id}')">残り${list.length - g.n}件も表示</button></div>`;
    });
    box.innerHTML = h;
  }catch(e){ showErrorBanner("検索でエラー： " + e.message); }
}

/* ---------- トピック詳細 ---------- */
function openTopic(tid){
  const t = DATA.topics.find(x=>x.id===tid);
  if(!t) return;
  titleEl.textContent = t.name_jp;
  setBack(renderHome, "ホーム");
  const n = itemsOf(tid).length;
  const nBase = DATA.items.filter(i=>i.topic_id===tid).length;
  const nAiUsable = drillPool(tid, "ai").length;
  const aiMixed = aiTopicOn(tid) && nAiUsable > 0;
  const p = state.progress[tid];
  let h = `<div class="card">
    <div class="spread" style="margin-bottom:10px">
      <div><span class="lvl">${esc(t.level)}</span> <b style="margin-left:6px">${esc(t.name_fr)}</b></div>
      ${p&&p.attempts?`<span class="small muted">正答率 ${fmtPct(p.ema)}</span>`:""}
    </div>
    <div class="expl">${esc(t.explanation_jp)}</div>
    ${grammarDiagram(t.id)}
  </div>`;
  h += `<div class="card"><h2>例文</h2>`;
  (t.examples||[]).forEach((e,idx)=>{
    const texId = "topex_" + t.id + "_" + idx;
    h += `<div class="ex">
      <div class="spread">
        <div class="f">${wrapTapWords(e.fr)}</div>
        <button class="fav-btn ${state.exampleFav[texId]?"on":""}" onclick="toggleTopicExampleFav('${t.id}',${idx})" title="構文・例文を保存">${state.exampleFav[texId]?"★":"☆"}</button>
      </div>
      <div class="j">${esc(e.jp)}</div>
    </div>`;
  });
  h += `</div>`;
  h += `<div class="card"><h2>ドリル（全${n}問）</h2>
    ${nAiUsable ? `<div class="small muted" style="margin:-4px 0 8px">お手本 ${nBase}問${aiMixed ? `＋AI生成 ${nAiUsable}問` : "（AI生成の問題は混ぜていない）"}</div>` : ""}
    <div class="actions" style="margin-top:0">
      <button class="btn primary" onclick="startDrill('${tid}',10)">10問</button>
      <button class="btn" onclick="startDrill('${tid}',20)">20問</button>
      <button class="btn" onclick="startDrill('${tid}',${n})">全${n}問</button>
    </div>
    ${nAiUsable ? `<div class="small" style="margin-top:12px">AI生成の問題だけで解く（${nAiUsable}問）</div>
    <div class="actions" style="margin-top:4px">
      <button class="btn" onclick="startDrill('${tid}',10,'ai')">10問</button>
      <button class="btn" onclick="startDrill('${tid}',${nAiUsable},'ai')">全${nAiUsable}問</button>
    </div>` : ""}
  </div>`;
  h += aiTopicCardHtml(tid);
  el.innerHTML = h;
  window.scrollTo(0,0);
}

/* ---------- 文法問題のAI生成モード ----------
   アプリは外部APIを一切呼ばない。やることは「プロンプトを組み立てて表示する」と
   「AIの返答（JSON）を貼り付けてもらって検証・取り込みする」の2つだけ（読解モードと同じ一往復）。
   ・問題数・例文のシチュエーション・形式の配分を選べる
   ・プロンプトには、トピックの解説、同梱のお手本問題（形式ごとに1問）、既存問題の一覧（重複防止）、
     形式ごとのルール、出力前の自己点検、出力スキーマを入れる
   ・取り込みは1問ずつ構造を検証し、通らない問題は理由を示して除外（他の問題は取り込む）
   ・取り込んだ問題は state.aiItems（id接頭辞 ai_）に保存し、itemsOf() 経由でドリル・bilan に混ざる
   ・トピックごとに出題オン/オフ（state.aiOff）、問題ごとに「おかしい」で除外（state.aiBad）
   同梱の手書き問題は品質の基準（お手本）であり、AI生成はそれを増やすための補助という位置づけ。 */
let aiGenConf = {n:10, situ:"mix", free:"", form:"mix"};
const AI_SITU = [
  {id:"mix",   label:"ミックス",       desc:"日常生活 約4割、業種を問わない一般的なビジネス（会議、メール、顧客対応、人事、営業、経理など）約4割、社会・ニュース 約2割"},
  {id:"daily", label:"日常生活",       desc:"日常生活（買い物、家族や友人、住まい、旅行、趣味、健康、役所や銀行の手続きなど）"},
  {id:"biz",   label:"一般ビジネス",   desc:"業種を問わない一般的なビジネス（会議、メール、電話、顧客対応、人事、営業、経理、プロジェクト管理など）"},
  {id:"society", label:"社会・ニュース", desc:"社会・ニュース（環境、教育、テクノロジー、経済、文化、政治的に中立な時事など）"},
];
const AI_FORM = [
  {id:"mix", label:"ミックス", ratio:{mcq:0.6, fill_blank:0.2, production:0.2}},
  {id:"mcq", label:"4択だけ", ratio:{mcq:1}},
  {id:"fill_blank", label:"穴埋めだけ", ratio:{fill_blank:1}},
  {id:"production", label:"作文だけ", ratio:{production:1}},
];
function aiFormCounts(n, formId){
  const f = AI_FORM.find(x=>x.id===formId) || AI_FORM[0];
  const types = Object.keys(f.ratio);
  const out = {}; let used = 0;
  types.forEach((t,i)=>{ const k = i===types.length-1 ? n-used : Math.round(n*f.ratio[t]); out[t] = Math.max(0,k); used += out[t]; });
  return out;
}
function aiTopicCardHtml(tid){
  const all = aiItemsOf(tid), bad = all.filter(i=>(state.aiBad||{})[i.id]).length, on = aiTopicOn(tid);
  let h = `<div class="card"><h2>AIで問題を増やす</h2>
    <p class="small muted" style="margin:0 0 8px">問題数と例文のシチュエーションを選ぶとプロンプトを作る。好きなAIに貼って、返ってきた答えを貼り戻すと、このトピックのドリルに混ざる。</p>`;
  if(all.length){
    h += `<div class="small" style="margin-bottom:6px">AI生成の問題：${all.length}問${bad?`（うち出題から外した ${bad}問）`:""}・出題に混ぜる：<b>${on?"オン":"オフ"}</b></div>`;
  }
  h += `<div class="actions" style="margin-top:0">
    <button class="btn primary" onclick="openAiGen('${tid}')">問題を作る</button>
    ${all.length ? `<button class="btn" onclick="toggleAiTopic('${tid}')">${on?"出題に混ぜない":"出題に混ぜる"}</button>
    <button class="btn" onclick="openAiItems('${tid}')">AI生成の問題を見る</button>` : ""}
  </div></div>`;
  return h;
}
function toggleAiTopic(tid){
  state.aiOff[tid] = {off: aiTopicOn(tid), lastAt: Date.now()};
  save(); openTopic(tid);
}
function markAiBad(id, btn){
  state.aiBad[id] = Date.now(); save();
  if(btn){ btn.disabled = true; btn.textContent = "外した（次回から出題しない）"; }
}
function openAiGen(tid){
  try{ openAiGenInner(tid); }
  catch(e){ showErrorBanner("AI生成画面の表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openAiGenInner(tid){
  const t = DATA.topics.find(x=>x.id===tid); if(!t) return;
  titleEl.textContent = "AIで問題を増やす";
  setBack(()=>openTopic(tid), "トピック");
  const C = aiGenConf;
  const cnt = aiFormCounts(C.n, C.form);
  let h = `<div class="card">
    <div class="small muted">${esc(t.level)}・${esc(t.name_jp)}</div>
    <h2>問題数</h2><div class="actions" style="margin-top:0">
      ${[5,10,20,30].map(k=>`<button class="btn ${C.n===k?"primary":""}" onclick="aiGenConf.n=${k};openAiGen('${tid}')">${k}問</button>`).join("")}
    </div>
    <h2>例文のシチュエーション</h2><div class="actions" style="margin-top:0">
      ${AI_SITU.map(x=>`<button class="btn ${C.situ===x.id?"primary":""}" onclick="aiGenConf.situ='${x.id}';openAiGen('${tid}')">${esc(x.label)}</button>`).join("")}
    </div>
    <input type="text" id="aiFree" value="${esc(C.free)}" placeholder="場面を指定する（任意。例：レストラン、面接、引っ越し）" style="margin-top:8px" oninput="aiGenConf.free=this.value" autocorrect="off" autocapitalize="off" spellcheck="false">
    <h2>形式</h2><div class="actions" style="margin-top:0">
      ${AI_FORM.map(x=>`<button class="btn ${C.form===x.id?"primary":""}" onclick="aiGenConf.form='${x.id}';openAiGen('${tid}')">${esc(x.label)}</button>`).join("")}
    </div>
    <div class="small muted" style="margin-top:6px">内訳：4択 ${cnt.mcq||0}・穴埋め ${cnt.fill_blank||0}・作文 ${cnt.production||0}</div>
    <div class="actions"><button class="btn primary" onclick="showAiPrompt('${tid}')">プロンプトを作る</button></div>
    <div id="aiPromptBox"></div>
  </div>
  <div class="card">
    <h2>AIの答えを貼り付ける</h2>
    <textarea id="aiResponse" placeholder="AIの返答をここに貼り付け" style="min-height:140px" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
    <div class="actions"><button class="btn primary" onclick="importAiItems('${tid}')">取り込む</button></div>
    <div id="aiImportMsg"></div>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
// 同梱問題をAI向けの出力形式に直す（お手本として見せる用）
function aiSeedExample(item){
  if(item.type === "mcq") return {type:"mcq", situation:"", prompt_fr:item.prompt_fr, prompt_jp:item.prompt_jp, choices:item.choices, correct_answer:item.correct_answer, explanations:item.explanations};
  if(item.type === "fill_blank") return {type:"fill_blank", situation:"", prompt_fr:item.prompt_fr, prompt_jp:item.prompt_jp, correct_answer:item.correct_answer, accepted_answers:item.accepted_answers||[item.correct_answer], explanation_jp:(item.explanations||{})[item.correct_answer]||""};
  return {type:"production", situation:"", prompt_jp:item.prompt_jp, target_structure:item.target_structure||"", model_answer:item.model_answer, accepted_answers:item.accepted_answers||[item.model_answer], check_points:item.check_points||[], explanation_jp:item.explanation_jp||""};
}
function buildAiPrompt(tid){
  const t = DATA.topics.find(x=>x.id===tid);
  const C = aiGenConf;
  const cnt = aiFormCounts(C.n, C.form);
  const situ = AI_SITU.find(x=>x.id===C.situ) || AI_SITU[0];
  const base = DATA.items.filter(i=>i.topic_id===tid);
  const seeds = ["mcq","fill_blank","production"].map(ty=>base.find(i=>i.type===ty)).filter(Boolean).map(aiSeedExample);
  const existing = base.concat(aiItemsOf(tid)).map(i=>i.prompt_fr || i.prompt_jp).filter(Boolean).slice(0, 80);
  const L = [];
  L.push("あなたは日本語話者にフランス語を教える経験豊富な教師です。次の文法トピックについて、練習問題を作ってください。");
  L.push("");
  L.push("# 文法トピック");
  L.push(`- トピック：${t.name_jp}（${t.name_fr}）`);
  L.push(`- レベル：CEFR ${t.level}`);
  L.push("- 学習者が読んでいる解説：");
  L.push(t.explanation_jp);
  L.push("");
  L.push("# 例文のシチュエーション");
  L.push(`- ${situ.desc}。`);
  if((C.free||"").trim()) L.push(`- 特に「${C.free.trim()}」の場面を中心にする。`);
  L.push("- 特定の業界（製造業、設備保全など）の専門的な場面に偏らせない。");
  L.push("- 各問題の situation に、その問題の場面を日本語で短く書く（例：レストラン、社内会議）。");
  L.push("");
  L.push("# 問題数と形式");
  L.push(`- 4択（mcq）：${cnt.mcq||0}問 / 穴埋め（fill_blank）：${cnt.fill_blank||0}問 / 作文（production）：${cnt.production||0}問`);
  L.push("- 質を保てない場合は数を減らしてよい。3問未満しか作れない場合は {\"status\":\"quality_error\",\"reason\":\"理由\"} だけを返す。");
  L.push("");
  L.push("# 形式ごとのルール");
  L.push("mcq：");
  L.push("- prompt_fr に空欄 ___（アンダースコア3つ）を1つだけ入れる。prompt_jp は文全体の自然な日本語訳。");
  L.push("- choices は4つ。重複させない。correct_answer は choices のどれか1つと完全に同じ文字列にする。");
  L.push("- 正解は文法的に1つだけに決まるようにする。別の選択肢でも文として成り立つ問題は作らない。");
  L.push("- 誤答は、学習者が実際に間違えやすい形にする（性数一致の誤り、別の時制や法、似た前置詞や代名詞など）。明らかに的外れな選択肢は入れない。");
  L.push("- explanations は選択肢の文字列をキーにして、4つすべてに日本語で1文ずつ、なぜ正しいか・なぜ誤りかを書く。");
  L.push("fill_blank：");
  L.push("- prompt_fr に ___ を1つだけ入れる。prompt_jp は日本語訳と、必要なら入れる語のヒント（例：「（venir を接続法に）」）。");
  L.push("- correct_answer は1語か短い語句。accepted_answers に正解として認める表記をすべて入れる（大文字小文字は区別しない）。");
  L.push("- explanation_jp に日本語の解説を1〜2文。");
  L.push("production：");
  L.push("- prompt_jp は学習者がフランス語に訳す日本語の文。target_structure は使うべき構文を短く。");
  L.push("- model_answer は模範解答。accepted_answers は正解として認める別解を2〜3個（語順や語彙の自然な言い換え）。");
  L.push("- check_points は答え合わせで確認する点を2〜3個。explanation_jp に日本語の解説を1〜2文。");
  L.push("共通：");
  L.push("- フランス語は自然で正しい、実際に使われる言い方にする。そのトピックの文法事項を実際に問う問題にする。");
  L.push("- 問題どうしで同じ文や同じ語彙を使い回さない。下の既存の問題と同じ文は作らない。");
  L.push("- くだけた言い方や俗語は使わない。");
  L.push("");
  L.push("# 既存の問題（これらと重複させない）");
  existing.forEach(x=>L.push("- " + x));
  L.push("");
  L.push("# お手本（形式の見本。内容はまねしない）");
  L.push(JSON.stringify(seeds, null, 1));
  L.push("");
  L.push("# 出力前の自己点検");
  L.push("出力する前に、1問ずつ次を確認し、問題があれば直すか削除する：正解が1つに決まるか／誤答が不自然すぎないか／空欄 ___ が1つか／correct_answer が choices に含まれるか／日本語訳が合っているか／シチュエーションの指定を守っているか。");
  L.push("");
  L.push("# 出力形式");
  L.push("JSONだけを出力する。前置きや説明は書かない。");
  L.push(`{"status":"ok","schema":"fr-grammar-items-v1","topic_id":"${tid}","items":[ 問題, 問題, … ]}`);
  return L.join("\n");
}
function showAiPrompt(tid){
  try{
    const txt = buildAiPrompt(tid);
    document.getElementById("aiPromptBox").innerHTML = `<pre class="copybox" id="aiPtxt" style="max-height:220px;overflow:auto">${esc(txt)}</pre>
      <div class="actions"><button class="btn primary" onclick="copyText(document.getElementById('aiPtxt').textContent, this)">プロンプトをコピー</button></div>`;
  }catch(e){ showErrorBanner("プロンプト作成でエラー： " + e.message); }
}
function aiNorm(s){ return String(s||"").replace(/[’ʼ`´]/g,"'").replace(/\s+/g," ").trim().toLowerCase(); }
function aiFixBlank(s){ return String(s||"").replace(/_{3,}/g,"___"); }
// 1問を検証して、アプリの問題形式に直す。問題があれば {error} を返す。
function aiValidateItem(raw){
  if(!raw || typeof raw !== "object") return {error:"問題の形になっていない"};
  const type = raw.type;
  const str = v => typeof v === "string" && v.trim() !== "";
  if(type === "mcq"){
    const pf = aiFixBlank(raw.prompt_fr);
    if(!str(pf)) return {error:"prompt_fr がない"};
    if((pf.match(/___/g)||[]).length !== 1) return {error:"空欄 ___ が1つではない"};
    if(!str(raw.prompt_jp)) return {error:"prompt_jp がない"};
    const ch = Array.isArray(raw.choices) ? raw.choices.map(c=>String(c||"").trim()).filter(Boolean) : [];
    if(ch.length < 3 || ch.length > 5) return {error:"選択肢が3〜5個ではない"};
    if(new Set(ch.map(aiNorm)).size !== ch.length) return {error:"選択肢が重複している"};
    const ca = String(raw.correct_answer||"").trim();
    if(!ch.includes(ca)) return {error:"正解が選択肢に含まれていない"};
    let ex = raw.explanations;
    if(Array.isArray(ex)){ const o = {}; ch.forEach((c,i)=>o[c]=String(ex[i]||"")); ex = o; }
    if(!ex || typeof ex !== "object") ex = {};
    const exps = {}; ch.forEach(c=>exps[c] = String(ex[c]||""));
    if(!exps[ca]) return {error:"正解の解説がない"};
    return {item:{type:"mcq", prompt_fr:pf.trim(), prompt_jp:raw.prompt_jp.trim(), choices:shuffle(ch), correct_answer:ca, explanations:exps}};
  }
  if(type === "fill_blank"){
    const pf = aiFixBlank(raw.prompt_fr);
    if(!str(pf)) return {error:"prompt_fr がない"};
    if((pf.match(/___/g)||[]).length !== 1) return {error:"空欄 ___ が1つではない"};
    if(!str(raw.prompt_jp)) return {error:"prompt_jp がない"};
    const ca = String(raw.correct_answer||"").trim();
    if(!ca) return {error:"正解がない"};
    let acc = Array.isArray(raw.accepted_answers) ? raw.accepted_answers.map(a=>String(a||"").trim()).filter(Boolean) : [];
    if(!acc.some(a=>aiNorm(a)===aiNorm(ca))) acc.unshift(ca);
    return {item:{type:"fill_blank", prompt_fr:pf.trim(), prompt_jp:raw.prompt_jp.trim(), choices:[], correct_answer:ca, accepted_answers:acc, explanations:{[ca]: String(raw.explanation_jp||"")}}};
  }
  if(type === "production"){
    if(!str(raw.prompt_jp)) return {error:"prompt_jp がない"};
    if(!str(raw.model_answer)) return {error:"model_answer がない"};
    const ma = raw.model_answer.trim();
    let acc = Array.isArray(raw.accepted_answers) ? raw.accepted_answers.map(a=>String(a||"").trim()).filter(Boolean) : [];
    acc = [ma].concat(acc.filter(a=>aiNorm(a)!==aiNorm(ma)));
    const cp = Array.isArray(raw.check_points) ? raw.check_points.map(x=>String(x||"").trim()).filter(Boolean) : [];
    return {item:{type:"production", prompt_jp:raw.prompt_jp.trim(), target_structure:String(raw.target_structure||"").trim(), model_answer:ma, accepted_answers:acc, check_points:cp, explanation_jp:String(raw.explanation_jp||"").trim()}};
  }
  return {error:`形式（type）が不明：${esc(String(type||"なし"))}`};
}
function importAiItems(tid){
  const msg = document.getElementById("aiImportMsg");
  const fail = t => { msg.innerHTML = `<p class="small" style="color:var(--bad)">${t}</p>`; };
  try{
    const raw = document.getElementById("aiResponse").value || "";
    if(!raw.trim()) return fail("AIの返答が貼り付けられていない。");
    let data = null, jsonText = extractJsonFromText(raw);
    const tryParse = s => { try{ return JSON.parse(s); }catch(e){ return null; } };
    if(jsonText) data = tryParse(jsonText);
    if(!data){ // スマホのスマート引用符で JSON の引用符が化けている場合の救済
      const j2 = extractJsonFromText(unsmartenQuotes(raw));
      if(j2) data = tryParse(j2);
    }
    if(!data) return fail("JSONとして読み取れなかった。AIの返答をそのまま全部貼り付けているか確認して。");
    if(data.status === "quality_error") return fail("AIが「質を保てない」と返した：" + esc(data.reason||"理由の記載なし") + "。問題数を減らすか、別のAIで試して。");
    if(data.status && data.status !== "ok") return fail("AIの返答がエラーだった：" + esc(data.reason||data.status));
    if(data.topic_id && data.topic_id !== tid) return fail(`別のトピック（${esc(data.topic_id)}）用の返答になっている。このトピックのプロンプトで作り直して。`);
    if(!Array.isArray(data.items) || !data.items.length) return fail("items（問題の一覧）が見つからない。");
    const seen = new Set(DATA.items.filter(i=>i.topic_id===tid).concat(aiItemsOf(tid)).map(i=>aiNorm(i.prompt_fr || i.prompt_jp)));
    const ok = [], ng = [];
    const stamp = Date.now().toString(36), C = aiGenConf;
    const situLabel = ((AI_SITU.find(x=>x.id===C.situ)||{}).label || "") + ((C.free||"").trim() ? "・" + C.free.trim() : "");
    data.items.forEach((r,k)=>{
      const v = aiValidateItem(r);
      if(v.error){ ng.push(`${k+1}問目：${v.error}`); return; }
      const key = aiNorm(v.item.prompt_fr || v.item.prompt_jp);
      if(seen.has(key)){ ng.push(`${k+1}問目：既存の問題と同じ文`); return; }
      seen.add(key);
      const id = `ai_${tid}_${stamp}_${k}`;
      ok.push(Object.assign({id, topic_id:tid, ai:true, createdAt:Date.now(), situation:String((r&&r.situation)||"").trim(), aiSitu:situLabel}, v.item));
    });
    if(!ok.length) return fail("取り込める問題がなかった。<br>" + ng.map(esc).join("<br>"));
    ok.forEach(it=>{ state.aiItems[it.id] = it; });
    save();
    document.getElementById("aiResponse").value = "";
    msg.innerHTML = `<p class="small"><b>${ok.length}問を取り込んだ。</b>このトピックのドリルと bilan に混ざる。</p>
      ${ng.length ? `<p class="small muted">取り込めなかった ${ng.length}問：<br>${ng.map(esc).join("<br>")}</p>` : ""}
      <div class="actions"><button class="btn primary" onclick="startDrill('${tid}',10)">ドリルを始める</button>
      <button class="btn" onclick="openAiItems('${tid}')">取り込んだ問題を見る</button></div>`;
  }catch(e){ showErrorBanner("AI生成問題の取り込みでエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openAiItems(tid){
  try{ openAiItemsInner(tid); }
  catch(e){ showErrorBanner("AI生成問題の一覧でエラー： " + e.message); }
}
function openAiItemsInner(tid){
  const t = DATA.topics.find(x=>x.id===tid); if(!t) return;
  titleEl.textContent = "AI生成の問題";
  setBack(()=>openTopic(tid), "トピック");
  const all = aiItemsOf(tid);
  const TY = {mcq:"4択", fill_blank:"穴埋め", production:"作文"};
  let h = `<div class="card"><div class="small muted">${esc(t.name_jp)}</div>
    <div class="small" style="margin-top:4px">${all.length}問。「外す」にすると出題されなくなる（あとで戻せる）。</div>
    ${all.length ? `<div class="actions"><button class="btn small" onclick="deleteAllAiItems('${tid}')">このトピックのAI生成問題をすべて削除</button></div>` : ""}
  </div>`;
  all.forEach(it=>{
    const bad = !!(state.aiBad||{})[it.id];
    const q = it.prompt_fr || it.prompt_jp;
    const a = it.type === "production" ? it.model_answer : it.correct_answer;
    h += `<div class="card" style="padding:12px 14px;${bad?"opacity:.55":""}">
      <div class="spread"><span><span class="pill">${TY[it.type]||it.type}</span>${it.situation?`<span class="pill">${esc(it.situation)}</span>`:""}${bad?`<span class="pill">外した</span>`:""}</span></div>
      <div style="margin:6px 0 2px">${esc(q)}</div>
      <div class="small muted">正解：${esc(a||"")}</div>
      <div class="actions" style="margin-top:6px">
        <button class="btn small" onclick="toggleAiBadFromList('${tid}','${it.id}')">${bad?"出題に戻す":"外す"}</button>
        <button class="btn small" onclick="deleteAiItem('${tid}','${it.id}')">削除</button>
      </div>
    </div>`;
  });
  el.innerHTML = h;
}
function toggleAiBadFromList(tid, id){
  if(state.aiBad[id]) delete state.aiBad[id]; else state.aiBad[id] = Date.now();
  save(); const y = window.scrollY; openAiItems(tid); window.scrollTo(0,y);
}
function deleteAiItem(tid, id){
  if(!confirm("この問題を削除する？")) return;
  delete state.aiItems[id]; delete state.aiBad[id];
  save(); const y = window.scrollY; openAiItems(tid); window.scrollTo(0,y);
}
function deleteAllAiItems(tid){
  if(!confirm("このトピックのAI生成問題をすべて削除する？")) return;
  aiItemsOf(tid).forEach(it=>{ delete state.aiItems[it.id]; delete state.aiBad[it.id]; });
  save(); openTopic(tid);
}

/* ---------- セッション ---------- */
function startDrill(tid, n, src){
  const items = pickDrill(tid, Math.min(n, drillPool(tid, src).length), src);
  if(!items.length){ alert("出題できる問題がない。"); return; }
  session = {items, idx:0, results:[], mode:"drill", topicId:tid, requeued:[], requeuedOnce:{}};
  renderQuestion();
}
function startBilan(n){
  const items = pickBilan(n);
  session = {items, idx:0, results:[], mode:"bilan", requeued:[], requeuedOnce:{}};
  renderQuestion();
}
function renderQuestion(){
  if(!session) return renderHome();
  if(session.idx >= session.items.length){
    if(session.requeued.length){          // 間違えた問題をセッション末尾で再出題
      session.items = session.items.concat(session.requeued);
      session.requeued = [];
    } else return renderResult();
  }
  const item = session.items[session.idx];
  const t = DATA.topics.find(x=>x.id===item.topic_id) || {};
  titleEl.textContent = session.mode==="bilan" ? "bilan" : (t.name_jp||"ドリル");
  setBack(()=>{ if(confirm("セッションを中断してホームに戻る？")) renderHome(); }, "中断");

  const pct = Math.round(session.idx / session.items.length * 100);
  let h = `<div class="bar-progress"><div style="width:${pct}%"></div></div>`;
  h += `<div class="card">`;
  h += `<div class="small muted" style="margin-bottom:6px">${session.idx+1} / ${session.items.length}`;
  if(session.mode==="drill") h += ` ・ ${esc(t.name_jp||"")}`;
  if(item.ai) h += ` <span class="pill" style="margin-left:6px">AI生成</span>`;
  h += `</div>`;

  if(item.type==="production"){
    h += `<div class="prompt-jp" style="font-size:17px;color:var(--fg);margin-bottom:4px">${esc(item.prompt_jp)}</div>`;
    h += `<div class="small muted" style="margin-bottom:10px">フランス語で書いてみる${item.target_structure?`（${esc(item.target_structure)}）`:""}</div>`;
    h += `<div class="actions" style="margin-bottom:10px;justify-content:flex-start">
      <button type="button" class="btn small ${item._uiMode!=='bank'?'primary':''}" onclick="exitBankMode()">自由記入</button>
      <button type="button" class="btn small ${item._uiMode==='bank'?'primary':''}" onclick="enterBankMode()">語群から選ぶ</button>
    </div>`;
    if(item._uiMode==="bank" && bankState){
      h += renderBankUI();
    } else {
      h += `<textarea id="ans" placeholder="ここにフランス語で入力" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>`;
      h += accentBarHtml();
      const hintWords = productionHint(item);
      if(hintWords){
        h += `<button type="button" class="btn small" style="margin-top:8px" onclick="this.nextElementSibling.style.display='block';this.style.display='none'">ヒント（書き出し）</button>
        <div class="small muted" style="display:none;margin-top:6px">「${esc(hintWords)}…」から始めてみる</div>`;
      }
      h += `<div class="actions"><button class="btn primary" onclick="submitText()">答え合わせ</button></div>`;
    }
  } else if(item.type==="transform"){
    h += `<div class="prompt-fr">${wrapTapWords(item.prompt_fr)}</div>`;
    h += `<div class="prompt-jp">${esc(item.prompt_jp||"")}</div>`;
    h += `<textarea id="ans" placeholder="1文にまとめて入力" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>`;
    h += accentBarHtml();
    h += `<div class="actions"><button class="btn primary" onclick="submitText()">答え合わせ</button></div>`;
  } else if(item.type==="fill_blank"){
    h += `<div class="prompt-fr">${wrapTapWords(item.prompt_fr).replace("___",'<span class="blank"></span>')}</div>`;
    h += `<div class="prompt-jp">${esc(item.prompt_jp||"")}</div>`;
    h += `<input type="text" id="ans" placeholder="空欄に入る語" autocapitalize="off" autocorrect="off" spellcheck="false">`;
    h += accentBarHtml();
    h += `<div class="actions"><button class="btn primary" onclick="submitText()">答え合わせ</button></div>`;
  } else {
    h += `<div class="prompt-fr">${wrapTapWords(item.prompt_fr).replace("___",'<span class="blank"></span>')}</div>`;
    h += `<div class="prompt-jp">${esc(item.prompt_jp||"")}</div>`;
    h += `<div class="choices">`;
    item.choices.forEach((c,i)=>{
      h += `<button class="choice" data-i="${i}" onclick="submitChoice(${i})"><span class="choice-n">${i+1}</span>${esc(c)}</button>`;
    });
    h += `</div>`;
  }
  h += `<div id="fb"></div></div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
  const a = document.getElementById("ans");
  if(a){
    a.focus();
    a.addEventListener("keydown", ev=>{
      if(ev.key==="Enter" && (item.type==="fill_blank" || ev.metaKey || ev.ctrlKey)){ ev.preventDefault(); submitText(); }
    });
  }
  mcqChoiceHandler = submitChoice;
  document.onkeydown = mcqKeyHandler;
}
// mcq（選択式）の問題で1〜9キーでも選べるようにする（PCでの周回を速くする要望）。
// document.onkeydownへの代入は毎回上書きなのでリスナーが積み上がる心配はない。
// 呼ばれるたびにDOM上に.choices .choice[data-i=...]があるかで判定するので、
// production/fill_blank画面やホーム等、別の画面に移っていれば自然に何もしない
// （明示的な後片付けが要らない）。テキスト入力にフォーカス中も何もしない。
// mcqの画面（文法ドリル・読解モード・保存済み読解問題の復習）それぞれで、1〜9キーを
// 押したときに呼ぶ関数を差し替えられるようにする（デフォルトは文法ドリルのsubmitChoice）。
let mcqChoiceHandler = submitChoice;
function mcqKeyHandler(ev){
  const tag = document.activeElement && document.activeElement.tagName;
  if(tag === "INPUT" || tag === "TEXTAREA") return;
  const n = parseInt(ev.key, 10);
  if(!n) return;
  const btn = document.querySelector(`.choices .choice[data-i="${n-1}"]`);
  if(!btn || btn.disabled) return;
  ev.preventDefault();
  mcqChoiceHandler(n-1);
}

/* ---------- アクセント入力ボタン（記述式全般） ---------- */
function accentBarHtml(){
  const chars = ["é","è","à","ù","ç","œ","ô","î","â","ê","ë","ï","û"];
  return `<div class="actions" style="margin-top:6px;flex-wrap:wrap">` +
    chars.map(c=>`<button type="button" class="btn small" onclick="insertAccent('${c}')">${c}</button>`).join("") +
    `</div>`;
}
function insertAccent(ch){
  const a = document.getElementById("ans");
  if(!a) return;
  const start = (a.selectionStart!=null) ? a.selectionStart : a.value.length;
  const end = (a.selectionEnd!=null) ? a.selectionEnd : a.value.length;
  a.value = a.value.slice(0,start) + ch + a.value.slice(end);
  const pos = start + ch.length;
  a.focus();
  if(a.setSelectionRange) a.setSelectionRange(pos,pos);
}

/* ---------- 記述式ヒント（書き出し語のみ提示。新規データ不要、模範解答から自動生成） ---------- */
function productionHint(item){
  const ans = (item.accepted_answers && item.accepted_answers[0]) || item.model_answer || "";
  const words = ans.trim().split(/\s+/).slice(0,2).join(" ");
  return words;
}

/* ---------- 記述式：語群選択（Duolingo風）モード。model_answerから自動生成、新規データ不要 ---------- */
let bankState = null;
function tokenizeAnswer(ans){ return (ans||"").trim().split(/\s+/).filter(Boolean); }
const BANK_DISTRACTOR_POOL = ["de","le","la","les","un","une","et","mais","très","pour","avec","ne","pas","en","au","du","ce","que","qui","plus"];
function pickBankDistractors(tokens, n){
  const norm = tokens.map(t=>t.toLowerCase().replace(/[.,!?;:'’]/g,""));
  const candidates = BANK_DISTRACTOR_POOL.filter(w=>!norm.includes(w));
  return shuffle(candidates).slice(0, n);
}
function enterBankMode(){
  const item = session.items[session.idx];
  if(item.type!=="production") return;
  item._uiMode = "bank";
  const ans = (item.accepted_answers && item.accepted_answers[0]) || item.model_answer || "";
  const tokens = tokenizeAnswer(ans);
  const distractors = pickBankDistractors(tokens, 2);
  bankState = { pool: shuffle(tokens.concat(distractors)).map((w,i)=>({w,i,used:false})), used: [] };
  renderQuestion();
}
function exitBankMode(){
  const item = session.items[session.idx];
  item._uiMode = "free";
  bankState = null;
  renderQuestion();
}
function renderBankUI(){
  let h = `<div class="small muted" style="margin-bottom:4px">タップかドラッグで文を組み立てる。並べた語はドラッグで順番を入れ替えられる。</div>`;
  h += `<div class="bank-area" id="bankAns">`;
  if(!bankState.used.length) h += `<span class="bank-empty">ここに語を並べる</span>`;
  bankState.used.forEach((t,idx)=>{
    h += `<button type="button" class="btn small bank-chip" data-src="used" data-idx="${idx}"
      onpointerdown="bankPointerDown(event,'used',${idx})" onclick="bankTapUsed(${idx})" title="タップで外す・ドラッグで移動">${esc(t.w)}</button>`;
  });
  h += `</div>`;
  h += `<div class="bank-pool" id="bankPool">`;
  bankState.pool.filter(t=>!t.used).forEach(t=>{
    h += `<button type="button" class="btn small bank-chip" data-src="pool" data-i="${t.i}"
      onpointerdown="bankPointerDown(event,'pool',${t.i})" onclick="bankTapPool(${t.i})">${esc(t.w)}</button>`;
  });
  h += `</div>`;
  h += `<div class="actions"><button class="btn primary" onclick="bankSubmit()">答え合わせ</button></div>`;
  return h;
}
// click はキーボード操作（Enter/Space）用。指やマウスのタップは pointerup で直接処理し、
// そのあとに来る click は bankSuppressClick で無視する（タッチ後に click が来ない端末があるため）。
function bankTapPool(i){
  if(bankSuppressClick) return;
  bankDoTapPool(i);
}
function bankDoTapPool(i){
  const tok = bankState.pool.find(t=>t.i===i && !t.used);
  if(!tok) return;
  tok.used = true;
  bankState.used.push(tok);
  renderQuestion();
}
function bankTapUsed(idx){
  if(bankSuppressClick) return;
  bankDoTapUsed(idx);
}
function bankDoTapUsed(idx){
  const tok = bankState.used[idx];
  if(!tok) return;
  bankState.used.splice(idx,1);
  tok.used = false;
  renderQuestion();
}
/* ドラッグ&ドロップ（Pointer Events。マウス・指・ペンを同じ処理で扱う）。
   ・少し動かすまではタップ扱い（6px 未満ならドラッグを始めない）
   ・ドラッグ中は語の複製（ghost）が指に付いてくる。並べる欄の上では差し込み位置に縦線を出す
   ・並べる欄に落とす → その位置に差し込む（語群からでも、並べた語の並べ替えでも）
   ・語群の欄に落とす → 並べた語を語群に戻す
   ・それ以外に落とす → 何もしない
   チップ自体は touch-action:none なので、チップの上から始めた指の動きはスクロールにならない。 */
let bankDrag = null, bankSuppressClick = false, _bankSuppressTimer = null;
function bankSuppressNextClick(){
  bankSuppressClick = true;
  clearTimeout(_bankSuppressTimer);
  _bankSuppressTimer = setTimeout(()=>{ bankSuppressClick = false; }, 400);
}
function bankPointerDown(ev, src, key){
  if(ev.button !== undefined && ev.button !== 0) return;
  const chip = ev.currentTarget;
  bankDrag = {src, key, chip, x0:ev.clientX, y0:ev.clientY, pid:ev.pointerId, started:false, ghost:null, caret:null, target:null, insertAt:null};
  try{ chip.setPointerCapture(ev.pointerId); }catch(e){}
  window.addEventListener("pointermove", bankPointerMove, {passive:false});
  window.addEventListener("pointerup", bankPointerUp);
  window.addEventListener("pointercancel", bankPointerCancel);
}
function bankPointerMove(ev){
  const D = bankDrag; if(!D || ev.pointerId !== D.pid) return;
  if(!D.started){
    if(Math.hypot(ev.clientX - D.x0, ev.clientY - D.y0) < 6) return;
    D.started = true;
    const g = D.chip.cloneNode(true);
    g.classList.add("bank-ghost"); g.removeAttribute("onclick"); g.removeAttribute("onpointerdown");
    document.body.appendChild(g);
    D.ghost = g;
    D.chip.classList.add("dragging");
  }
  ev.preventDefault();
  D.ghost.style.left = ev.clientX + "px";
  D.ghost.style.top = ev.clientY + "px";
  const ans = document.getElementById("bankAns"), pool = document.getElementById("bankPool");
  const inside = (elm)=>{ if(!elm) return false; const r = elm.getBoundingClientRect(); return ev.clientX>=r.left && ev.clientX<=r.right && ev.clientY>=r.top-8 && ev.clientY<=r.bottom+8; };
  ans && ans.classList.remove("over"); pool && pool.classList.remove("over");
  if(D.caret){ D.caret.remove(); D.caret = null; }
  if(inside(ans)){
    ans.classList.add("over");
    D.target = "ans";
    // 差し込み位置：並べた語（自分自身は除く）を順に見て、指より右・下にある最初の語の前
    const chips = [...ans.querySelectorAll(".bank-chip")].filter(c=>c !== D.chip);
    let at = chips.length;
    for(let k=0;k<chips.length;k++){
      const r = chips[k].getBoundingClientRect();
      if(ev.clientY < r.top) { at = k; break; }
      if(ev.clientY <= r.bottom && ev.clientX < r.left + r.width/2){ at = k; break; }
    }
    D.insertAt = at;
    const caret = document.createElement("span"); caret.className = "bank-caret";
    if(at < chips.length) ans.insertBefore(caret, chips[at]); else ans.appendChild(caret);
    const empty = ans.querySelector(".bank-empty"); if(empty) empty.style.display = "none";
    D.caret = caret;
  } else if(inside(pool) && D.src === "used"){
    pool.classList.add("over");
    D.target = "pool";
  } else {
    D.target = null;
  }
}
function bankEndDrag(){
  window.removeEventListener("pointermove", bankPointerMove);
  window.removeEventListener("pointerup", bankPointerUp);
  window.removeEventListener("pointercancel", bankPointerCancel);
  const D = bankDrag; bankDrag = null;
  if(D){
    if(D.ghost) D.ghost.remove();
    if(D.caret) D.caret.remove();
    if(D.chip) D.chip.classList.remove("dragging");
    const ans = document.getElementById("bankAns"), pool = document.getElementById("bankPool");
    ans && ans.classList.remove("over"); pool && pool.classList.remove("over");
  }
  return D;
}
function bankPointerCancel(){ bankEndDrag(); }
function bankPointerUp(ev){
  try{
    const D = bankEndDrag();
    if(!D) return;
    bankSuppressNextClick();           // このあと来るかもしれない click は無視する
    if(!D.started){                    // 動かしていない＝タップ
      if(D.src === "pool") bankDoTapPool(D.key); else bankDoTapUsed(D.key);
      return;
    }
    if(D.target === "ans"){
      let tok;
      if(D.src === "pool"){
        tok = bankState.pool.find(t=>t.i===D.key && !t.used);
        if(!tok) return;
        tok.used = true;
      } else {
        tok = bankState.used[D.key];
        if(!tok) return;
        bankState.used.splice(D.key, 1);
      }
      const at = Math.max(0, Math.min(D.insertAt == null ? bankState.used.length : D.insertAt, bankState.used.length));
      bankState.used.splice(at, 0, tok);
      renderQuestion();
    } else if(D.target === "pool" && D.src === "used"){
      const tok = bankState.used[D.key];
      if(!tok) return;
      bankState.used.splice(D.key, 1);
      tok.used = false;
      renderQuestion();
    }
  }catch(e){ showErrorBanner("語群のドラッグ処理でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function bankSubmit(){
  const item = session.items[session.idx];
  const val = bankState.used.map(t=>t.w).join(" ");
  if(!val.trim()) return;
  document.querySelectorAll(".actions .btn").forEach(b=>b.disabled=true);
  const auto = matches(val, item);
  if(auto){ finish(item, true, val, renderProductionFeedback(item, val, true)); }
  else{ renderSelfGrade(item, val); }
}

function submitChoice(i){
  const item = session.items[session.idx];
  const chosen = item.choices[i];
  const correct = chosen === item.correct_answer;
  document.querySelectorAll(".choice").forEach(btn=>{
    btn.disabled = true;
    const c = item.choices[+btn.dataset.i];
    if(c===item.correct_answer) btn.classList.add("ok");
    else if(c===chosen) btn.classList.add("ng");
  });
  finish(item, correct, chosen, renderChoiceFeedback(item, chosen, correct));
}
function renderChoiceFeedback(item, chosen, correct){
  const t = DATA.topics.find(x=>x.id===item.topic_id)||{};
  let h = `<div class="fb ${correct?"ok":"ng"}">`;
  h += `<b>${correct?"正解":"不正解"}</b>`;
  if(session.mode==="bilan") h += ` <span class="pill" style="margin-left:8px">${esc(t.name_jp||"")}</span>`;
  if(!correct){
    h += `<div class="exp"><b>${wrapTapWords(chosen)}</b> — ${esc(item.explanations[chosen]||"")}</div>`;
  }
  h += `<div class="exp"><b>${wrapTapWords(item.correct_answer)}</b> — ${esc(item.explanations[item.correct_answer]||"")}</div>`;
  h += `</div>`;
  return h;
}

function submitText(){
  const item = session.items[session.idx];
  const input = document.getElementById("ans");
  const val = input ? input.value : "";
  if(!val.trim()){ input && input.focus(); return; }
  if(input) input.disabled = true;
  document.querySelectorAll(".actions .btn").forEach(b=>b.disabled=true);

  if(item.type==="production"){
    const auto = matches(val, item);
    if(auto){ finish(item, true, val, renderProductionFeedback(item, val, true)); }
    else{ renderSelfGrade(item, val); }   // 自動一致しなければ自己採点へ
  }else{
    const ok = matches(val, item);
    finish(item, ok, val, renderTextFeedback(item, val, ok));
  }
}
function renderTextFeedback(item, val, ok){
  const t = DATA.topics.find(x=>x.id===item.topic_id)||{};
  let h = `<div class="fb ${ok?"ok":"ng"}"><b>${ok?"正解":"不正解"}</b>`;
  if(session.mode==="bilan") h += ` <span class="pill" style="margin-left:8px">${esc(t.name_jp||"")}</span>`;
  if(!ok) h += `<div class="yourans">あなたの答案: ${esc(val)}</div>`;
  h += `<div class="model">正解: <b>${wrapTapWords(item.correct_answer)}</b></div>`;
  const exp = item.explanations ? (item.explanations[item.correct_answer] || Object.values(item.explanations)[0]) : "";
  if(exp) h += `<div class="exp">${esc(exp)}</div>`;
  h += `</div>`;
  return h;
}
function renderProductionFeedback(item, val, auto){
  let h = `<div class="fb ok"><b>正解</b>${auto?` <span class="pill" style="margin-left:8px">模範解答と一致</span>`:""}`;
  h += `<div class="exp">${esc(item.explanation_jp||"")}</div></div>`;
  return h;
}
// 記述の自己採点画面
function renderSelfGrade(item, val){
  const t = DATA.topics.find(x=>x.id===item.topic_id)||{};
  let h = `<div class="fb neutral">`;
  h += `<b>自己採点</b>`;
  if(session.mode==="bilan") h += ` <span class="pill" style="margin-left:8px">${esc(t.name_jp||"")}</span>`;
  h += `<div class="yourans">あなたの答案: ${esc(val)}</div>`;
  h += `<div class="model">模範解答: <b>${wrapTapWords(item.model_answer)}</b></div>`;
  if((item.accepted_answers||[]).length>1){
    h += `<div class="small muted">別解: ${item.accepted_answers.slice(1).map(esc).join(" / ")}</div>`;
  }
  h += `<div class="exp"><b>チェックポイント</b><ul>` +
       (item.check_points||[]).map(c=>`<li>${esc(c)}</li>`).join("") + `</ul></div>`;
  if(item.explanation_jp) h += `<div class="exp">${esc(item.explanation_jp)}</div>`;
  h += `<div class="selfgrade">
      <button class="btn primary" onclick="selfGrade(true)">書けていた</button>
      <button class="btn" onclick="selfGrade(false)">書けていなかった</button>
    </div>`;
  h += `<div class="actions"><button class="btn small" onclick="showPrompt()">この答案をAIに見てもらう</button></div>`;
  h += `<div id="promptBox"></div>`;
  h += `</div>`;
  document.getElementById("fb").innerHTML = h;
  session.pendingAnswer = val;
}
function selfGrade(ok){
  const item = session.items[session.idx];
  const val = session.pendingAnswer || "";
  document.querySelectorAll(".selfgrade .btn").forEach(b=>b.disabled=true);
  finish(item, ok, val, null, true);
}
function showPrompt(){
  const item = session.items[session.idx];
  const txt = buildPrompt(item, session.pendingAnswer||"");
  const box = document.getElementById("promptBox");
  box.innerHTML = `<pre class="copybox" id="ptxt">${esc(txt)}</pre>
    <div class="actions"><button class="btn small" onclick="copyText(document.getElementById('ptxt').textContent, this)">プロンプトをコピー</button></div>`;
}

// 共通の解答確定処理
function finish(item, correct, answer, feedbackHtml, keepFeedback){
  recordAnswer(item, correct);
  session.results.push({item, correct, answer});
  // 間違えた問題はセッション内で1度だけ再出題する（何度も間違えても無限に続かないように）
  if(!correct && session.mode==="drill" && !session.requeuedOnce[item.id]){
    session.requeuedOnce[item.id] = true;
    session.requeued.push(item);
  }

  const fb = document.getElementById("fb");
  if(feedbackHtml) fb.innerHTML = feedbackHtml;
  const next = document.createElement("div");
  next.className = "actions";
  const isLast = (session.idx+1 >= session.items.length) && !session.requeued.length;
  next.innerHTML = `<button class="btn primary" id="nextBtn">${isLast?"結果を見る":"次へ"}</button>`;
  if(item.type==="production" && !keepFeedback){
    next.innerHTML += `<button class="btn small" onclick="showPromptFor('${item.id}')">この答案をAIに見てもらう</button>`;
  }
  if(item.ai){
    const bad = document.createElement("div");
    bad.className = "actions";
    bad.innerHTML = `<button class="btn small" onclick="markAiBad('${item.id}', this)">この問題はおかしい（出題から外す）</button>`;
    fb.appendChild(bad);
  }
  fb.appendChild(next);
  if(!document.getElementById("promptBox")){
    const pb = document.createElement("div"); pb.id="promptBox"; fb.appendChild(pb);
  }
  const btn = document.getElementById("nextBtn");
  btn.onclick = ()=>{ session.idx++; renderQuestion(); };
  btn.focus();
}
function showPromptFor(itemId){
  const item = findItem(itemId);
  const last = session.results[session.results.length-1];
  const txt = buildPrompt(item, last?last.answer:"");
  const box = document.getElementById("promptBox");
  box.innerHTML = `<pre class="copybox" id="ptxt">${esc(txt)}</pre>
    <div class="actions"><button class="btn small" onclick="copyText(document.getElementById('ptxt').textContent, this)">プロンプトをコピー</button></div>`;
}

/* ---------- 結果 ---------- */
function renderResult(){
  const r = session.results;
  const ok = r.filter(x=>x.correct).length;
  titleEl.textContent = "結果";
  setBack(null);
  let h = `<div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:600;font-variant-numeric:tabular-nums">${ok} / ${r.length}</div>
    <div class="muted small">正答率 ${r.length?Math.round(ok/r.length*100):0}%</div>
  </div>`;

  const byTopic = {};
  r.forEach(x=>{
    const tid = x.item.topic_id;
    if(!byTopic[tid]) byTopic[tid] = {ok:0,n:0};
    byTopic[tid].n++; if(x.correct) byTopic[tid].ok++;
  });
  h += `<div class="card"><h2>トピック別</h2><div class="chart">`;
  Object.keys(byTopic).forEach(tid=>{
    const t = DATA.topics.find(x=>x.id===tid)||{};
    const b = byTopic[tid]; const pct = b.ok/b.n;
    const cls = pct<0.6?"low":(pct<0.8?"mid":"");
    h += `<div class="chart-row"><div>
      <div class="chart-label">${esc(t.name_jp||tid)}</div>
      <div class="chart-track"><div class="chart-fill ${cls}" style="width:${Math.round(pct*100)}%"></div></div>
    </div><div class="chart-val">${b.ok}/${b.n}</div></div>`;
  });
  h += `</div></div>`;

  const wrong = r.filter(x=>!x.correct);
  if(wrong.length){
    h += `<div class="card"><h2>間違えた問題（${wrong.length}）</h2>`;
    wrong.forEach(x=>{
      const q = x.item.prompt_fr || x.item.prompt_jp;
      const a = x.item.model_answer || x.item.correct_answer;
      h += `<div class="ex"><div class="f">${esc(q)}</div>
        <div class="j">正解: ${esc(a)}</div></div>`;
    });
    h += `</div>`;
  }
  h += session && session.today
    ? `<div class="actions"><button class="btn primary" onclick="todayDone('grammar')">今日の10分：次へ</button><button class="btn" onclick="renderHome()">ホームへ</button></div>`
    : `<div class="actions"><button class="btn primary" onclick="renderHome()">ホームへ</button></div>`;
  el.innerHTML = h;
  session = null;
  window.scrollTo(0,0);
}

/* ---------- 進捗の書き出し・読み込み ----------
   端末をまたいで（iPadとデスクトップ等）別々に学習すると記録が分かれてしまうため、
   書き出したJSONを読み込むときは単純な上書きではなく「賢いマージ」を行う。
   上書きだと、今読み込む側の端末だけで進んだ分がインポートしたファイルの内容で
   消えてしまい、単語が「曖昧」なまま揃わない原因になる。
   レコードの種類によってマージ方法を変える：
   ・SRSの状態そのもの（due/interval/repsのひとかたまり）は分割できないので、
     lastAtが新しい方を丸ごと採用する（progress・vocabProgress）。
   ・純粋な累計カウンター（出題回数・正答数など：items・conjug.stats・log・
     vocabLog・vocabReviewLog）は「端末ごとの寄与」に分けて持つ（G-counter方式）。
     単純に足すと、同じファイルを読み込むたびに回数が倍々に増えてしまうため
     （10→20→30…、2026-09 レビューで判明）。各端末は devId を持ち、他端末から
     受け取った寄与を ctrByDev[端末id] に控えておく。自端末の寄与＝合計−他端末の控え。
     マージでは端末ごとに大きい方を採り、合計を作り直す。何度同じファイルを
     読み込んでも増えず、別端末で独立に学習した分だけが加わる。
   ・お気に入りは片方でONならON（論理和）。
   ・自由記述のメモ・自分用文面は、片方が空ならもう片方を採用。両方に違う内容が
     あれば、どちらも消さずに連結する。
   ・自作デッキ・保存した読解問題・自作文例はidで突き合わせ、無い方を追加する
     （idが衝突した場合はこの端末側を優先）。
   ・活用ドリルの出題時制・グループなどの「設定」は同期対象にせず、この端末の
     選択をそのまま残す。 */

/* ---------- 累計カウンターの端末別管理（G-counter） ----------
   増やす箇所（recordAnswer・gradeVocab・活用ドリル等）は従来どおり state の合計値を
   直接 ++ するだけでよい。端末別の内訳はマージ時にだけ計算する。 */
function newDevId(){ return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
// 端末idが無い＝この版より前の保存データ（または初回起動・リセット直後）。
// それまでの累計は、他端末から合算して取り込んだ分を含んでいる可能性があり
// どの端末の寄与か分けられないので、共通の擬似端末 "legacy" の分として控える。
// "legacy" 同士は端末別の max で突き合わせるため、旧版で両端末に同じ回数が
// 入っていても二重には数えない（旧版どうしで独立に学習した分が同じ日・同じ問題で
// 重なっている場合は、少なめに数えることがある）。
function ensureDevId(s){
  if(!s.ctrByDev || typeof s.ctrByDev !== "object") s.ctrByDev = {};
  if(!s.devId){
    s.devId = newDevId();
    const base = flattenCounters(s);
    if(Object.keys(base).length && !s.ctrByDev.legacy) s.ctrByDev.legacy = base;
    return true;
  }
  return false;
}
// キーの区切りは制御文字 \u0001（idや日付に現れない）。起動直後の ensureDevId から
// 呼ばれるので const にはしない（宣言より前に実行されるとTDZで落ちる）。
// state の累計カウンターを {キー: 値} の平らな表にする（0は持たない）
function flattenCounters(s){
  const f = {};
  const put = (k, v)=>{ v = Math.max(0, Math.round(+v||0)); if(v > 0) f[k] = v; };
  Object.keys(s.items||{}).forEach(id=>{
    const it = s.items[id] || {};
    put("i"+"\u0001"+id+"\u0001"+"seen", it.seen);
    put("i"+"\u0001"+id+"\u0001"+"correct", it.correct);
  });
  [["l","log"],["vl","vocabLog"],["vr","vocabReviewLog"]].forEach(([t,key])=>{
    Object.keys(s[key]||{}).forEach(day=> put(t+"\u0001"+day, s[key][day]));
  });
  const cs = (s.conjug && s.conjug.stats) || {};
  Object.keys(cs).forEach(k=>{
    const st = cs[k] || {};
    put("c"+"\u0001"+k+"\u0001"+"n", st.n);
    put("c"+"\u0001"+k+"\u0001"+"ok", st.ok);
  });
  return f;
}
function ctrSum(list){
  const out = {};
  list.forEach(m=> Object.keys(m||{}).forEach(k=>{ out[k] = (out[k]||0) + (+m[k]||0); }));
  return out;
}
function ctrMax(a, b){
  const out = Object.assign({}, a||{});
  Object.keys(b||{}).forEach(k=>{ if((+b[k]||0) > (out[k]||0)) out[k] = +b[k]||0; });
  return out;
}
function ctrMinus(a, b){ // a−b（負にはしない）
  const out = {};
  Object.keys(a||{}).forEach(k=>{ const v = (+a[k]||0) - (+(b||{})[k]||0); if(v > 0) out[k] = v; });
  return out;
}
// 端末別の内訳 {devId: 平らな表}（自端末分を含む）を state から取り出す
function counterBreakdown(s, fallbackId){
  const flat = flattenCounters(s);
  const selfId = s.devId || fallbackId;
  const others = {};
  Object.keys(s.ctrByDev||{}).forEach(d=>{ if(d !== selfId) others[d] = s.ctrByDev[d] || {}; });
  const out = Object.assign({}, others);
  out[selfId] = ctrMinus(flat, ctrSum(Object.values(others)));
  return {selfId, flat, byDev: out};
}
// 合計の平らな表を state の各カウンターへ書き戻す（lastAt 等の他のフィールドは残す）
function applyCounters(s, flat){
  const items = {};
  Object.keys(s.items||{}).forEach(id=>{ items[id] = Object.assign({}, s.items[id], {seen:0, correct:0}); });
  const logs = {log:{}, vocabLog:{}, vocabReviewLog:{}};
  const stats = {};
  const cs = (s.conjug && s.conjug.stats) || {};
  Object.keys(cs).forEach(k=>{ stats[k] = Object.assign({}, cs[k], {n:0, ok:0}); });
  const LOGKEY = {l:"log", vl:"vocabLog", vr:"vocabReviewLog"};
  Object.keys(flat).forEach(k=>{
    const parts = k.split("\u0001"), t = parts[0], v = flat[k];
    if(t === "i"){
      const id = parts[1], fld = parts[2];
      if(!items[id]) items[id] = {seen:0, correct:0, lastAt:null};
      items[id][fld] = v;
    } else if(LOGKEY[t]){
      logs[LOGKEY[t]][parts[1]] = v;
    } else if(t === "c"){
      const key = parts[1], fld = parts[2];
      if(!stats[key]) stats[key] = {n:0, ok:0};
      stats[key][fld] = v;
    }
  });
  s.items = items;
  s.log = logs.log; s.vocabLog = logs.vocabLog; s.vocabReviewLog = logs.vocabReviewLog;
  s.conjug = Object.assign({}, s.conjug||{}, {stats});
}
// 2つの state の累計カウンターを端末別に突き合わせてマージする
function mergeCounters(out, local, imported){
  ensureDevId(local);
  const L = counterBreakdown(local);
  // 旧形式（devId無し）の書き出しファイルは、全体を擬似端末 "legacy" の分として扱う
  // （この端末の "legacy" と max で突き合わせるので、何度読み込んでも増えない）
  const impId = imported.devId || "legacy";
  const I = counterBreakdown(imported, impId);
  const byDev = Object.assign({}, L.byDev);
  Object.keys(I.byDev).forEach(d=>{ byDev[d] = ctrMax(byDev[d], I.byDev[d]); });
  const total = ctrSum(Object.values(byDev));
  applyCounters(out, total);
  out.devId = local.devId;
  out.ctrByDev = {};
  Object.keys(byDev).forEach(d=>{ if(d !== local.devId && Object.keys(byDev[d]).length) out.ctrByDev[d] = byDev[d]; });
}
function mergeState(local, imported){
  function mergeByIdLastAtWins(a, b){
    const out = Object.assign({}, a);
    Object.keys(b||{}).forEach(id=>{
      const bi = b[id], ai = out[id];
      if(!ai){ out[id] = bi; return; }
      if((bi && bi.lastAt||0) > (ai.lastAt||0)) out[id] = bi;
    });
    return out;
  }
  function mergeItemMeta(a, b){ // 回数以外（lastAt）をまとめる。回数は mergeCounters が上書きする
    const out = {};
    Object.keys(a||{}).forEach(k=> out[k] = Object.assign({}, a[k]));
    Object.keys(b||{}).forEach(k=>{
      if(!out[k]){ out[k] = Object.assign({}, b[k]); return; }
      if((b[k].lastAt||0) > (out[k].lastAt||0)) out[k].lastAt = b[k].lastAt;
    });
    return out;
  }
  function mergeBoolFlags(a, b){
    const out = Object.assign({}, a);
    Object.keys(b||{}).forEach(k=>{ if(b[k]) out[k] = true; });
    return out;
  }
  function mergeTimestampFlags(a, b){ // 存在すれば残す。両方あれば古い方（最初に付けた時刻）を残す
    const out = Object.assign({}, a);
    Object.keys(b||{}).forEach(k=>{
      if(out[k] === undefined) out[k] = b[k];
      else if(typeof out[k] === "number" && typeof b[k] === "number") out[k] = Math.min(out[k], b[k]);
    });
    return out;
  }
  function mergeText(a, b){
    const out = Object.assign({}, a);
    Object.keys(b||{}).forEach(k=>{
      const av = (out[k]||"").trim(), bv = (b[k]||"").trim();
      if(!av) out[k] = b[k];
      else if(bv && bv !== av) out[k] = av + "\n---\n" + bv;
    });
    return out;
  }
  function mergeByIdPreferLocal(a, b){ return Object.assign({}, b||{}, a||{}); }

  const out = Object.assign({}, local);
  out.progress = mergeByIdLastAtWins(local.progress, imported.progress);
  out.vocabProgress = mergeByIdLastAtWins(local.vocabProgress, imported.vocabProgress);
  // items は lastAt 等の付帯情報だけ先にまとめ、回数は下の mergeCounters で端末別に作り直す
  out.items = mergeItemMeta(local.items, imported.items);
  out.vocabFav = mergeBoolFlags(local.vocabFav, imported.vocabFav);
  out.vocabNotes = mergeText(local.vocabNotes, imported.vocabNotes);
  out.phraseFav = mergeTimestampFlags(local.phraseFav, imported.phraseFav);
  out.phraseText = mergeText(local.phraseText, imported.phraseText);
  out.phraseCustom = mergeByIdPreferLocal(local.phraseCustom, imported.phraseCustom);
  out.exampleFav = mergeByIdPreferLocal(local.exampleFav, imported.exampleFav);
  out.vocabDecks = mergeByIdPreferLocal(local.vocabDecks, imported.vocabDecks);
  out.vocabCards = mergeByIdPreferLocal(local.vocabCards, imported.vocabCards);
  out.readingSets = mergeByIdPreferLocal(local.readingSets, imported.readingSets);
  out.readingSaved = mergeByIdPreferLocal(local.readingSaved, imported.readingSaved);
  out.essays = mergeByIdLastAtWins(local.essays, imported.essays);
  // AI生成の文法問題: 問題自体は id の和集合（ローカル優先）、「おかしい問題」の除外は一度付けたら残す、
  // トピックごとの出題オン/オフは新しく切り替えた方を採用する。
  out.aiItems = mergeByIdPreferLocal(local.aiItems, imported.aiItems);
  out.aiBad = mergeTimestampFlags(local.aiBad, imported.aiBad);
  out.aiOff = mergeByIdLastAtWins(local.aiOff, imported.aiOff);
  // AI生成の並べ替え問題・トーン選択問題：id の和集合（ローカル優先）
  out.aiCommDrills = mergeByIdPreferLocal(local.aiCommDrills, imported.aiCommDrills);
  out.aiTone = mergeByIdPreferLocal(local.aiTone, imported.aiTone);
  // 会話の続き：1本ごとの最終結果（lastAt の新しい方）
  out.dlgStats = mergeByIdLastAtWins(local.dlgStats, imported.dlgStats);
  out.vocabSeeded = !!(local.vocabSeeded || imported.vocabSeeded);
  out.vocabPosSeen = Array.from(new Set([].concat(local.vocabPosSeen||[], imported.vocabPosSeen||[])));
  // uiTheme（看板／旧）・uiColorMode（自動／ライト／ダーク）は端末ごとの好みなので同期しない。ローカルの選択を維持する。
  const lc = local.conjug || {stats:{}, tenses:["present","passe_compose"], group:"all", best:0};
  const ic = imported.conjug || {stats:{}};
  out.conjug = Object.assign({}, lc, {
    stats: mergeItemMeta(lc.stats, ic.stats),
    best: Math.max(lc.best||0, ic.best||0)
  });
  mergeCounters(out, local, imported);
  return out;
}
function exportProgress(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "grammaire-progress-" + todayStamp() + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
function importProgress(input){
  const f = input.files && input.files[0];
  if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    try{
      const obj = JSON.parse(rd.result);
      if(!obj || typeof obj!=="object" || !obj.progress) throw new Error("形式が違う");
      const imported = Object.assign(defaultState(), obj);
      state = mergeState(state, imported);
      _frIndex = null; // vocabCardsが増減する場合があるのでタップ単語の索引も作り直す
      save(); renderHome();
      alert("読み込んで、この端末の記録とマージした（片方だけの分も両方とも残る）。");
    }catch(e){ alert("読み込めなかった: " + e.message); }
  };
  rd.readAsText(f);
  input.value = "";
}
function resetProgress(){
  if(!confirm("すべての進捗を消す。元に戻せないが、いい？")) return;
  state = defaultState(); ensureDevId(state); // 端末idも振り直す
  _frIndex = null;
  save(); renderHome();
}

/* =====================================================================
   単語モード（Anki風 SM-2）＋ Anki .apkg / CSV・TSV インポート
   ===================================================================== */
// 日付は常に「ユーザーの現地時間」の暦日で扱う（toISOString()はUTC変換されるため、
// フランス等UTCより進んでいるタイムゾーンでは日付が1日ずれるバグがあった。
// 例: TZ=Europe/Parisで addDays("2026-09-15",1) が "2026-09-16" ではなく "2026-09-15" を
// 返してしまい、SRSの復習間隔が実質1日ずつ縮んでいた）。
function fmtDateLocal(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function todayStamp(){ return fmtDateLocal(new Date()); }
function addDays(dateStr, n){
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d); // 現地時間の午前0時として構築（文字列パース時のUTC/現地混同を避ける）
  dt.setDate(dt.getDate() + n);
  return fmtDateLocal(dt);
}
// 連続学習日数。state.logは文法ドリル(recordAnswer)・単語カード採点(gradeVocab)の
// どちらでも同じ日付キーに加算されるので、両方をまとめて「その日やったか」の判定に使える。
// 今日の分がまだ無くても、昨日までは続いていれば streak は切らさない（today未着手＝即ゼロにしない）。
function currentStreak(){
  let d = todayStamp();
  if(!state.log[d]){
    d = addDays(d, -1);
    if(!state.log[d]) return 0;
  }
  let n = 0;
  while(state.log[d]){
    n++;
    d = addDays(d, -1);
  }
  return n;
}
function vocabProg(id){
  if(!state.vocabProgress[id]) state.vocabProgress[id] = {ease:2.5, interval:0, reps:0, due:todayStamp(), lastAt:null};
  return state.vocabProgress[id];
}
// quality: 1=もう一度 3=難しい 4=普通 5=簡単（古典的SM-2への簡易マッピング）
// 「簡単」だけが間隔を空ける対象。もう一度・難しい・普通は、頻度がどうであろうと
// 「今日の復習（＝復習待ちプール）」に居続けさせる（due=today固定）。「簡単」と
// 評価されるまでこのプールから抜けない＝いつまでも復習対象に含まれ続ける。
const MAX_VOCAB_INTERVAL_DAYS = 90; // 「簡単」の間隔上限（日）
// 「簡単」を押した場合に空く日数（gradeVocab と同じ式。状態は変えない）
function vocabNextEasyInterval(id){
  const p = state.vocabProgress[id] || {reps:0, interval:0, ease:2.5};
  if(!p.reps) return 1;
  if(p.reps === 1) return 6;
  return Math.min(MAX_VOCAB_INTERVAL_DAYS, Math.max(1, Math.round((p.interval||1) * (p.ease||2.5))));
}
function gradeVocab(id, quality){
  const p = vocabProg(id);
  if(p.known) delete p.known;   // 知ってる扱いにした語も、実際に採点したら通常の語に戻す
  if(quality < 5){
    p.reps = 0;
    p.interval = 0;
    p.due = todayStamp();
  } else {
    if(p.reps === 0) p.interval = 1;
    else if(p.reps === 1) p.interval = 6;
    else p.interval = Math.min(MAX_VOCAB_INTERVAL_DAYS, Math.max(1, Math.round(p.interval * p.ease)));
    p.reps++;
    p.due = addDays(todayStamp(), p.interval);
  }
  p.ease = Math.max(1.3, p.ease + (0.1 - (5-quality)*(0.08+(5-quality)*0.02)));
  p.lastAt = Date.now();
  const day = todayStamp();
  state.log[day] = (state.log[day]||0) + 1;
  // 文法ドリルと混ざるstate.logとは別に、単語カードでの活動を2種類に分けて数える。
  // ・学習量＝評価の種類を問わず押した回数（簡単も含む＝今日どれだけ手を動かしたか）
  // ・復習＝簡単「以外」（もう一度／難しい／普通）＝まだ定着し切っていない語に触れた回数。
  //   簡単は「もう知っている」の表明で、これは復習というより確認なのでここには含めない。
  state.vocabLog[day] = (state.vocabLog[day]||0) + 1;
  if(quality < 5) state.vocabReviewLog[day] = (state.vocabReviewLog[day]||0) + 1;
  save();
}
function vocabTodayCount(){ return state.vocabLog[todayStamp()] || 0; }
function vocabTodayReviewCount(){ return state.vocabReviewLog[todayStamp()] || 0; }
// 「未着手（新規）」と「復習待ち（一度は見たがdueが来た）」を分けて数える。
// 以前は未着手カードも即due扱いにしていたため、5000語同梱後は初回セッションで
// 理論上全件が出題対象になってしまっていた。これを解消する。
// 登録済みの全カードidを、所属デッキ（同梱＋インポート）を辿って集める。
// タップして即席登録したブックマーク（adhoc）はどのデッキにも属さないため、
// ここには含まれない＝通常のSRSデッキ回転に混ざらず、お気に入り一覧の
// 「まとめて復習」からのみ触れる設計になる。
function allDeckCardIds(){
  const ids = [];
  Object.values(state.vocabDecks).forEach(d=>{ ids.push(...d.cardIds); });
  return ids;
}
function vocabIdsOf(deckId){
  return deckId ? (state.vocabDecks[deckId]||{cardIds:[]}).cardIds : allDeckCardIds();
}
// レベル（CEFR）別のid一覧。同梱の構造化カードのみlevelを持つので、それ以外（インポートしたカード）は含まれない。
function vocabIdsByLevel(level){
  return allDeckCardIds().filter(id=>{ const c = getCard(id); return c && c.level===level; });
}
// 機能別（situ）のid一覧。品詞デッキを横断してビジネス表現だけを取り出すのに使う。
let _situIndex = null;
function vocabIdsBySitu(situ){
  if(!_situIndex){
    _situIndex = {};
    allDeckCardIds().forEach(id=>{
      const c = getCard(id);
      if(c && c.situ) (_situIndex[c.situ] = _situIndex[c.situ] || []).push(id);
    });
  }
  return _situIndex[situ] || [];
}
function startVocabStudySitu(situ, mode){
  const ids = vocabIdsBySitu(situ);
  startVocabStudy(ids, mode, `${situ}（${ids.length}語）`);
}
// x は deckId（文字列／null=全件）でも、idの配列でもよい。
function resolveVocabIds(x){
  return Array.isArray(x) ? x : vocabIdsOf(x);
}
function vocabCardPracticeAllowed(id){
  const c=getCard(id);
  return !!c && (c.pos!=="VER" || verbPracticeAllowed(c.fr));
}
function vocabNewIds(x){
  return resolveVocabIds(x).filter(id=>vocabCardPracticeAllowed(id) && !state.vocabProgress[id]);
}
function vocabDueIds(x){
  const t = todayStamp();
  return resolveVocabIds(x).filter(id=>{
    const p = state.vocabProgress[id];
    return vocabCardPracticeAllowed(id) && p && p.due <= t;
  });
}
function vocabDueCount(x){ return vocabDueIds(x).length; }
function vocabNewCount(x){ return vocabNewIds(x).length; }
function vocabTotalCount(){ return allDeckCardIds().length; }
// 一度でも採点した（「簡単」も含む）語の数。復習待ち/未着手のどちらでもない
// 「もう学習に入っている語」を見える化する。due日がまだ来ていないだけで
// 進捗が消えたわけではないことが画面上で分かるようにするための集計。
function vocabLearnedCount(x){
  return resolveVocabIds(x).filter(id=>state.vocabProgress[id]).length;
}

/* ---------- お気に入り・メモ ----------
   例文タップで意味をポップアップする案は形態素解析が必要で重いので、
   「分からない語は★を付けて、自分で調べた内容をメモに残す」で代替する。
   その入口として、ドリルの問題文・正解、単語カードの例文などフランス語が
   表示される場所全てで、1語ずつタップするとその語がお気に入りに追加される
   ようにする（wrapTapWords）。同綴の語が5,000語デッキ側に既にあればそのカードを
   直接お気に入りに入れ、無ければ即席の「wn_」カード（訳・例文なし、メモ欄だけ）を
   その場で作る——活用形など辞書に完全一致しない語でも、後で自分で意味を調べて
   メモを書き込む置き場として機能する。 */
let _frIndex = null;
function frIndexGet(key){
  if(!_frIndex){
    _frIndex = {};
    const add = id=>{
      const c = getCard(id);
      if(c && c.fr) (_frIndex[c.fr.toLowerCase()] = _frIndex[c.fr.toLowerCase()] || []).push(id);
    };
    allDeckCardIds().forEach(add);           // 同梱5,002語＋インポートデッキ
    Object.keys(state.vocabCards).forEach(add); // タップ登録した即席（adhoc）カードの分も拾う
  }
  return _frIndex[key] || [];
}
function frIndexAdd(id, key){
  if(!_frIndex) return; // 未構築ならどのみち次回参照時に作り直されるので何もしなくてよい
  (_frIndex[key] = _frIndex[key] || []).push(id);
}
function resolveWordId(key){
  const hit = frIndexGet(key);
  return hit.length ? hit[0] : ("wn_" + encodeURIComponent(key));
}
// フランス語テキストを、語（アクセント・ハイフン複合語を含む）ごとにタップ可能な
// spanで包んで返す。エスケープもここで行うので呼び出し側でesc()は不要。
function wrapTapWords(text){
  const escaped = esc(text || "");
  return escaped.replace(/[A-Za-zÀ-ÖØ-öø-ÿŒœ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿŒœ]+)*/g, w=>{
    const key = w.toLowerCase();
    const id = resolveWordId(key);
    const on = state.vocabFav[id] ? " tapword-on" : "";
    return `<span class="tapword${on}" onclick="tapWord(this,'${w}')">${w}</span>`;
  });
}
function tapWord(elm, word){
  const key = word.toLowerCase();
  if(!key) return;
  const id = resolveWordId(key);
  if(!getCard(id)){
    state.vocabCards[id] = {front:word, fr:key, adhoc:true, pos:"", posJa:"", level:""};
    frIndexAdd(id, key);
  }
  const nowOn = !state.vocabFav[id];
  if(nowOn) state.vocabFav[id] = true; else delete state.vocabFav[id];
  save();
  if(elm) elm.classList.toggle("tapword-on", nowOn);
  const l = document.getElementById("favList");
  if(l) renderFavList();
}
function favIds(){ return Object.keys(state.vocabFav).filter(id=>state.vocabFav[id] && getCard(id)); }
function noteIds(){ return Object.keys(state.vocabNotes).filter(id=>(state.vocabNotes[id]||"").trim() && getCard(id)); }
function markedIds(){
  const set = {};
  favIds().forEach(id=>set[id]=1);
  noteIds().forEach(id=>set[id]=1);
  return Object.keys(set);
}
function toggleFav(id){
  state.vocabFav[id] = !state.vocabFav[id];
  if(!state.vocabFav[id]) delete state.vocabFav[id];
  save();
  const b = document.getElementById("favBtn_" + id);
  if(b){ b.classList.toggle("on", !!state.vocabFav[id]); b.textContent = state.vocabFav[id] ? "★" : "☆"; }
  const l = document.getElementById("favList");
  if(l) renderFavList();
}
function saveNote(id, v){
  const t = (v||"").trim();
  if(t) state.vocabNotes[id] = t; else delete state.vocabNotes[id];
  save();
}
/* ---------- 構文・例文の保存（単語カードの裏に出る構文＋例文／文法トピックの例文）
   単語自体の☆（vocabFav＝この語をSRSで復習したい）とは別物。こちらは「この言い回し・
   この構文パターンを後で見返したい」を保存する。呼び出しやすいよう専用の一覧画面にする。 */
function toggleExampleFav(id, payload){
  if(state.exampleFav[id]) delete state.exampleFav[id];
  else state.exampleFav[id] = Object.assign({}, payload, {id, savedAt: Date.now(), note:""});
  save();
}
/* ---------- 単語カードの例文（一般／仕事）と、ほかの意味 ----------
   gFr があるカードは、産業現場寄りの元の例文に加えて日常・一般の短い例文を持つ。
   どちらを先に見せるかは設定（state.uiExMode: "general" / "work"）。もう一方は折りたたんで残す。
   senses はカードの例文が示していない別の語義（[ja, en, constr, exFr, exJa, exEn]）。 */
function vocabExBlockHtml(cardId, which, fr, ja, en, label){
  const vexId = "vocex_" + cardId + (which === "g" ? "_g" : "");
  return `<div class="ex" style="margin-top:10px">
    ${label ? `<div class="small muted" style="margin-bottom:2px">${esc(label)}</div>` : ""}
    <div class="spread">
      <div class="f">${wrapTapWords(fr)}
        <button class="btn small" onclick="speakFr('${esc(fr).replace(/'/g,"\\'")}')" title="例文を聞く">🔊</button>
      </div>
      <button class="fav-btn ${state.exampleFav[vexId]?"on":""}" onclick="toggleVocabExampleFav('${cardId}','${which}')" title="構文・例文を保存">${state.exampleFav[vexId]?"★":"☆"}</button>
    </div>
    <div class="j">${esc(ja)}</div>
    ${en ? `<div class="j small muted">${esc(en)}</div>` : ""}
  </div>`;
}
function vocabExamplesHtml(c, id){
  if(!c.gFr) return vocabExBlockHtml(id, "w", c.exFr, c.exJa, c.exEn, "");
  const gen = vocabExBlockHtml(id, "g", c.gFr, c.gJa, c.gEn, "一般の例文");
  const work = vocabExBlockHtml(id, "w", c.exFr, c.exJa, c.exEn, "仕事・現場の例文");
  const genFirst = state.uiExMode !== "work";
  return (genFirst ? gen : work) +
    `<details class="ex-more"><summary class="small muted">${genFirst ? "仕事・現場の例文も見る" : "一般の例文も見る"}</summary>${genFirst ? work : gen}</details>`;
}
function vocabSensesHtml(c){
  if(!c.senses || !c.senses.length) return "";
  return `<div class="senses"><div class="small muted" style="margin:12px 0 2px">ほかの意味（${c.senses.length}）</div>` +
    c.senses.map(sn=>`<div class="sense">
      <div><b>${esc(sn[0])}</b>　/　<span class="muted">${esc(sn[1])}</span></div>
      ${sn[2] ? `<div class="small muted">構文: ${esc(sn[2])}</div>` : ""}
      <div class="f">${wrapTapWords(sn[3])} <button class="btn small" onclick="speakFr('${esc(sn[3]).replace(/'/g,"\\'")}')" title="例文を聞く">🔊</button></div>
      <div class="j">${esc(sn[4])}</div>
    </div>`).join("") + `</div>`;
}
function vocabConjLinkHtml(c){
  if(c.pos !== "VER" || typeof CONJUG === "undefined") return "";
  const v = CONJUG.verbs.find(x=>x.fr===c.fr);
  if(!v) return "";
  return `<div class="actions" style="margin-top:10px"><button class="btn small" onclick="openConjugTableFromCard('${v.fr.replace(/'/g,"\\'")}')">活用表を見る</button></div>`;
}
function openConjugTableFromCard(fr){
  const back = vocabSession ? ()=>renderVocabCard() : openConjugHome;
  openConjugTable(fr, back, vocabSession ? "カードに戻る" : "活用ドリル");
}
function setExMode(m){
  state.uiExMode = m === "work" ? "work" : "general";
  save();
  const settingsScreen = document.getElementById("uiThemeSettings");
  if(settingsScreen) renderUiSettings();
}
function toggleVocabExampleFav(cardId, which){
  const c = getCard(cardId);
  if(!c || !c.exFr) return;
  const g = which === "g" && c.gFr;
  const id = "vocex_" + cardId + (g ? "_g" : "");
  toggleExampleFav(id, g ? {kind:"vocab", label: c.constr || c.gram || "", fr: c.gFr, jp: c.gJa, en: c.gEn||"", refWord: c.front}
                         : {kind:"vocab", label: c.constr || c.gram || "", fr: c.exFr, jp: c.exJa, en: c.exEn||"", refWord: c.front});
  if(vocabSession) renderVocabCard();
  const l = document.getElementById("exampleFavList");
  if(l) renderExampleFavList();
}
function toggleTopicExampleFav(topicId, idx){
  const t = DATA.topics.find(x=>x.id===topicId);
  const e = t && t.examples && t.examples[idx];
  if(!t || !e) return;
  const id = "topex_" + topicId + "_" + idx;
  toggleExampleFav(id, {kind:"topic", label: t.name_jp, fr: e.fr, jp: e.jp, en:"", refTopicId: topicId});
  openTopic(topicId);
}
function saveExampleNote(id, v){
  if(!state.exampleFav[id]) return;
  state.exampleFav[id].note = (v||"").trim();
  save();
}
function openExampleFavList(){
  titleEl.textContent = "保存した構文・例文";
  setBack(renderHome, "ホーム");
  renderExampleFavList();
}
function renderExampleFavList(){
  const ids = Object.keys(state.exampleFav).sort((a,b)=>state.exampleFav[b].savedAt - state.exampleFav[a].savedAt);
  let h = `<p class="small muted" style="margin:0 0 12px">単語カードの裏、文法トピックの「例文」、上品なフランス語・コミュニケーション・慣用句の例文に出る☆で保存したもの。単語自体の復習リストとは別。</p>`;
  if(!ids.length){
    h += `<div class="card"><p class="small muted" style="margin:0">まだ保存した構文・例文がない。単語カードを裏返したときや、文法トピックの例文の横にある☆から保存できる。</p></div>`;
  } else {
    h += `<div id="exampleFavList">` + ids.map(id=>{
      const it = state.exampleFav[id];
      return `<div class="card" style="padding:12px 14px">
        <div class="spread" style="margin-bottom:6px">
          <span class="small muted">${esc(it.label || (it.kind==="vocab"?"単語の構文":"文法トピック"))}${it.refWord?`（${esc(it.refWord)}）`:""}</span>
          <button class="fav-btn on" onclick="toggleExampleFavAndRefresh('${id}')" title="削除">★</button>
        </div>
        <div class="ex" style="margin:0">
          <div class="f">${wrapTapWords(it.fr)}
            <button class="btn small" onclick="speakFr('${esc(it.fr).replace(/'/g,"\\'")}')" title="発音を聞く">🔊</button>
          </div>
          ${it.jp ? `<div class="j">${esc(it.jp)}</div>` : ""}
          ${it.en ? `<div class="j small muted">${esc(it.en)}</div>` : ""}
        </div>
        <textarea class="note-box" style="margin-top:8px" placeholder="自分用メモ" onchange="saveExampleNote('${id}', this.value)" onblur="saveExampleNote('${id}', this.value)">${esc(it.note||"")}</textarea>
      </div>`;
    }).join("") + `</div>`;
  }
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function toggleExampleFavAndRefresh(id){
  delete state.exampleFav[id];
  save();
  renderExampleFavList();
}
function openFavList(){
  titleEl.textContent = "お気に入り・メモ";
  setBack(openVocabHome, "単語");
  renderFavList();
}
function renderFavList(){
  const ids = markedIds();
  const fav = favIds().length, note = noteIds().length;
  let h = `<div class="grid2" style="margin-bottom:14px">
    <div class="stat"><b>${fav}</b><span>★お気に入り</span></div>
    <div class="stat"><b>${note}</b><span>メモあり</span></div>
  </div>`;
  if(!ids.length){
    h += `<div class="card"><p class="muted small" style="margin:0">まだ何も登録されていない。単語カードの裏で★を押すか、メモを書くとここに集まる。ドリルの問題文・正解や単語カードの例文中の語をタップしても登録できる。分からない語を見つけたときの置き場として使う。</p></div>`;
    el.innerHTML = h;
    return;
  }
  h += `<div class="card">
    <div class="actions" style="margin-top:0">
      <button class="btn primary" onclick="startVocabStudy(markedIds(),'all','お気に入り・メモ')">まとめて復習（${ids.length}枚）</button>
    </div></div>`;
  h += `<div class="card" id="favList">`;
  ids.forEach(id=>{
    const c = getCard(id);
    const n = state.vocabNotes[id];
    h += `<div class="vl">
      <div class="spread">
        <div style="min-width:0">
          <span class="vl-fr" style="font-size:16px">${nounWithArticleHtml(c)}</span>
          ${c.level ? `<span class="pill" style="margin-left:6px">${esc(c.level)}</span>` : ""}
          ${c.adhoc ? `<span class="adhoc-tag">要チェック</span>` : ""}
          <div class="small muted">${esc(c.ja || c.back || (c.adhoc ? "訳なし。タップして登録した語" : ""))}</div>
        </div>
        <button class="fav-btn ${state.vocabFav[id]?"on":""}" id="favBtn_${id}" onclick="toggleFav('${id}')">${state.vocabFav[id]?"★":"☆"}</button>
      </div>
      ${n ? `<div class="note-shown">${esc(n)}</div>` : ""}
    </div>`;
  });
  h += `</div>`;
  el.innerHTML = h;
}

/* ---------- 自由作文（外部AIへの添削依頼プロンプト作成 → 添削結果の貼り付け・表示） ----------
   このアプリ自体はオフライン単体HTMLなのでAI機能は持たない。かわりに、書いた作文を
   埋め込んだ添削依頼プロンプトを組み立ててコピーし、好きなAI（ChatGPT・Claude等）に
   貼り付けてもらった返答を、このアプリにそのまま貼り戻すと見出し（[語彙の修正]等）で
   自動的に項目別へ振り分けて表示する。見出しが見つからない場合は、貼った内容をそのまま表示する
   （フォールバック）。気に入った行は既存の「保存した構文・例文」（exampleFav）にそのまま合流させる。 */
function buildEssayCorrectionPrompt(text){
  const L = [];
  L.push("あなたはフランス語の添削者です。以下の学習者が書いたフランス語の作文を添削してください。");
  L.push("");
  L.push("【学習者の作文】");
  L.push(text || "（空欄）");
  L.push("");
  L.push("【回答形式】必ず次の見出し（角括弧つき、この表記のまま）を、この順番で使って答えてください。見出し以外の飾り（Markdownの太字や番号など）は付けないでください。");
  L.push("");
  L.push("[修正後の全文]");
  L.push("（原文の意図はできるだけ保ちつつ、自然なフランス語に直した全文）");
  L.push("");
  L.push("[語彙の修正]");
  L.push("（語彙・単語選びの誤りや、より自然な言い換えを1行1項目で。「誤り → 修正案（理由）」の形。無ければ「特になし」とだけ書く）");
  L.push("");
  L.push("[構文の修正]");
  L.push("（時制・前置詞・語順・性数一致などの文法・構文の誤りを1行1項目で。無ければ「特になし」とだけ書く）");
  L.push("");
  L.push("[改善点]");
  L.push("（誤りではないが、より自然・的確にするための言い回しの提案を1行1項目で。無ければ「特になし」とだけ書く）");
  L.push("");
  L.push("[解説]");
  L.push("（全体を通して学習者が意識すべきポイントの解説。日本語でよい）");
  return L.join("\n");
}
// 貼り付けられた添削結果を [見出し] ごとに切り分ける。AIやチャットUIによっては
// 見出しにMarkdownの太字（**[...]**）が付くことがあるので、その分だけ緩く許容する。
// 見出しが1つも見つからない場合は ok:false とし、呼び出し側は生テキストをそのまま出す。
function parseEssayCorrection(raw){
  const text = (raw||"").replace(/\r\n/g,"\n");
  const re = /^[ \t]*\**\s*\[(.+?)\]\s*\**[ \t]*$/gm;
  const marks = [];
  let m;
  while((m = re.exec(text))){ marks.push({heading: m[1].trim(), start: m.index, contentStart: m.index + m[0].length}); }
  if(!marks.length) return {ok:false, raw: text.trim(), sections:{}};
  const sections = {};
  marks.forEach((mk, i)=>{
    const end = (i+1 < marks.length) ? marks[i+1].start : text.length;
    sections[mk.heading] = text.slice(mk.contentStart, end).trim();
  });
  return {ok:true, raw: text.trim(), sections};
}
function newEssayId(){ return "essay_" + Date.now() + "_" + Math.random().toString(36).slice(2,7); }
function openEssayHome(){
  titleEl.textContent = "自由作文";
  setBack(renderHome, "ホーム");
  renderEssayHome();
}
function renderEssayHome(){
  const ids = Object.keys(state.essays).sort((a,b)=> (state.essays[b].lastAt||0) - (state.essays[a].lastAt||0));
  let h = `<div class="card"><button class="btn primary" style="width:100%" onclick="openEssayEditor(null)">＋ 新しい作文を書く</button></div>`;
  h += `<p class="small muted" style="margin:0 0 12px">書いた作文から添削用のプロンプトを作ってコピーし、ChatGPTやClaudeなど好きなAIに貼り付ける。返ってきた返答をこのアプリに貼り戻すと、語彙・構文の修正や改善点を項目別に表示する。</p>`;
  if(!ids.length){
    h += `<div class="card"><p class="small muted" style="margin:0">まだ作文がない。上のボタンから書き始められる。</p></div>`;
  } else {
    h += `<div class="card">` + ids.map(id=>{
      const e = state.essays[id];
      const preview = (e.text||"").replace(/\s+/g," ").trim().slice(0,60);
      const d = e.updatedAt ? new Date(e.updatedAt) : null;
      const dateStr = d ? `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}` : "";
      return `<div class="spread" style="padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="openEssayEditor('${id}')">
        <div style="min-width:0">
          <div style="font-weight:600">${esc(e.title || "無題の作文")}</div>
          <div class="small muted">${esc(dateStr)}${e.correctedFull ? " ・ 添削済み" : ""} ・ ${esc(preview)}${preview.length>=60?"…":""}</div>
        </div>
        <button class="btn small" onclick="event.stopPropagation();deleteEssay('${id}')">削除</button>
      </div>`;
    }).join("") + `</div>`;
  }
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function deleteEssay(id){
  if(!confirm("この作文を削除する？元に戻せない。")) return;
  delete state.essays[id];
  save();
  renderEssayHome();
}
let essayDraft = null;
function openEssayEditor(id){
  if(id && state.essays[id]) essayDraft = Object.assign({}, state.essays[id]);
  else essayDraft = {id:newEssayId(), title:"", text:"", correctedFull:"", vocabNotes:"", structNotes:"", improvements:"", commentary:"", rawCorrection:"", parsedOk:false, createdAt:Date.now(), updatedAt:Date.now(), lastAt:Date.now()};
  titleEl.textContent = "作文";
  setBack(openEssayHome, "作文一覧");
  renderEssayEditor();
}
function renderEssayEditor(){
  const e = essayDraft;
  let h = `<div class="card">
    <input type="text" id="essayTitle" placeholder="タイトル（任意）" value="${esc(e.title)}" onchange="essayDraft.title=this.value" style="margin-bottom:10px">
    <textarea id="essayText" placeholder="ここにフランス語で作文を書く" style="min-height:160px" onchange="essayDraft.text=this.value">${esc(e.text)}</textarea>
    <div class="actions">
      <button class="btn primary" onclick="saveEssayDraft()">保存</button>
      <button class="btn" onclick="essayDraft.text=document.getElementById('essayText').value; showEssayPrompt()">添削用プロンプトを出力</button>
    </div>
  </div>`;
  h += `<div id="essayPromptBox"></div>`;
  h += `<div class="card">
    <h2 style="margin-top:0">添削結果を貼り付け</h2>
    <p class="small muted" style="margin:0 0 8px">AIからの返答をそのままここに貼り付けて「読み込む」を押す。見出し（[修正後の全文]など）が見つからない場合は、貼った内容をそのまま表示する。</p>
    <textarea id="essayPaste" placeholder="AIの返答をここに貼り付け" style="min-height:120px"></textarea>
    <div class="actions"><button class="btn primary" onclick="loadEssayCorrection()">読み込む</button></div>
  </div>`;
  h += `<div id="essayResultBox">${essayResultHtml()}</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function showEssayPrompt(){
  const txt = buildEssayCorrectionPrompt(essayDraft.text || "");
  const box = document.getElementById("essayPromptBox");
  box.innerHTML = `<div class="card"><h2 style="margin-top:0">添削用プロンプト</h2>
    <pre class="copybox" id="essayPtxt">${esc(txt)}</pre>
    <div class="actions"><button class="btn small" onclick="copyText(document.getElementById('essayPtxt').textContent, this)">コピー</button></div>
  </div>`;
}
function saveEssayDraft(){
  const titleInp = document.getElementById("essayTitle");
  const textInp = document.getElementById("essayText");
  if(titleInp) essayDraft.title = titleInp.value;
  if(textInp) essayDraft.text = textInp.value;
  essayDraft.updatedAt = Date.now();
  essayDraft.lastAt = essayDraft.updatedAt;
  if(!essayDraft.createdAt) essayDraft.createdAt = essayDraft.updatedAt;
  state.essays[essayDraft.id] = Object.assign({}, essayDraft);
  save();
  alert("保存した。");
}
function loadEssayCorrection(){
  const raw = document.getElementById("essayPaste").value;
  if(!raw || !raw.trim()){ alert("貼り付け欄が空。"); return; }
  const parsed = parseEssayCorrection(raw);
  essayDraft.rawCorrection = parsed.raw;
  essayDraft.parsedOk = parsed.ok;
  essayDraft.correctedFull = parsed.sections["修正後の全文"] || "";
  essayDraft.vocabNotes = parsed.sections["語彙の修正"] || "";
  essayDraft.structNotes = parsed.sections["構文の修正"] || "";
  essayDraft.improvements = parsed.sections["改善点"] || "";
  essayDraft.commentary = parsed.sections["解説"] || "";
  essayDraft.updatedAt = Date.now();
  essayDraft.lastAt = essayDraft.updatedAt;
  if(!essayDraft.createdAt) essayDraft.createdAt = essayDraft.updatedAt;
  if(!essayDraft.title) essayDraft.title = (essayDraft.text||"").trim().slice(0,20) || "無題の作文";
  state.essays[essayDraft.id] = Object.assign({}, essayDraft);
  save();
  const titleInp = document.getElementById("essayTitle");
  if(titleInp) titleInp.value = essayDraft.title;
  const box = document.getElementById("essayResultBox");
  box.innerHTML = essayResultHtml();
  window.scrollTo(0, box.offsetTop - 60);
}
// 添削結果の中の1行を、既存の「保存した構文・例文」（exampleFav）に保存する。
// 同じ行は同じidになる単純ハッシュなので、何度でもトグルできる。
function essayLineFavId(line){
  let h = 0;
  const s = line || "";
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) | 0; }
  return "essayex_" + Math.abs(h);
}
function toggleEssayPhraseFav(line){
  const text = (line||"").trim();
  if(!text) return;
  const id = essayLineFavId(text);
  toggleExampleFav(id, {kind:"essay", label: essayDraft.title || "作文から", fr:text, jp:"", en:"", refEssayId: essayDraft.id});
  const box = document.getElementById("essayResultBox");
  if(box) box.innerHTML = essayResultHtml();
}
function essayLinesWithFav(text){
  if(!text || !text.trim()) return `<p class="small muted" style="margin:0">（なし）</p>`;
  const lines = text.split("\n").map(s=>s.trim()).filter(Boolean);
  if(!lines.length) return `<p class="small muted" style="margin:0">（なし）</p>`;
  return lines.map(line=>{
    const id = essayLineFavId(line);
    const on = !!state.exampleFav[id];
    return `<div class="spread" style="padding:5px 0;align-items:flex-start;gap:8px">
      <span class="small" style="flex:1">${esc(line)}</span>
      <button class="fav-btn ${on?"on":""}" data-line="${esc(line)}" onclick="toggleEssayPhraseFav(this.getAttribute('data-line'))" title="このフレーズを保存">${on?"★":"☆"}</button>
    </div>`;
  }).join("");
}
function essayResultHtml(){
  const e = essayDraft;
  if(!e || !e.rawCorrection) return "";
  let h = `<div class="card"><h2 style="margin-top:0">添削結果</h2>`;
  if(!e.parsedOk){
    h += `<p class="small muted" style="margin:0 0 8px">見出し（[修正後の全文]など）が見つからなかったので、貼り付けた内容をそのまま表示している。</p>
      <div class="expl">${esc(e.rawCorrection)}</div>`;
  } else {
    const fullOk = (e.correctedFull||"").trim();
    h += `<div style="margin-bottom:14px">
      <div class="small muted" style="font-weight:600;margin-bottom:4px">修正後の全文</div>`;
    if(fullOk){
      const onFull = !!state.exampleFav[essayLineFavId(fullOk)];
      h += `<div class="spread" style="align-items:flex-start;gap:8px">
        <div class="f" style="font-family:Georgia,'Times New Roman',serif;font-size:16px;flex:1">${wrapTapWords(fullOk)}
          <button class="btn small" onclick="speakFr('${esc(fullOk).replace(/'/g,"\\'")}')" title="発音を聞く">🔊</button>
        </div>
        <button class="fav-btn ${onFull?"on":""}" data-line="${esc(fullOk)}" onclick="toggleEssayPhraseFav(this.getAttribute('data-line'))" title="保存">${onFull?"★":"☆"}</button>
      </div>`;
    } else {
      h += `<p class="small muted" style="margin:0">（見出しはあったが内容が空だった）</p>`;
    }
    h += `</div>`;
    h += `<div style="margin-bottom:14px"><div class="small muted" style="font-weight:600;margin-bottom:4px">語彙の修正</div>${essayLinesWithFav(e.vocabNotes)}</div>`;
    h += `<div style="margin-bottom:14px"><div class="small muted" style="font-weight:600;margin-bottom:4px">構文の修正</div>${essayLinesWithFav(e.structNotes)}</div>`;
    h += `<div style="margin-bottom:14px"><div class="small muted" style="font-weight:600;margin-bottom:4px">改善点</div>${essayLinesWithFav(e.improvements)}</div>`;
    h += `<div><div class="small muted" style="font-weight:600;margin-bottom:4px">解説</div><div class="expl">${esc(e.commentary || "（なし）")}</div></div>`;
  }
  h += `</div>`;
  return h;
}

/* ---------- ハンバーガーメニュー ----------
   学習の本線（単語・文法・活用）と、読み物（早口言葉などの豆知識）を分けて置く。
   読み物系はホーム画面に並べるとドリルが埋もれるので、こちらに集約する。 */
const DRAWER_SECTIONS = [
  {title:"表示", items:[
    {ic:"🎨", label:"配色・レイアウト", sub:"看板／旧・ダークモード・単語カードの例文（一般／仕事）の切り替え", fn:"openUiSettings"},
  ]},
  {title:"学習", items:[
    {ic:"🏠", label:"ホーム", fn:"renderHome"},
    {ic:"🔍", label:"検索", sub:"単語・文法・表現・会話をまとめて探す", fn:"openSearch"},
    {ic:"🗂", label:"単語", sub:"品詞別デッキ・レベル別", fn:"openVocabHome"},
    {ic:"★", label:"お気に入り・メモ", fn:"openFavList"},
    {ic:"📎", label:"保存した構文・例文", sub:"単語カード裏／文法トピックの例文から☆で保存", fn:"openExampleFavList"},
    {ic:"✏️", label:"自由作文", sub:"添削用プロンプトを出力→結果を貼り付けて表示", fn:"openEssayHome"},
    {ic:"⚡", label:"動詞活用ドリル", sub:"不定詞＋時制＋人称 → 活用形", fn:"openConjugHome"},
    {ic:"📖", label:"動詞辞書", sub:"日本語・英語の意味、例文、時制別の活用を調べる", fn:"openVerbDictionary"},
    {ic:"🎯", label:"場面別トーン選択", sub:"場面に合う言い方を3つから選ぶ", fn:"openToneHome"},
    {ic:"⚖️", label:"名詞の性ドリル", sub:"男性か女性かを選ぶ・単語データの名詞から", fn:"openGenderHome"},
    {ic:"💬", label:"コミュニケーション", sub:"場面ごとに話を組み立てる・30タスク", fn:"openCommHome"},
  ]},
  {title:"読み物・文例", items:[
    {ic:"🎩", label:"上品なフランス語", sub:"日常で使える丁寧で上品な言い方・場面別", fn:"openSoutenuHome"},
    {ic:"🗝️", label:"慣用句", sub:"テーマ別・直訳つき", fn:"openIdiomHome"},
    {ic:"✉", label:"文例集", sub:"メール・報告・電話の定型文", fn:"openPhraseHome"},
    {ic:"📰", label:"読解モード", sub:"記事URL→AI用プロンプト→出題", fn:"openReadingHome"},
    {ic:"👅", label:"早口言葉", sub:"virelangues・読み上げ付き", fn:"openVirelangues"},
  ]},
  {title:"データ", items:[
    {ic:"⬆", label:"進捗を書き出す", fn:"exportProgress"},
    {ic:"⬇", label:"進捗を読み込む", fn:"importProgressPick"},
  ]},
];
function renderDrawer(){
  const d = document.getElementById("drawer");
  let h = `<h2>メニュー</h2>
    <button class="btn small drawer-close" onclick="closeDrawer()">閉じる</button>`;
  DRAWER_SECTIONS.forEach(sec=>{
    h += `<h3>${esc(sec.title)}</h3>`;
    sec.items.forEach(it=>{
      h += `<button class="drawer-item" onclick="drawerGo('${it.fn}')">
        <span class="di-ic">${it.ic}</span>
        <span>${esc(it.label)}${it.sub?`<span class="di-sub">${esc(it.sub)}</span>`:""}</span>
      </button>`;
    });
  });
  d.innerHTML = h;
}
function openDrawer(){
  renderDrawer();
  const d = document.getElementById("drawer"), b = document.getElementById("drawerBack");
  d.classList.remove("hidden"); b.classList.remove("hidden");
  requestAnimationFrame(()=>{ d.classList.add("show"); b.classList.add("show"); });
}
function closeDrawer(){
  const d = document.getElementById("drawer"), b = document.getElementById("drawerBack");
  d.classList.remove("show"); b.classList.remove("show");
  setTimeout(()=>{ d.classList.add("hidden"); b.classList.add("hidden"); }, 180);
}
function drawerGo(fnName){
  closeDrawer();
  const fn = window[fnName];
  if(typeof fn === "function") fn();
}
function importProgressPick(){
  // ホーム画面のファイル入力を使う。別画面から呼ばれた場合は一度ホームに戻す。
  let inp = document.getElementById("impFile");
  if(!inp){ renderHome(); inp = document.getElementById("impFile"); }
  if(inp) inp.click();
}
document.addEventListener("keydown", e=>{
  if(e.key === "Escape" && !document.getElementById("drawer").classList.contains("hidden")) closeDrawer();
});

/* ---------- 早口言葉（virelangues） ----------
   読み上げは既存の speakFr をそのまま使う。学習記録は取らない読み物扱い。 */
function openVirelangues(){
  titleEl.textContent = "早口言葉";
  setBack(renderHome, "ホーム");
  let h = `<div class="card">
    <h2>Les virelangues</h2>
    <p class="small muted" style="margin:0">口の筋肉を作るための練習。意味が取れなくてもいいので、つっかえずに同じ速さで3回言えることを目標にする。
    <span style="color:var(--bad)">きつい</span> が付いているものは日本語話者が特に苦手な音を含む。</p>
  </div><div class="card">`;
  VIRELANGUES.forEach((v,i)=>{
    const oneLine = v.fr.replace(/\n/g, " ");
    h += `<div class="vl">
      <div class="spread">
        <span class="vl-n">${String(i+1).padStart(2,"0")}${v.hard?`<span class="vl-hard">きつい</span>`:""}</span>
        <button class="btn small" onclick="speakFr('${oneLine.replace(/'/g,"\\'")}')" title="読み上げ">🔊</button>
      </div>
      <div class="vl-fr">${esc(v.fr).replace(/\n/g,"<br>")}</div>
      <div class="vl-ja">${esc(v.ja)}</div>
      <span class="vl-focus">${esc(v.focus)}</span>
    </div>`;
  });
  h += `</div><p class="footer-note">出典: CIREFE / Université Rennes II（Gil Prévôt）配布資料</p>`;
  el.innerHTML = h;
}

/* ---------- 動詞活用の瞬発ドリル ----------
   文脈込みの運用力を見る production 問題とは別に、「不定詞＋時制＋人称 → 形」を
   瞬時に出す練習。活用表は build 時に conjug.json から埋め込む。 */
let conjSession = null;
const CONJ_PRON_LABEL = {je:"je", tu:"tu", il:"il / elle", nous:"nous", vous:"vous", ils:"ils / elles"};

function conjTenseName(id){ const t = CONJUG.tenses.find(x=>x.id===id); return t ? t.name : id; }
// 範囲（lv）: 1=基本37語 / 2=よく使う（基本＋頻度上位100語） / 3=全部。群（group）と掛け合わせて絞る
function conjLv(){ const l = +state.conjug.lv; return (l>=1 && l<=3) ? l : 2; }
function conjVerbsInLv(){ const l = conjLv(); return CONJUG.verbs.filter(v=> (v.lv||1) <= l && verbPracticeAllowed(v.fr)); }
function conjVerbs(){
  const g = state.conjug.group;
  return conjVerbsInLv().filter(v=> g==="all" ? true : (g==="irregular" ? v.group==="不規則" : v.group===g));
}
function conjSetLv(l){ state.conjug.lv = l; save(); openConjugHome(); }
function conjFilterTable(q){
  q = (q||"").trim().toLowerCase();
  const qn = q.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  document.querySelectorAll("#cjTableList button").forEach(b=>{
    const t = (b.dataset.k||"");
    b.style.display = (!q || t.includes(q) || t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(qn)) ? "" : "none";
  });
}
function conjStatKey(verb, tense){ return verb + "/" + tense; }
function conjStat(verb, tense){
  const k = conjStatKey(verb, tense);
  if(!state.conjug.stats[k]) state.conjug.stats[k] = {n:0, ok:0};
  return state.conjug.stats[k];
}
function conjToggleTense(id){
  const t = state.conjug.tenses;
  const i = t.indexOf(id);
  if(i >= 0){ if(t.length > 1) t.splice(i,1); }   // 最低1つは残す
  else t.push(id);
  save();
  openConjugHome();
}
function conjSetGroup(g){ state.conjug.group = g; save(); openConjugHome(); }

function openConjugHome(){
  titleEl.textContent = "動詞活用ドリル";
  setBack(renderHome, "ホーム");
  const verbs = conjVerbs();
  let n = 0, ok = 0;
  Object.values(state.conjug.stats).forEach(s=>{ n += s.n; ok += s.ok; });

  let h = `<div class="cj-stats">
    <div class="stat"><b>${n}</b><span>累計出題</span></div>
    <div class="stat"><b>${n?Math.round(ok/n*100):0}%</b><span>正答率</span></div>
    <div class="stat"><b>${state.conjug.best}</b><span>最高連続</span></div>
  </div>`;

  h += `<div class="card"><h2>時制を選ぶ</h2>
    <div class="cj-tense-grid">` +
    CONJUG.tenses.map(t=>`<button class="cj-chip ${state.conjug.tenses.includes(t.id)?"on":""}" onclick="conjToggleTense('${t.id}')">${esc(t.name)}</button>`).join("") +
    `</div>
    <p class="small muted" style="margin:10px 0 0">複合過去は助動詞から入力する（例: ai pris / suis allé）。être を取る動詞は主語に合う性数一致の形も正解にする。</p>
  </div>`;

  const nLv = l=> CONJUG.verbs.filter(v=>(v.lv||1)<=l && verbPracticeAllowed(v.fr)).length;
  const inLv = conjVerbsInLv();
  const nG = g=> inLv.filter(v=>v.group===g).length;
  h += `<div class="card"><h2>動詞の範囲</h2>
    <div class="actions" style="margin-top:0">
      <button class="cj-chip ${conjLv()===1?"on":""}" onclick="conjSetLv(1)">基本（${nLv(1)}語）</button>
      <button class="cj-chip ${conjLv()===2?"on":""}" onclick="conjSetLv(2)">よく使う（${nLv(2)}語）</button>
      <button class="cj-chip ${conjLv()===3?"on":""}" onclick="conjSetLv(3)">全部（${nLv(3)}語）</button>
    </div>
    <div class="actions">
      <button class="cj-chip ${state.conjug.group==="all"?"on":""}" onclick="conjSetGroup('all')">すべての型（${inLv.length}）</button>
      <button class="cj-chip ${state.conjug.group==="不規則"?"on":""}" onclick="conjSetGroup('不規則')">不規則（${nG("不規則")}）</button>
      <button class="cj-chip ${state.conjug.group==="綴り変化"?"on":""}" onclick="conjSetGroup('綴り変化')">綴り変化 acheter・payer系（${nG("綴り変化")}）</button>
      <button class="cj-chip ${state.conjug.group==="規則"?"on":""}" onclick="conjSetGroup('規則')">規則（${nG("規則")}）</button>
    </div>
    <p class="small muted" style="margin:8px 0 0">「よく使う」は基本37語に、単語帳の動詞のうち使用頻度の高い100語を足したもの。「全部」はさらに不規則・綴り変化の動詞を中心に足してある。gèrerai / gérerai、paie / paye のような綴りの揺れ（1990年の綴り改訂）はどちらも正解にする。</p>
  </div>`;

  h += `<div class="card"><h2>開始</h2>
    <p class="small muted" style="margin:0 0 12px">出題対象 ${verbs.length}語 × ${state.conjug.tenses.length}時制。時間を測るので、迷ったら飛ばさずに書いて間違える方が身につく。</p>
    <div class="actions" style="margin-top:0">
      <button class="btn primary" onclick="startConjugDrill(20)">20問</button>
      <button class="btn" onclick="startConjugDrill(50)">50問</button>
    </div></div>`;

  // 苦手な組み合わせ（正答率の低い順）
  const rows = Object.keys(state.conjug.stats).map(k=>({k, s:state.conjug.stats[k]}))
    .filter(x=>x.s.n >= 3).sort((a,b)=> (a.s.ok/a.s.n) - (b.s.ok/b.s.n)).slice(0,8);
  if(rows.length){
    h += `<div class="card"><h2>苦手な組み合わせ</h2><div class="chart">`;
    rows.forEach(r=>{
      const [verb, tense] = r.k.split("/");
      const pct = r.s.ok / r.s.n;
      const cls = pct<0.6 ? "low" : (pct<0.8 ? "mid" : "");
      h += `<div class="chart-row"><div>
        <div class="chart-label">${esc(verb)} ・ ${esc(conjTenseName(tense))}</div>
        <div class="chart-track"><div class="chart-fill ${cls}" style="width:${Math.round(pct*100)}%"></div></div>
      </div><div class="chart-val">${Math.round(pct*100)}%</div></div>`;
    });
    h += `</div></div>`;
  }

  h += `<div class="card"><h2>活用表を見る</h2>
    <input type="search" class="cj-input" style="margin:0 0 8px" placeholder="動詞を探す（例: envoyer / 送る）" oninput="conjFilterTable(this.value)" autocapitalize="off" autocorrect="off" spellcheck="false">
    <div class="actions" id="cjTableList" style="margin-top:0">` +
    CONJUG.verbs.map(v=>`<button class="btn small" data-k="${esc((v.fr+" "+v.ja).toLowerCase())}" onclick="openConjugTable('${v.fr.replace(/'/g,"\\'")}')">${esc(v.fr)}</button>`).join("") +
    `</div></div>`;

  el.innerHTML = h;
}

function openConjugTable(fr, backFn, backLabel){
  const v = CONJUG.verbs.find(x=>x.fr===fr);
  if(!v) return;
  titleEl.textContent = fr;
  setBack(backFn || openConjugHome, backLabel || "活用ドリル");
  let h = `<div class="card">
    <div class="spread"><div>
      <div class="prompt-fr" style="margin:0">${esc(v.fr)}</div>
      <div class="small muted">${esc(v.ja)} ・ 過去分詞 ${esc(v.pp)} ・ 助動詞 ${esc(v.aux)}</div>
    </div>
    <button class="btn small" onclick="speakFr('${v.fr.replace(/'/g,"\\'")}')">🔊</button></div>
  </div>`;
  CONJUG.tenses.forEach(t=>{
    h += `<div class="card"><h2>${esc(t.name)}</h2><table class="cj-table">`;
    CONJUG.persons.forEach((p,i)=>{
      const forms = v.forms[t.id][i];
      const main = forms[0];
      const alt = forms.slice(1);
      h += `<tr><td>${esc(CONJ_PRON_LABEL[p])}</td><td>${esc(main)}${alt.length?`<span class="small muted"> / ${esc(alt.join(" / "))}</span>`:""}</td></tr>`;
    });
    h += `</table></div>`;
  });
  el.innerHTML = h;
}

function conjNorm(s){
  return (s||"").toLowerCase().normalize("NFC").replace(/[’´`]/g,"'").replace(/\s+/g," ").trim();
}
function conjStripAccents(s){
  return conjNorm(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function startConjugDrill(n){
  const verbs = conjVerbs();
  const tenses = state.conjug.tenses;
  if(!verbs.length || !tenses.length){ alert("出題できる組み合わせがない。"); return; }
  const qs = [];
  for(let i=0;i<n;i++){
    const v = verbs[Math.floor(Math.random()*verbs.length)];
    const t = tenses[Math.floor(Math.random()*tenses.length)];
    const p = Math.floor(Math.random()*6);
    qs.push({verb:v.fr, tense:t, person:p});
  }
  conjSession = {qs, idx:0, ok:0, streak:0, best:0, t0:Date.now(), times:[], wrong:[]};
  renderConjugQ();
}
function renderConjugQ(){
  if(!conjSession || conjSession.idx >= conjSession.qs.length) return renderConjugResult();
  const q = conjSession.qs[conjSession.idx];
  const v = CONJUG.verbs.find(x=>x.fr===q.verb);
  titleEl.textContent = "活用ドリル";
  setBack(()=>{ if(confirm("ここでやめる？")) openConjugHome(); }, "ここまで");
  conjSession.qStart = Date.now();

  const pct = Math.round(conjSession.idx / conjSession.qs.length * 100);
  const subj = CONJUG.persons[q.person];
  const lead = q.tense === "subjonctif" ? "que " : "";
  let h = `<div class="bar-progress"><div style="width:${pct}%"></div></div>`;
  h += `<div class="card">
    <div class="spread small muted" style="margin-bottom:4px">
      <span>${conjSession.idx+1} / ${conjSession.qs.length}</span>
      <span>連続 ${conjSession.streak}</span>
    </div>
    <div class="cj-q">
      <div class="cj-verb">${esc(q.verb)}</div>
      <div class="cj-meta">${esc(v.ja)}</div>
      <div class="cj-meta"><span class="pill">${esc(conjTenseName(q.tense))}</span></div>
      <div class="cj-person">${esc(lead + (subj==="je"&&q.tense!=="subjonctif" ? "je" : subj))} …</div>
    </div>
    <input type="text" id="ans" class="cj-input" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="活用形を入力">
    ${accentBarHtml()}
    <div class="actions"><button class="btn primary" style="flex:1" onclick="submitConjug()">答え合わせ</button></div>
    <div id="fb"></div>
  </div>`;
  el.innerHTML = h;
  const a = document.getElementById("ans");
  if(a){
    a.focus();
    a.addEventListener("keydown", e=>{ if(e.key === "Enter"){ e.preventDefault(); submitConjug(); } });
  }
}
function submitConjug(){
  const q = conjSession.qs[conjSession.idx];
  const v = CONJUG.verbs.find(x=>x.fr===q.verb);
  const a = document.getElementById("ans");
  if(!a) return;
  const raw = a.value;
  if(!raw.trim()) return;
  const forms = v.forms[q.tense][q.person];
  const input = conjNorm(raw);
  const exact = forms.some(f=>conjNorm(f) === input);
  const accentOnly = !exact && forms.some(f=>conjStripAccents(f) === conjStripAccents(input));

  const ms = Date.now() - conjSession.qStart;
  conjSession.times.push(ms);
  const st = conjStat(q.verb, q.tense);
  st.n++;
  if(exact){
    st.ok++;
    conjSession.ok++;
    conjSession.streak++;
    if(conjSession.streak > conjSession.best) conjSession.best = conjSession.streak;
    if(conjSession.streak > state.conjug.best) state.conjug.best = conjSession.streak;
  } else {
    conjSession.streak = 0;
    conjSession.wrong.push({q, input:raw.trim(), correct:forms[0]});
  }
  save();

  const fb = document.getElementById("fb");
  const alt = forms.slice(1);
  const altHtml = alt.length ? `<div class="small muted" style="margin-top:4px">他に正解となる形: ${esc(alt.join(" / "))}</div>` : "";
  if(exact){
    fb.className = "fb ok";
    fb.innerHTML = `<b>正解</b> ・ ${(ms/1000).toFixed(1)}秒${altHtml}`;
  } else if(accentOnly){
    fb.className = "fb ng";
    fb.innerHTML = `<b>アクセント記号が違う</b><div class="model">${esc(forms[0])}</div>
      <div class="yourans">入力: ${esc(raw.trim())}</div>
      <div class="small muted">綴りの骨格は合っている。アクセント記号は入力欄の下のボタンから入れられる。</div>${altHtml}`;
  } else {
    fb.className = "fb ng";
    fb.innerHTML = `<b>不正解</b><div class="model">${esc(forms[0])}</div>
      <div class="yourans">入力: ${esc(raw.trim())}</div>${altHtml}`;
  }
  const btn = el.querySelector(".btn.primary");
  if(btn){ btn.textContent = "次へ"; btn.onclick = nextConjug; }
  a.disabled = true;
  if(btn) btn.focus();
}
function nextConjug(){
  conjSession.idx++;
  renderConjugQ();
}
function renderConjugResult(){
  const s = conjSession;
  const n = s.qs.length;
  const avg = s.times.length ? (s.times.reduce((a,b)=>a+b,0)/s.times.length/1000) : 0;
  titleEl.textContent = "結果";
  setBack(openConjugHome, "活用ドリル");
  let h = `<div class="cj-stats">
    <div class="stat"><b>${s.ok}/${n}</b><span>正解</span></div>
    <div class="stat"><b>${avg.toFixed(1)}秒</b><span>平均</span></div>
    <div class="stat"><b>${s.best}</b><span>最高連続</span></div>
  </div>`;
  if(s.wrong.length){
    h += `<div class="card"><h2>間違えたもの</h2><table class="cj-table">`;
    s.wrong.forEach(w=>{
      h += `<tr><td>${esc(w.q.verb)}<br><span class="small">${esc(conjTenseName(w.q.tense))} / ${esc(CONJUG.persons[w.q.person])}</span></td>
        <td>${esc(w.correct)}<br><span class="small muted">入力: ${esc(w.input)}</span></td></tr>`;
    });
    h += `</table></div>`;
  } else {
    h += `<div class="card"><p class="muted small" style="margin:0">全問正解。時制や動詞の範囲を広げてみるといい。</p></div>`;
  }
  h += `<div class="card"><div class="actions" style="margin-top:0">
    <button class="btn primary" onclick="startConjugDrill(${n})">もう一度 ${n}問</button>
    <button class="btn" onclick="openConjugHome()">設定に戻る</button>
  </div></div>`;
  el.innerHTML = h;
}

/* ---------- CSV / TSV（Ankiのプレーンテキスト書き出しを含む） ---------- */
function stripHtml(s){
  return (s||"")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<[^>]+>/g,"")
    .replace(/&nbsp;/g," ").replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .trim();
}
function parseCsvLine(line, delim){
  if(delim === "\t") return line.split("\t");
  const out=[]; let cur=""; let inQ=false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(inQ){
      if(c === '"'){ if(line[i+1] === '"'){ cur+='"'; i++; } else inQ=false; }
      else cur += c;
    } else {
      if(c === '"') inQ = true;
      else if(c === delim){ out.push(cur); cur=""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
function parseDelimited(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim().length && !l.startsWith("#"));
  if(!lines.length) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  return lines.map(l => parseCsvLine(l, delim))
    .filter(cols => cols.length >= 2 && cols[0].trim())
    .map(cols => ({front: stripHtml(cols[0]), back: stripHtml(cols[1])}));
}

/* ---------- ZIP（.apkg はただの ZIP）---------- */
async function inflateRaw(u8){
  if(typeof DecompressionStream === "undefined"){
    throw new Error("このブラウザは自動解凍(DecompressionStream)に対応していない。最新のChromeかSafariで試してほしい。");
  }
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function readZip(buf){
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let eocd = -1;
  const minEocd = Math.max(0, u8.length - 22 - 65557);
  for(let i = u8.length - 22; i >= minEocd; i--){
    if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  }
  if(eocd < 0) throw new Error("ZIPファイルとして読めない（終端レコードが見つからない）");
  const entryCount = dv.getUint16(eocd+10, true);
  const cdOffset = dv.getUint32(eocd+16, true);
  const entries = [];
  let p = cdOffset;
  for(let i=0; i<entryCount; i++){
    if(dv.getUint32(p, true) !== 0x02014b50) throw new Error("ZIPのセントラルディレクトリが不正");
    const method = dv.getUint16(p+10, true);
    const compSize = dv.getUint32(p+20, true);
    const nameLen = dv.getUint16(p+28, true);
    const extraLen = dv.getUint16(p+30, true);
    const commentLen = dv.getUint16(p+32, true);
    const localOffset = dv.getUint32(p+42, true);
    const name = new TextDecoder().decode(u8.subarray(p+46, p+46+nameLen));
    entries.push({name, method, compSize, localOffset});
    p += 46 + nameLen + extraLen + commentLen;
  }
  const out = {};
  for(const f of entries){
    const lp = f.localOffset;
    const lNameLen = dv.getUint16(lp+26, true);
    const lExtraLen = dv.getUint16(lp+28, true);
    const dataStart = lp + 30 + lNameLen + lExtraLen;
    const raw = u8.subarray(dataStart, dataStart + f.compSize);
    if(f.method === 0) out[f.name] = raw;
    else if(f.method === 8) out[f.name] = await inflateRaw(raw);
    // それ以外の圧縮方式（まず使われない）は無視
  }
  return out;
}

/* ---------- SQLite（読み取り専用、Anki の notes テーブルだけ読む最小実装） ---------- */
class SQLiteReader{
  constructor(buf){
    this.u8 = new Uint8Array(buf);
    this.dv = new DataView(buf);
    const ps = this.dv.getUint16(16, false);
    this.pageSize = ps === 1 ? 65536 : ps;
    this.reserved = this.u8[20] || 0;
    this.usable = this.pageSize - this.reserved;
  }
  getPage(n){ const s=(n-1)*this.pageSize; return this.u8.subarray(s, s+this.pageSize); }
  readVarint(bytes, offset){
    let result = 0;
    for(let i=0;i<8;i++){
      const b = bytes[offset+i];
      result = result*128 + (b & 0x7f);
      if(!(b & 0x80)) return [result, offset+i+1];
    }
    result = result*256 + bytes[offset+8];
    return [result, offset+9];
  }
  readIntBE(bytes, off, len, signed){
    let v = 0;
    for(let i=0;i<len;i++) v = v*256 + bytes[off+i];
    if(signed){ const max = Math.pow(2, len*8); if(v >= max/2) v -= max; }
    return v;
  }
  parseRecord(bytes){
    let [headerLen, hOff] = this.readVarint(bytes, 0);
    const types = [];
    while(hOff < headerLen){ const [t, next] = this.readVarint(bytes, hOff); types.push(t); hOff = next; }
    let valOff = headerLen;
    const values = [];
    for(const t of types){
      if(t===0){ values.push(null); }
      else if(t>=1 && t<=6){ const len=[1,2,3,4,6,8][t-1]; values.push(this.readIntBE(bytes,valOff,len,true)); valOff+=len; }
      else if(t===7){ values.push(new DataView(bytes.buffer,bytes.byteOffset+valOff,8).getFloat64(0,false)); valOff+=8; }
      else if(t===8){ values.push(0); }
      else if(t===9){ values.push(1); }
      else if(t>=12 && t%2===0){ const len=(t-12)/2; values.push(bytes.subarray(valOff,valOff+len)); valOff+=len; }
      else if(t>=13 && t%2===1){ const len=(t-13)/2; values.push(new TextDecoder().decode(bytes.subarray(valOff,valOff+len))); valOff+=len; }
      else values.push(null);
    }
    return values;
  }
  readCell(pageNum, ptr){
    const page = this.getPage(pageNum);
    let [payloadLen, off] = this.readVarint(page, ptr);
    let rowid; [rowid, off] = this.readVarint(page, off);
    const X = this.usable - 35;
    let local;
    if(payloadLen <= X){ local = payloadLen; }
    else{
      const M = Math.floor((this.usable-12)*32/255) - 23;
      const K = M + ((payloadLen - M) % (this.usable - 4));
      local = (K <= X) ? K : M;
    }
    const bytes = new Uint8Array(payloadLen);
    bytes.set(page.subarray(off, off+local), 0);
    let filled = local;
    if(local < payloadLen){
      let nextPage = this.readIntBE(page, off+local, 4, false);
      while(filled < payloadLen && nextPage){
        const op = this.getPage(nextPage);
        const nextPtr = this.readIntBE(op, 0, 4, false);
        const take = Math.min(this.usable-4, payloadLen-filled);
        bytes.set(op.subarray(4, 4+take), filled);
        filled += take;
        nextPage = nextPtr;
      }
    }
    return {rowid, record: this.parseRecord(bytes)};
  }
  *walkTable(pageNum){
    const page = this.getPage(pageNum);
    const hdrStart = (pageNum === 1) ? 100 : 0;
    const type = page[hdrStart];
    const numCells = (page[hdrStart+3]<<8) | page[hdrStart+4];
    if(type === 5){ // interior table b-tree
      const cellArrayStart = hdrStart + 12;
      for(let i=0;i<numCells;i++){
        const ptr = (page[cellArrayStart+i*2]<<8) | page[cellArrayStart+i*2+1];
        const child = this.readIntBE(page, ptr, 4, false);
        yield* this.walkTable(child);
      }
      const rightMost = this.readIntBE(page, hdrStart+8, 4, false);
      yield* this.walkTable(rightMost);
    } else if(type === 13){ // leaf table b-tree
      const cellArrayStart = hdrStart + 8;
      for(let i=0;i<numCells;i++){
        const ptr = (page[cellArrayStart+i*2]<<8) | page[cellArrayStart+i*2+1];
        yield this.readCell(pageNum, ptr);
      }
    }
    // インデックスページ（type 2, 10）は今回は扱わない
  }
  findTableRootPage(name){
    for(const {record} of this.walkTable(1)){
      if(record[0] === "table" && record[1] === name) return record[3];
    }
    return null;
  }
}

async function importApkg(buf){
  const files = await readZip(buf);
  const dbBytes = files["collection.anki21"] || files["collection.anki2"];
  if(!dbBytes){
    if(files["collection.anki21b"]){
      throw new Error("この .apkg は新しい圧縮形式(zstd)で保存されていて、ブラウザだけでは展開できない。Ankiで書き出すときに設定の「レガシー形式のサポート」を有効にするか、デッキを右クリックして「ノートをプレーンテキストで書き出し」(.txt)を使ってほしい。");
    }
    throw new Error("collection.anki2 が見つからない。Ankiの.apkgファイルか確認して。");
  }
  const dbBuf = dbBytes.buffer.slice(dbBytes.byteOffset, dbBytes.byteOffset + dbBytes.byteLength);
  const db = new SQLiteReader(dbBuf);
  const root = db.findTableRootPage("notes");
  if(root == null) throw new Error("notesテーブルが見つからない（形式が想定と違う）");
  const cards = [];
  for(const {rowid, record} of db.walkTable(root)){
    const flds = record[6];
    if(typeof flds !== "string") continue;
    const parts = flds.split("");
    if(parts.length < 2) continue;
    const front = stripHtml(parts[0]);
    const back = stripHtml(parts[1]);
    if(front) cards.push({front, back});
  }
  return cards;
}

/* ---------- インポート UI ---------- */
let pendingImport = null;
async function handleVocabFile(input){
  const f = input.files && input.files[0];
  if(!f) return;
  try{
    let cards;
    if(/\.apkg$/i.test(f.name)){
      cards = await importApkg(await f.arrayBuffer());
    } else {
      cards = parseDelimited(await f.text());
    }
    if(!cards.length){
      alert("カードを読み取れなかった。ファイル形式を確認して。");
      return;
    }
    pendingImport = {name: f.name.replace(/\.[^.]+$/,""), cards};
    renderImportPreview();
  }catch(e){
    console.error(e);
    alert("読み込みに失敗した。\n\n" + e.message);
  }
  input.value = "";
}
function renderImportPreview(){
  titleEl.textContent = "インポート確認";
  setBack(openVocabHome, "単語");
  const {name, cards} = pendingImport;
  let h = `<div class="card">
    <p class="small muted" style="margin:0 0 10px">${cards.length}枚のカードを検出した。デッキ名を付けて追加する。</p>
    <input type="text" id="deckName" value="${esc(name)}">
    <div class="actions">
      <button class="btn primary" onclick="confirmVocabImport()">この内容で追加</button>
      <button class="btn" onclick="pendingImport=null; openVocabHome()">キャンセル</button>
    </div>
  </div>`;
  h += `<div class="card"><h3 style="margin-top:0">プレビュー（先頭5枚 / 全${cards.length}枚）</h3>`;
  cards.slice(0,5).forEach(c=>{
    h += `<div class="ex"><div class="f">${esc(c.front)}</div><div class="j">${esc(c.back)}</div></div>`;
  });
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function confirmVocabImport(){
  const name = (document.getElementById("deckName").value || "").trim() || "無題のデッキ";
  const deckId = "d" + Date.now().toString(36) + Math.floor(Math.random()*1000);
  const ids = [];
  pendingImport.cards.forEach((c,i)=>{
    const id = deckId + "_" + i;
    state.vocabCards[id] = {front:c.front, back:c.back, deckId};
    ids.push(id);
  });
  state.vocabDecks[deckId] = {id:deckId, name, createdAt:Date.now(), cardIds:ids};
  pendingImport = null;
  save();
  openVocabHome();
}
function deleteDeck(id){
  const d = state.vocabDecks[id];
  if(!d) return;
  if(!confirm(`「${d.name}」を削除する。このデッキの進捗も消える。`)) return;
  d.cardIds.forEach(cid=>{ delete state.vocabCards[cid]; delete state.vocabProgress[cid]; });
  delete state.vocabDecks[id];
  save();
  openVocabHome();
}

/* ---------- 単語ホーム ---------- */
function openVocabHome(){
  try{ openVocabHomeInner(); }
  catch(e){ showErrorBanner("単語ホーム表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openVocabHomeInner(){
  titleEl.textContent = "単語";
  setBack(renderHome, "ホーム");
  const decks = Object.values(state.vocabDecks);
  const totalDue = vocabDueCount();
  const totalNew = vocabNewCount();
  const totalCards = vocabTotalCount();
  const totalLearned = vocabLearnedCount();
  const todayStudy = vocabTodayCount();
  const todayReview = vocabTodayReviewCount();

  let h = `<div class="grid2" style="margin-bottom:10px">
    <div class="stat"><b>${todayStudy}</b><span>今日の学習量</span></div>
    <div class="stat"><b>${todayReview}</b><span>今日の復習</span></div>
  </div>
  <div class="grid2" style="margin-bottom:14px">
    <div class="stat"><b>${totalLearned}</b><span>学習済み（通算）</span></div>
    <div class="stat"><b>${totalCards}</b><span>総カード数</span></div>
  </div>
  <p class="small muted" style="margin:-8px 0 14px">学習量＝押した回数すべて（簡単も含む）。復習＝そのうち「簡単」以外（もう一度・難しい・普通）。学習済みは一度でも採点した語の通算数で、簡単も含む（「知ってる」で外した語も含む）。</p>`;

  if(totalDue > 0 || totalNew > 0){
    h += `<div class="card">`;
    if(totalDue > 0) h += `<button class="btn primary" style="width:100%;margin-bottom:8px" onclick="startVocabStudy(null,'due')">復習待ちをまとめて（${totalDue}枚）</button>`;
    if(totalNew > 0) h += `<button class="btn" style="width:100%" onclick="startVocabStudy(null,'new')">新しい単語から始める（残り${totalNew}枚 ・ 1回${NEW_CARDS_PER_SESSION}枚まで）</button>`;
    if(totalNew > 0) h += `<button class="btn" style="width:100%;margin-top:8px" onclick="triageConf.skipped=[];triageConf.picked={};openVocabTriage()">知ってる語をまとめて外す（チェック画面）</button>`;
    const knownN = vocabKnownCount();
    if(knownN > 0) h += `<p class="small muted" style="margin:8px 0 0">知ってる扱いにした語：${knownN}語（30日後に一度だけ確認で出る）</p>`;
    h += `</div>`;
  }

  const marked = markedIds().length;
  h += `<div class="card"><div class="spread">
    <div><h2 style="margin:0">お気に入り・メモ</h2>
      <p class="small muted" style="margin:4px 0 0">★を付けた語と、自分でメモを書いた語が集まる（${marked}枚）</p></div>
    <button class="btn" onclick="openFavList()">開く</button>
  </div></div>`;

  const uiMode = state.uiTheme === "classic" ? "classic" : "kanban";
  h += `<div class="spread" style="margin:0 0 10px">
    <span class="small muted">表示：${uiMode==="kanban" ? "看板" : "旧"}（アプリ全体の設定）</span>
    <button class="btn small" onclick="toggleVocabHomeUiMode()">${uiMode==="kanban" ? "☰ 旧にする" : "⊞ 看板にする"}</button>
  </div>`;

  if(uiMode === "kanban"){
    // ビジネス表現（機能別）・品詞別デッキを、検索・絞り込みができるカンバン風レーンにまとめる。
    // まだ語が入っていない分類は出さない。
    const bizLane = BIZ_SITU.map(b=>{
      const ids = vocabIdsBySitu(b.situ);
      if(!ids.length) return "";
      const bdue = vocabDueCount(ids), bnw = vocabNewCount(ids);
      const searchKey = (b.situ + " " + b.sub).toLowerCase();
      return `<div class="vh-lane-card" data-search="${esc(searchKey)}" data-due="${bdue}" data-new="${bnw}" onclick="vhSelect(this,'biz','${esc(b.situ)}')">
        <div class="vh-badges">
          ${bdue>0 ? `<span class="vh-badge due">${bdue}</span>` : ""}
          ${bnw>0 ? `<span class="vh-badge new">${bnw}</span>` : ""}
        </div>
        <span class="vh-name">${esc(b.situ)}</span>
        <span class="vh-sub">${ids.length}語 ・ ${esc(b.sub)}</span>
      </div>`;
    }).join("");

    const deckLane = decks.map(d=>{
      const due = vocabDueCount(d.id);
      const nw = vocabNewCount(d.id);
      // 「単語帳: 名詞（2674語）」→ 見出しは品詞だけにして、語数は右に出す
      const shortName = d.name.replace(/^単語帳:\s*/, "").replace(/（[^）]*）$/, "");
      const searchKey = shortName.toLowerCase();
      return `<div class="vh-lane-card" data-search="${esc(searchKey)}" data-due="${due}" data-new="${nw}" onclick="vhSelect(this,'deck','${d.id}')">
        <div class="vh-badges">
          ${due>0 ? `<span class="vh-badge due">${due}</span>` : ""}
          ${nw>0 ? `<span class="vh-badge new">${nw}</span>` : ""}
        </div>
        <span class="vh-name">${esc(shortName)}</span>
        <span class="vh-sub">計 ${d.cardIds.length}語</span>
      </div>`;
    }).join("");

    h += `<div class="vh-toolbar">
      <input type="text" id="vhSearchInput" placeholder="デッキ・場面を検索" oninput="vhApplyFilters()">
      <div class="vh-chips">
        <button class="vh-chip on" id="vhChipAll" onclick="vhSetFilter('all')">すべて</button>
        <button class="vh-chip" id="vhChipDue" onclick="vhSetFilter('due')">復習あり</button>
        <button class="vh-chip" id="vhChipNew" onclick="vhSetFilter('new')">新規あり</button>
      </div>
    </div>`;

    h += `<div class="vh-layout">
      <div class="vh-detail">
        <div class="vh-detail-inner" id="vhDetailInner"><p class="vh-detail-empty">カードをタップすると、復習・新規のボタンとレベル別の内訳がここに出る。</p></div>
      </div>
      <div class="vh-lanes">
        ${bizLane ? `<div class="vh-lane"><h3>ビジネス表現（機能別）</h3><div class="vh-lane-row">${bizLane}</div></div>` : ""}
        ${deckLane ? `<div class="vh-lane"><h3>品詞別デッキ</h3><div class="vh-lane-row">${deckLane}</div></div>` : (!decks.length ? `<p class="muted small">まだデッキがない。下からAnkiの.apkgかCSV/TSVを読み込める。</p>` : "")}
      </div>
    </div>
    <div class="vh-detail-scrim" onclick="closeVhDetail()"></div>`;
  } else {
    // シンプル表示：以前の縦積みレイアウト（横スクロールが苦手／一覧性を優先したい人向け）
    const LEVELS_UI = ["A1","A2","B1","B2","C1","C2"];
    const bizRows = BIZ_SITU.map(b=>{
      const ids = vocabIdsBySitu(b.situ);
      if(!ids.length) return "";
      const bdue = vocabDueCount(ids), bnw = vocabNewCount(ids);
      return `<div class="lv-row">
        <span class="lv-tag biz">${esc(b.situ)}</span>
        <span class="lv-n">${ids.length}語 ・ ${esc(b.sub)}</span>
        <span class="lv-btns">
          ${bdue>0 ? `<button class="btn small" onclick="startVocabStudySitu('${b.situ}','due')">復習 ${bdue}</button>` : ""}
          ${bnw>0 ? `<button class="btn small" onclick="startVocabStudySitu('${b.situ}','new')">新規 ${bnw}</button>` : ""}
        </span>
      </div>`;
    }).join("");
    if(bizRows){
      h += `<div class="card"><h2>ビジネス表現（機能別）</h2>
        <p class="small muted" style="margin:-4px 0 8px">仕事で使う言い回しを、品詞ではなく場面でまとめたもの。カードは品詞デッキと共通なので進捗は二重にならない。</p>
        ${bizRows}</div>`;
    }

    h += `<div class="card"><h2>デッキ</h2>`;
    if(!decks.length){
      h += `<p class="muted small" style="margin:0">まだデッキがない。下からAnkiの.apkgかCSV/TSVを読み込める。</p>`;
    } else {
      decks.forEach(d=>{
        const due = vocabDueCount(d.id);
        const nw = vocabNewCount(d.id);
        const shortName = d.name.replace(/^単語帳:\s*/, "").replace(/（[^）]*）$/, "");
        h += `<div class="deck">
          <div class="deck-head">
            <span class="deck-name">${esc(shortName)}</span>
            <span class="deck-total">計 ${d.cardIds.length}</span>
          </div>
          <div class="deck-actions">
            ${due>0 ? `<button class="btn small" onclick="startVocabStudy('${d.id}','due')">復習（${due}）</button>` : ""}
            ${nw>0 ? `<button class="btn small" onclick="startVocabStudy('${d.id}','new')">新規（${nw}）</button>` : ""}
          </div>`;
        const levelRows = LEVELS_UI.map(lv=>{
          const ids = d.cardIds.filter(id=>{ const c = getCard(id); return c && c.level===lv; });
          if(!ids.length) return "";
          const ldue = vocabDueCount(ids);
          const lnw = vocabNewCount(ids);
          return `<div class="lv-row">
            <span class="lv-tag">${lv}</span>
            <span class="lv-n">${ids.length}語</span>
            <span class="lv-btns">
              ${ldue>0 ? `<button class="btn small" onclick="startVocabStudyDeckLevel('${d.id}','${lv}','due')">復習 ${ldue}</button>` : ""}
              ${lnw>0 ? `<button class="btn small" onclick="startVocabStudyDeckLevel('${d.id}','${lv}','new')">新規 ${lnw}</button>` : ""}
            </span>
          </div>`;
        }).join("");
        if(levelRows) h += `<div class="lv-rows">${levelRows}</div>`;
        h += `</div>`;
      });
    }
    h += `</div>`;
  }

  if(decks.length){
    h += `<div class="card"><h2>管理</h2>`;
    decks.forEach(d=>{
      h += `<div class="spread" style="padding:6px 0">
        <span class="small">${esc(d.name)}（${d.cardIds.length}枚）</span>
        <button class="btn small" onclick="deleteDeck('${d.id}')">削除</button>
      </div>`;
    });
    h += `</div>`;
  }

  h += `<div class="card"><h2>インポート</h2>
    <p class="small muted" style="margin:0 0 12px">Ankiの .apkg、またはタブ区切り/CSVのテキストファイル。.apkgが新しい圧縮形式(zstd)で読めない場合は、Ankiで「ノートをプレーンテキストで書き出し」を使ってほしい。</p>
    <button class="btn" onclick="document.getElementById('vocabFile').click()">ファイルを選ぶ</button>
    <input type="file" id="vocabFile" accept=".apkg,.csv,.txt,.tsv" class="hidden" onchange="handleVocabFile(this)">
  </div>`;

  el.innerHTML = h;
  window.scrollTo(0,0);
}

/* 単語ホーム：検索・絞り込み・カード選択（詳細パネル）を扱う軽量な状態
   ページ全体を作り直さず、既に描画済みのDOMをその場で更新することで、
   検索欄の入力中にフォーカスが飛ばないようにしている。 */
/* ---------- 表示テーマ（看板／旧）とダークモード（自動／ライト／ダーク）。
   どちらもアプリ全体に効くグローバル設定。単語ホームのレーン表示⇄シンプル表示は
   看板／旧に連動する。ダークモードは既定では端末設定（prefers-color-scheme）に自動追従するが、
   [data-color-mode]属性で端末設定にかかわらずライト／ダーク固定にもできる（CSS側を参照）。 */
function applyUiTheme(){
  if(state.uiTheme === "classic") document.documentElement.setAttribute("data-theme-mode", "classic");
  else document.documentElement.removeAttribute("data-theme-mode");
  if(state.uiColorMode === "light" || state.uiColorMode === "dark") document.documentElement.setAttribute("data-color-mode", state.uiColorMode);
  else document.documentElement.removeAttribute("data-color-mode");
}
function setGlobalUiTheme(mode){
  state.uiTheme = (mode === "classic") ? "classic" : "kanban";
  applyUiTheme();
  save();
  const settingsScreen = document.getElementById("uiThemeSettings");
  if(settingsScreen) renderUiSettings();
}
function setGlobalColorMode(mode){
  state.uiColorMode = (mode==="light"||mode==="dark") ? mode : "auto";
  applyUiTheme();
  save();
  const settingsScreen = document.getElementById("uiThemeSettings");
  if(settingsScreen) renderUiSettings();
}
function openUiSettings(){
  titleEl.textContent = "配色・レイアウト";
  setBack(renderHome, "ホーム");
  renderUiSettings();
}
function renderUiSettings(){
  const mode = state.uiTheme === "classic" ? "classic" : "kanban";
  const cmode = (state.uiColorMode==="light"||state.uiColorMode==="dark") ? state.uiColorMode : "auto";
  let h = `<div class="card" id="uiThemeSettings">
    <h2 style="margin-top:0">配色・レイアウト</h2>
    <p class="small muted" style="margin:0 0 12px">アプリ全体の色合いに反映される（単語ホームのカードの見せ方も、カンバン風のレーン⇄シンプルな縦並びでこれに連動する）。</p>
    <div class="actions">
      <button class="btn ${mode==="kanban"?"primary":""}" onclick="setGlobalUiTheme('kanban')">看板（新しい配色・レーン表示）</button>
      <button class="btn ${mode==="classic"?"primary":""}" onclick="setGlobalUiTheme('classic')">旧（元の配色・シンプル表示）</button>
    </div>
    <h2 style="margin:18px 0 0">ダークモード</h2>
    <p class="small muted" style="margin:4px 0 12px">「自動」は端末の設定に追従する。端末をダークにしていなくても、ここでダークに固定できる（逆に端末がダークでもライトに固定できる）。</p>
    <div class="actions">
      <button class="btn ${cmode==="auto"?"primary":""}" onclick="setGlobalColorMode('auto')">自動（端末に合わせる）</button>
      <button class="btn ${cmode==="light"?"primary":""}" onclick="setGlobalColorMode('light')">ライト</button>
      <button class="btn ${cmode==="dark"?"primary":""}" onclick="setGlobalColorMode('dark')">ダーク</button>
    </div>
    <h2 style="margin:18px 0 0">単語カードの例文</h2>
    <p class="small muted" style="margin:4px 0 12px">仕事・現場寄りの例文が付いているカードの一部には、日常・一般の短い例文も付けてある。どちらを先に見せるかを選ぶ（もう一方は「〜も見る」で開ける）。</p>
    <div class="actions">
      <button class="btn ${state.uiExMode!=="work"?"primary":""}" onclick="setExMode('general')">一般の例文を先に</button>
      <button class="btn ${state.uiExMode==="work"?"primary":""}" onclick="setExMode('work')">仕事・現場の例文を先に</button>
    </div>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function toggleVocabHomeUiMode(){
  setGlobalUiTheme(state.uiTheme === "classic" ? "kanban" : "classic");
  openVocabHome();
}
let vhFilterMode = 'all';
let vhSelection = null;
function vhApplyFilters(){
  const inputEl = document.getElementById('vhSearchInput');
  const q = (inputEl ? inputEl.value : '').trim().toLowerCase();
  document.querySelectorAll('.vh-lane-card').forEach(card=>{
    const okSearch = !q || (card.getAttribute('data-search')||'').includes(q);
    const due = +card.getAttribute('data-due') || 0;
    const nw = +card.getAttribute('data-new') || 0;
    let okFilter = true;
    if(vhFilterMode === 'due') okFilter = due > 0;
    else if(vhFilterMode === 'new') okFilter = nw > 0;
    card.style.display = (okSearch && okFilter) ? '' : 'none';
  });
  document.querySelectorAll('.vh-lane').forEach(lane=>{
    const anyVisible = Array.from(lane.querySelectorAll('.vh-lane-card')).some(c=>c.style.display !== 'none');
    lane.style.display = anyVisible ? '' : 'none';
  });
}
function vhSetFilter(mode){
  vhFilterMode = mode;
  ['vhChipAll','vhChipDue','vhChipNew'].forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.classList.remove('on');
  });
  const chipId = mode === 'due' ? 'vhChipDue' : (mode === 'new' ? 'vhChipNew' : 'vhChipAll');
  const chip = document.getElementById(chipId);
  if(chip) chip.classList.add('on');
  vhApplyFilters();
}
function vhSelect(elm, type, id){
  vhSelection = {type, id};
  document.querySelectorAll('.vh-lane-card').forEach(c=>c.classList.remove('sel'));
  if(elm) elm.classList.add('sel');
  renderVhDetail();
  const panel = document.querySelector('.vh-detail');
  const scrim = document.querySelector('.vh-detail-scrim');
  if(panel) panel.classList.add('open');
  if(scrim) scrim.classList.add('open');
}
function closeVhDetail(){
  const panel = document.querySelector('.vh-detail');
  const scrim = document.querySelector('.vh-detail-scrim');
  if(panel) panel.classList.remove('open');
  if(scrim) scrim.classList.remove('open');
}
function renderVhDetail(){
  const inner = document.getElementById('vhDetailInner');
  if(!inner) return;
  inner.innerHTML = vhDetailHtml();
}
function vhDetailHtml(){
  if(!vhSelection) return `<p class="vh-detail-empty">カードをタップすると、復習・新規のボタンとレベル別の内訳がここに出る。</p>`;
  const LEVELS_UI = ["A1","A2","B1","B2","C1","C2"];
  if(vhSelection.type === 'deck'){
    const d = state.vocabDecks[vhSelection.id];
    if(!d) return `<button class="vh-detail-close" onclick="closeVhDetail()">閉じる</button><p class="vh-detail-empty">このデッキは削除された。</p>`;
    const due = vocabDueCount(d.id), nw = vocabNewCount(d.id);
    const shortName = d.name.replace(/^単語帳:\s*/, "").replace(/（[^）]*）$/, "");
    let h = `<button class="vh-detail-close" onclick="closeVhDetail()">閉じる</button>
      <h2 style="margin:0 0 2px">${esc(shortName)}</h2>
      <p class="small muted" style="margin:0 0 12px">計 ${d.cardIds.length}語</p>
      <div class="deck-actions" style="margin-bottom:2px">
        ${due>0 ? `<button class="btn small" onclick="startVocabStudy('${d.id}','due')">復習（${due}）</button>` : ""}
        ${nw>0 ? `<button class="btn small" onclick="startVocabStudy('${d.id}','new')">新規（${nw}）</button>` : ""}
        ${due===0 && nw===0 ? `<span class="small muted">今は復習も新規もなし</span>` : ""}
      </div>`;
    const levelRows = LEVELS_UI.map(lv=>{
      const ids = d.cardIds.filter(id=>{ const c = getCard(id); return c && c.level===lv; });
      if(!ids.length) return "";
      const ldue = vocabDueCount(ids), lnw = vocabNewCount(ids);
      return `<div class="lv-row">
        <span class="lv-tag">${lv}</span>
        <span class="lv-n">${ids.length}語</span>
        <span class="lv-btns">
          ${ldue>0 ? `<button class="btn small" onclick="startVocabStudyDeckLevel('${d.id}','${lv}','due')">復習 ${ldue}</button>` : ""}
          ${lnw>0 ? `<button class="btn small" onclick="startVocabStudyDeckLevel('${d.id}','${lv}','new')">新規 ${lnw}</button>` : ""}
        </span>
      </div>`;
    }).join("");
    if(levelRows) h += `<div class="lv-rows">${levelRows}</div>`;
    return h;
  }
  if(vhSelection.type === 'biz'){
    const situ = vhSelection.id;
    const b = BIZ_SITU.find(x=>x.situ===situ);
    const ids = vocabIdsBySitu(situ);
    const due = vocabDueCount(ids), nw = vocabNewCount(ids);
    return `<button class="vh-detail-close" onclick="closeVhDetail()">閉じる</button>
      <h2 style="margin:0 0 2px">${esc(situ)}</h2>
      <p class="small muted" style="margin:0 0 12px">${b ? esc(b.sub)+" ・ " : ""}${ids.length}語</p>
      <div class="deck-actions" style="margin-bottom:2px">
        ${due>0 ? `<button class="btn small" onclick="startVocabStudySitu('${situ}','due')">復習（${due}）</button>` : ""}
        ${nw>0 ? `<button class="btn small" onclick="startVocabStudySitu('${situ}','new')">新規（${nw}）</button>` : ""}
        ${due===0 && nw===0 ? `<span class="small muted">今は復習も新規もなし</span>` : ""}
      </div>
      <p class="small muted" style="margin-top:10px">仕事で使う言い回しを、品詞ではなく場面でまとめたもの。カードは品詞デッキと共通なので進捗は二重にならない。</p>`;
  }
  return "";
}

/* ---------- 単語の学習セッション（フリップカード） ---------- */
let vocabSession = null;
function speakFr(text){
  try{
    if(!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    window.speechSynthesis.speak(u);
  }catch(e){ console.warn('読み上げ失敗', e); }
}
function startVocabStudy(deckId, mode, titleOverride, backTo){
  try{ startVocabStudyInner(deckId, mode, titleOverride, backTo); }
  catch(e){ showErrorBanner("単語セッション開始でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function startVocabStudyInner(deckId, mode, titleOverride, backTo){
  // deckId は既存デッキのid文字列／idの配列（レベル別など仮想グルーピング用）／null(全件) のいずれでも良い。
  mode = mode || 'due';
  let ids;
  if(mode === 'new'){
    ids = vocabNewIds(deckId).slice(0, NEW_CARDS_PER_SESSION);
  } else if(mode === 'all'){
    // お気に入り・メモのように「期日に関係なく全部やる」用
    ids = resolveVocabIds(deckId);
  } else {
    ids = vocabDueIds(deckId);
  }
  ids = ids.filter(vocabCardPracticeAllowed);
  if(!ids.length){ alert(mode==='new' ? "新しい単語はもうない。" : "今日復習するカードはない。"); return; }
  let title = titleOverride;
  if(!title){
    if(typeof deckId === 'string' && state.vocabDecks[deckId]) title = state.vocabDecks[deckId].name;
    else title = mode==='new' ? "新しい単語" : "単語（復習）";
  }
  vocabSession = {
    ids: mode==='new' ? ids : shuffle(ids), idx:0, revealed:false, results:[], mode, title, pool: deckId,
    backTo: backTo ? backTo.fn : (mode==='all' ? openFavList : openVocabHome),
    backLabel: backTo ? backTo.label : null
  };
  renderVocabCard();
}
function startVocabStudyDeckLevel(deckId, level, mode){
  const deck = state.vocabDecks[deckId];
  const ids = (deck ? deck.cardIds : []).filter(id=>{ const c = getCard(id); return c && c.level===level; });
  const name = deck ? deck.name.replace(/（[^）]*）$/, "") : "単語帳";
  startVocabStudy(ids, mode, `${name} / ${level}（${ids.length}語）`);
}
function renderVocabCard(){
  try{ renderVocabCardInner(); }
  catch(e){ showErrorBanner("単語カード表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function renderVocabCardInner(){
  if(vocabSession.idx >= vocabSession.ids.length) return renderVocabResult();
  const id = vocabSession.ids[vocabSession.idx];
  const c = getCard(id);
  if(!c){ vocabSession.idx++; return renderVocabCard(); } // 削除済みカードはスキップ
  titleEl.textContent = vocabSession.title;
  setBack(vocabSession.backTo || (()=>openVocabHome()), "ここまで");

  const pct = Math.round(vocabSession.idx / vocabSession.ids.length * 100);
  let h = `<div class="bar-progress"><div style="width:${pct}%"></div></div>`;
  h += `<div class="card" style="text-align:center;padding:32px 16px">
    <div class="small muted" style="margin-bottom:16px">${vocabSession.idx+1} / ${vocabSession.ids.length}</div>
<div>${c.level ? `<span class="pill">${esc(c.level)}</span>` : ""}${c.posJa ? `<span class="pill">${esc(c.posJa)}</span>` : ""}${c.soutenu ? soutLvPill(c.lv) : ""}${c.comm ? `<span class="pill">${esc(c.roleTitle)}</span>` : ""}${c.idiom ? `<span class="pill">${esc(c.themeTitle)}</span>` : ""}</div>
    <div class="prompt-fr" style="font-size:24px;margin:8px 0 0">${nounWithArticleHtml(c)}
      <button class="btn small" style="margin-left:6px;vertical-align:middle" onclick="speakFr('${esc(nounSpeakText(c)).replace(/'/g,"\\'")}')" title="発音を聞く">🔊</button>
      <button class="fav-btn ${state.vocabFav[id]?"on":""}" id="favBtn_${id}" style="vertical-align:middle" onclick="toggleFav('${id}')" title="お気に入り">${state.vocabFav[id]?"★":"☆"}</button>
    </div>`;
  if(c.soutenu) h += `<div class="small muted" style="margin-top:8px">${esc(c.ja)} ／ 上品に言うと？</div>`;
  if(c.comm) h += `<div class="small muted" style="margin-top:8px">${esc(c.ja)}</div>`;
  if(c.idiom) h += `<div class="small muted" style="margin-top:8px">意味は？</div>`;
  if(!vocabSession.revealed){
    h += `<div class="actions" style="justify-content:center"><button class="btn primary" onclick="revealVocab()">裏を見る</button></div>`;
    if(vocabSession.mode === 'new' && c.ja !== undefined && !c.adhoc && !state.vocabProgress[id]){
      h += `<div class="actions" style="justify-content:center;margin-top:4px"><button class="btn small" onclick="knowVocabCard()">知ってる（出題から外す）</button></div>`;
    }
  } else {
    if(c.adhoc){
      // ドリル・例文中の語をタップして即席登録したブックマーク（訳・例文は持たない）
      h += `<div class="flip-back" style="text-align:left">
        <div class="small muted">ドリルや例文の中からタップして登録した語。意味を調べて下のメモに書き込もう。</div>
      </div>`;
    } else if(c.soutenu){
      // 上品なフランス語：表＝標準的な言い方、裏＝上品な言い方
      h += `<div class="flip-back" style="text-align:left">${soutenuItemBodyHtml(c)}</div>`;
    } else if(c.idiom){
      // 慣用句：表＝表現、裏＝意味・直訳・例文
      h += `<div class="flip-back" style="text-align:left">${idiomItemBodyHtml(c)}</div>`;
    } else if(c.comm){
      // コミュニケーション：表＝その役割の表現、裏＝意味・使い方・例文
      h += `<div class="flip-back" style="text-align:left">${commItemBodyHtml(c)}</div>`;
    } else if(c.ja !== undefined){
      // 構造化カード（同梱の5000語デッキ）
      h += `<div class="flip-back" style="text-align:left">
        <div class="small muted">${esc(c.gram||"")}</div>
        <div style="margin:4px 0"><b>${esc(c.ja)}</b>　/　${esc(c.en)}</div>
        ${c.constr ? `<div class="small muted" style="margin:4px 0">構文: ${esc(c.constr)}</div>` : ""}
        ${vocabExamplesHtml(c, id)}
        ${vocabSensesHtml(c)}
        ${vocabConjLinkHtml(c)}
      </div>`;
    } else {
      // インポートしたデッキ等（front/backのみ）
      h += `<div class="flip-back">${esc(c.back)}</div>`;
    }
    // 自分用メモ（調べた内容・間違えた理由などの置き場）
    h += `<div style="text-align:left;margin-top:10px">
      <div class="small muted">メモ</div>
      <textarea class="note-box" id="note_${id}" placeholder="調べた意味・間違えた理由など" onchange="saveNote('${id}', this.value)" onblur="saveNote('${id}', this.value)">${esc(state.vocabNotes[id]||"")}</textarea>
    </div>`;
    // 各ボタンの下に「押すと次にいつ出るか」を出す（2026-09 レビュー提案）
    const easyDays = vocabNextEasyInterval(id);
    h += `<div class="gradebtns">
        <button class="btn grade-btn" onclick="gradeVocabCard(1)">もう一度<small>この後すぐ再出題</small></button>
        <button class="btn grade-btn" onclick="gradeVocabCard(3)">難しい<small>今日の復習に残す</small></button>
        <button class="btn primary grade-btn" onclick="gradeVocabCard(4)">普通<small>今日の復習に残す</small></button>
        <button class="btn grade-btn" onclick="gradeVocabCard(5)">簡単<small>次は${easyDays}日後</small></button>
      </div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function revealVocab(){
  try{ vocabSession.revealed = true; renderVocabCard(); }
  catch(e){ showErrorBanner("カードを開く際にエラー： " + e.message); }
}
function gradeVocabCard(q){
  try{
    const id = vocabSession.ids[vocabSession.idx];
    gradeVocab(id, q);
    vocabSession.results.push({id, q});
    if(q === 1){
      const insertAt = Math.min(vocabSession.ids.length, vocabSession.idx + 4);
      vocabSession.ids.splice(insertAt, 0, id);
    }
    vocabSession.idx++;
    vocabSession.revealed = false;
    renderVocabCard();
  }catch(e){ showErrorBanner("採点処理でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function renderVocabResult(){
  titleEl.textContent = "結果";
  setBack(null);
  const n = vocabSession.results.length;
  const again = vocabSession.results.filter(r=>r.q===1).length;
  let h = `<div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:600">${n}枚</div>
    <div class="muted small">「もう一度」${again}枚</div>
  </div>`;
  const back = vocabSession.backLabel ? vocabSession.backTo : null;
  if(back){
    window._vocabResultBack = back;
    h += `<div class="actions"><button class="btn primary" onclick="window._vocabResultBack()">${esc(vocabSession.backLabel)}へ</button></div>`;
  } else {
    h += `<div class="actions"><button class="btn primary" onclick="openVocabHome()">単語ホームへ</button></div>`;
  }
  el.innerHTML = h;
  vocabSession = null;
  window.scrollTo(0,0);
}

/* ---------- 既知トリアージ（知ってる語をまとめて外す） ----------
   語彙を増やすと「新規」の山が一気に大きくなるので、もう知っている語は学習の前に外せるようにする。
   外した語は「簡単」を2回押したのと同じ扱い（30日後に一度だけ確認で出る）。採点ではないので
   学習量・復習の数字には入れない。採点したら known の印は消えて通常の語に戻る（gradeVocab）。
   進捗は vocabProgress に入るので、端末間のマージは既存どおり lastAt の新しい方が勝つ。 */
const KNOWN_INTERVAL_DAYS = 30;
function markVocabKnown(id, noSave){
  const p = vocabProg(id);
  p.reps = 2; p.interval = KNOWN_INTERVAL_DAYS; p.ease = Math.max(p.ease||2.5, 2.5);
  p.due = addDays(todayStamp(), KNOWN_INTERVAL_DAYS);
  p.known = true; p.lastAt = Date.now();
  if(!noSave) save();
}
function vocabKnownCount(){
  return Object.values(state.vocabProgress).filter(p=>p && p.known).length;
}
function knowVocabCard(){
  try{
    const id = vocabSession.ids[vocabSession.idx];
    markVocabKnown(id);
    vocabSession.results.push({id, q:"known"});
    // 新規セッションは「覚える語」を20枚にしたいので、外した分だけ次の新しい語を足す
    if(vocabSession.mode === 'new'){
      const inSession = new Set(vocabSession.ids);
      const next = vocabNewIds(vocabSession.pool).find(x=>!inSession.has(x));
      if(next) vocabSession.ids.push(next);
    }
    vocabSession.idx++;
    vocabSession.revealed = false;
    renderVocabCard();
  }catch(e){ showErrorBanner("知ってる処理でエラー： " + e.message); }
}
const TRIAGE_PAGE = 40;
let triageConf = {level:"all", pos:"all", showJa:false, picked:{}};
function triageCandidates(){
  const sk = new Set(triageConf.skipped||[]);
  return allDeckCardIds().filter(id=>{
    if(state.vocabProgress[id] || sk.has(id)) return false;
    const c = getCard(id);
    if(!c || c.ja === undefined || c.adhoc) return false;
    if(triageConf.level !== "all" && c.level !== triageConf.level) return false;
    if(triageConf.pos !== "all" && c.pos !== triageConf.pos) return false;
    return true;
  });
}
function openVocabTriage(){
  try{ openVocabTriageInner(); }
  catch(e){ showErrorBanner("知ってる語チェックの表示でエラー： " + e.message); }
}
function openVocabTriageInner(){
  titleEl.textContent = "知ってる語チェック";
  setBack(openVocabHome, "単語");
  const all = triageCandidates();
  const page = all.slice(0, TRIAGE_PAGE);
  const pickedN = page.filter(id=>triageConf.picked[id]).length;
  const LV = ["all","A1","A2","B1","B2","C1","C2"];
  const POSL = [["all","全品詞"],["NOM","名詞"],["VER","動詞"],["ADJ","形容詞"],["ADV","副詞"],["LOC","成句"]];
  let h = `<div class="card">
    <p class="small muted" style="margin:0 0 8px">まだ学習していない語を${TRIAGE_PAGE}語ずつ出す。意味がすぐ分かる語だけタップして選び、下のボタンで外す。外した語は30日後に一度だけ確認で出る。迷う語は選ばずに残しておく。</p>
    <div class="tri-filters">${LV.map(l=>`<button class="vh-chip ${triageConf.level===l?"on":""}" onclick="triageConf.level='${l}';triageConf.picked={};openVocabTriage()">${l==="all"?"全レベル":l}</button>`).join("")}</div>
    <div class="tri-filters">${POSL.map(([k,l])=>`<button class="vh-chip ${triageConf.pos===k?"on":""}" onclick="triageConf.pos='${k}';triageConf.picked={};openVocabTriage()">${l}</button>`).join("")}</div>
    <div class="spread" style="margin-top:6px">
      <span class="small muted">対象 ${all.length}語 ・ 表示 ${page.length}語 ・ 選択 ${pickedN}語</span>
      <button class="btn small" onclick="triageConf.showJa=!triageConf.showJa;openVocabTriage()">${triageConf.showJa?"意味を隠す":"意味を表示"}</button>
    </div>
  </div>`;
  if(!page.length){
    h += `<div class="card"><p class="muted" style="margin:0">この条件で未学習の語はもうない。</p></div>`;
  } else {
    h += `<div class="tri-grid">` + page.map(id=>{
      const c = getCard(id);
      return `<button type="button" class="tri-chip ${triageConf.picked[id]?"on":""}" onclick="triageToggle('${id}')">
        <span class="tri-fr">${esc(c.fr)}</span>
        ${triageConf.showJa ? `<span class="tri-ja">${esc(c.ja)}</span>` : ""}
        <span class="tri-lv">${esc(c.level||"")}・${esc(c.posJa||"")}</span>
      </button>`;
    }).join("") + `</div>`;
    h += `<div class="actions">
      <button class="btn small" onclick="triagePickAll(true)">全部選ぶ</button>
      <button class="btn small" onclick="triagePickAll(false)">選択を解除</button>
    </div>
    <div class="actions">
      <button class="btn primary" ${pickedN?"":"disabled"} onclick="triageApply()">選んだ${pickedN}語を知ってる扱いにして次へ</button>
      <button class="btn" onclick="triageSkipPage()">この${page.length}語は残して次へ</button>
    </div>`;
  }
  el.innerHTML = h;
}
function triageToggle(id){
  if(triageConf.picked[id]) delete triageConf.picked[id]; else triageConf.picked[id] = true;
  openVocabTriage();
}
function triagePickAll(on){
  triageCandidates().slice(0, TRIAGE_PAGE).forEach(id=>{ if(on) triageConf.picked[id] = true; else delete triageConf.picked[id]; });
  openVocabTriage();
}
function triageApply(){
  try{
    const page = triageCandidates().slice(0, TRIAGE_PAGE);
    const ids = page.filter(id=>triageConf.picked[id]);
    ids.forEach(id=>markVocabKnown(id, true));
    save();
    // 選ばなかった語は同じ画面にまた出ると先へ進めないので、このチェック画面の中でだけ後ろへ回す
    triageConf.skipped = (triageConf.skipped||[]).concat(page.filter(id=>!triageConf.picked[id]));
    triageConf.picked = {};
    window.scrollTo(0,0);
    openVocabTriage();
  }catch(e){ showErrorBanner("知ってる語の反映でエラー： " + e.message); }
}
function triageSkipPage(){
  const page = triageCandidates().slice(0, TRIAGE_PAGE);
  triageConf.skipped = (triageConf.skipped||[]).concat(page);
  triageConf.picked = {};
  window.scrollTo(0,0);
  openVocabTriage();
}

/* ---------- コミュニケーション ----------
   Communication progressive（B2-C1・C1-C2）の目次を網羅チェックに使い、中身は独自に書いた新セクション。
   カテゴリ（仕事とやり取り・考えを伝える・人と気持ち・言外の意味・時間と人生・文章を書く・フランス語圏）ごとに
   タスクを並べる。例文は日常・一般ビジネス・社会を混ぜ、特定の業界に寄せない。

   1タスクの構成:
   ① 流れ図（メールの型と同じ mg-flow の見せ方）
   ② 役割別の表現カード（上品なフランス語と同じ仕組みでSRSに乗る。id接頭辞 comm_）
   ③ 発話の並べ替えドリル（正しい順にタップする。語群ドラッグとは別の軽い実装）
   ④ 作文課題（読解・自由作文と同じ「プロンプトを組み立てて貼る→答えを貼り戻す」一往復）
   例文の☆は「保存した構文・例文」に合流（id接頭辞 commex_）。 */
let _commCardById = null, _commRoleById = null, _commTaskById = null;
function ensureCommIndex(){
  if(_commCardById) return;
  _commCardById = {}; _commRoleById = {}; _commTaskById = {};
  (COMM.tasks||[]).forEach(t=>{
    _commTaskById[t.id] = t;
    (t.roles||[]).forEach(r=>{
      _commRoleById[r.id + "@" + t.id] = Object.assign({taskId:t.id, taskTitle:t.title}, r);
      (r.items||[]).forEach(it=>{
        _commCardById[it.id] = {id: it.id, comm:true, taskId:t.id, roleId:r.id, roleTitle:r.title,
          front: it.std, fr: it.std, back: it.ja, ja: it.ja, note: it.note, exFr: it.exFr, exJa: it.exJa};
      });
    });
  });
}
function commCardById(){ ensureCommIndex(); return _commCardById; }
function commTask(tid){ ensureCommIndex(); return _commTaskById[tid]; }
function commRole(tid, rid){ ensureCommIndex(); return _commRoleById[rid + "@" + tid]; }
function commRoleIds(tid, rid){ const r = commRole(tid, rid); return r ? r.items.map(it=>it.id) : []; }
function commTaskIds(tid){ const t = commTask(tid); return t ? (t.roles||[]).flatMap(r=>r.items.map(it=>it.id)) : []; }

function commItemBodyHtml(c){
  const exId = "commex_" + c.id;
  const on = !!state.exampleFav[exId];
  return `
    <div class="sout-main">${esc(c.fr)} ${soutSpeakBtn(c.fr)}</div>
    <div style="margin:2px 0 6px"><b>${esc(c.ja)}</b></div>
    ${c.note ? `<div class="sout-note">${esc(c.note)}</div>` : ""}
    <div class="ex" style="margin-top:10px">
      <div class="spread">
        <div class="f sout-ex">${wrapTapWords(soutTypo(c.exFr))}&nbsp;${soutSpeakBtn(c.exFr)}</div>
        <button class="fav-btn ${on?"on":""}" onclick="toggleCommExampleFav('${c.id}')" title="例文を保存">${on?"★":"☆"}</button>
      </div>
      <div class="j">${esc(c.exJa)}</div>
    </div>`;
}
function toggleCommExampleFav(id){
  try{
    const c = getCard(id);
    if(!c || !c.comm) return;
    toggleExampleFav("commex_" + id, {kind:"comm", label:"コミュニケーション・" + c.roleTitle, fr:c.exFr, jp:c.exJa, en:"", refWord:c.fr});
    if(vocabSession) return renderVocabCard();
    if(document.getElementById("exampleFavList")) return renderExampleFavList();
  }catch(e){ showErrorBanner("例文の保存でエラー： " + e.message); }
}
function commProgressOf(ids){
  const learned = ids.filter(id=>state.vocabProgress[id]).length;
  return {learned, total: ids.length, due: vocabDueCount(ids), fresh: vocabNewCount(ids)};
}
function startCommStudy(taskId, roleId, mode){
  const role = roleId ? commRole(taskId, roleId) : null;
  const ids = role ? commRoleIds(taskId, roleId) : commTaskIds(taskId);
  const t = commTask(taskId);
  const name = role ? role.title : t.title;
  const back = {fn:()=>openCommTask(taskId), label:t.title};
  const modeJa = mode === "new" ? "新しく覚える" : mode === "due" ? "復習" : "全部";
  startVocabStudy(ids, mode, `${name}（${modeJa}）`, back);
}
function commStudyButtonsHtml(taskId, roleId, ids){
  const p = commProgressOf(ids);
  const rarg = roleId ? `'${roleId}'` : "''";
  return `<div class="actions" style="margin-top:8px">
    <button class="btn primary" ${p.fresh?"":"disabled"} onclick="startCommStudy('${taskId}',${rarg},'new')">新しく覚える（${Math.min(p.fresh, NEW_CARDS_PER_SESSION)}）</button>
    <button class="btn" ${p.due?"":"disabled"} onclick="startCommStudy('${taskId}',${rarg},'due')">復習（${p.due}）</button>
    <button class="btn" onclick="startCommStudy('${taskId}',${rarg},'all')">全部カードで</button>
  </div>
  <div class="small muted" style="margin-top:6px">カードで学習済み ${p.learned} / ${p.total}</div>`;
}
function openCommHome(){
  try{ openCommHomeInner(); }
  catch(e){ showErrorBanner("コミュニケーションの表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openCommHomeInner(){
  titleEl.textContent = "コミュニケーション";
  setBack(renderHome, "ホーム");
  const allIds = (COMM.tasks||[]).flatMap(t=>commTaskIds(t.id));
  const pAll = commProgressOf(allIds);
  let h = `<div class="card">
    <p class="small" style="margin:0 0 6px">一言の表現ではなく、場面に応じて話をひとまとまり組み立てる練習。各タスクに、話の流れ・役割別の表現カード・発話の並べ替え・作文課題がある。</p>
    <div class="small muted">全${(COMM.tasks||[]).length}タスク・${allIds.length}表現・カードで学習済み ${pAll.learned}${pAll.due ? `・復習 ${pAll.due}` : ""}</div>
  </div>
  <div class="card"><div class="spread">
    <div><h2 style="margin:0">💬 会話の続きを考える</h2>
      <p class="small muted" style="margin:4px 0 0">短い会話を読み、次の一言を3つから選ぶ。依頼→断られる→代案、のような流れを練習する。全${DIALOGUES.length}本・やった ${Object.keys(state.dlgStats||{}).length}本</p></div>
    <button class="btn primary" onclick="openDialogueList()">開く</button>
  </div></div>`;
  const cats = COMM.categories || [{id:"", title:"", desc:""}];
  cats.forEach(cat=>{
    const ts = (COMM.tasks||[]).filter(t=>!cat.id || t.cat===cat.id);
    if(!ts.length) return;
    h += `<h3 style="margin:18px 0 4px">${esc(cat.title)}</h3>${cat.desc ? `<p class="small muted" style="margin:0 0 8px">${esc(cat.desc)}</p>` : ""}`;
    ts.forEach(t=>{
      const p = commProgressOf(commTaskIds(t.id));
      h += `<button class="card sout-cat" style="padding:12px 14px" onclick="openCommTask('${t.id}')">
        <div class="spread"><b>${esc(t.title)}</b><span class="small muted">${p.total}表現</span></div>
        <div class="small muted" style="margin-top:4px">${esc(t.sub)}</div>
        <div class="small muted" style="margin-top:4px">学習済み ${p.learned}/${p.total}${p.due ? `・復習 ${p.due}` : ""}</div>
      </button>`;
    });
  });
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function openCommTask(taskId){
  try{ openCommTaskInner(taskId); }
  catch(e){ showErrorBanner("コミュニケーションの表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openCommTaskInner(taskId){
  const t = commTask(taskId); if(!t) return openCommHome();
  titleEl.textContent = t.title;
  setBack(openCommHome, "コミュニケーション");
  let h = `<div class="card"><p class="small" style="margin:0">${esc(t.situation_ja)}</p></div>`;

  h += `<div class="card"><h2 style="margin-top:0">① 流れ</h2><div class="mg-flow">`;
  t.flow.forEach(s=>{
    h += `<div class="mg-step">
      <div class="mg-part">${esc(s.part)} <span>／ ${esc(s.ja)}</span></div>
      <div class="mg-ex">${wrapTapWords(s.ex)}</div>
      <div class="mg-tip">${esc(s.tip)}</div>
    </div>`;
  });
  h += `</div></div>`;

  h += `<div class="card"><h2 style="margin-top:0">② 表現カード</h2>
    <p class="small muted" style="margin:-4px 0 8px">役割ごとにまとまっている。カードで覚えると単語と同じSRSで回る。</p>
    ${commStudyButtonsHtml(taskId, "", commTaskIds(taskId))}
  </div>`;
  t.roles.forEach(r=>{
    h += `<div class="card cm-role-btn"><div class="spread"><b>${esc(r.title)}</b><span class="small muted">${r.items.length}表現</span></div>
      ${commStudyButtonsHtml(taskId, r.id, r.items.map(it=>it.id))}
    </div>`;
  });

  let secNo = 3;
  const drills = commDrills(taskId);
  if(drills.length || (t.order_drill||[]).length || t.cat !== "franco"){
    h += `<div class="card"><h2 style="margin-top:0">${"①②③④⑤"[secNo-1]} 発話の並べ替え</h2>
      <p class="small muted" style="margin:-4px 0 8px">シャッフルされた発話を、自然な順にタップして並べる。</p>`;
    drills.forEach((od,i)=>{
      h += `<div style="padding:6px 0;${i?'border-top:1px solid var(--line)':''}"><div class="small" style="margin-bottom:6px">${od.ai ? `<span class="pill">AI生成</span>` : ""}${esc(od.ja)}</div>
        <div class="actions" style="margin-top:0"><button class="btn small" onclick="openCommOrder('${taskId}','${od.id}')">練習 ${i+1}</button>
        ${od.ai ? `<button class="btn small" onclick="deleteAiCommDrill('${taskId}','${od.id}')">削除</button>` : ""}</div></div>`;
    });
    h += `<div class="actions" style="margin-top:8px"><button class="btn small" onclick="openCommAiGen('${taskId}')">AIで並べ替え問題を増やす</button></div>`;
    h += `</div>`;
    secNo++;
  }

  const dl = DIALOGUES.filter(d=>d.task_id===taskId);
  if(dl.length){
    h += `<div class="card"><h2 style="margin-top:0">${"①②③④⑤⑥"[secNo-1]} 会話の続きを考える</h2>
      <p class="small muted" style="margin:-4px 0 8px">会話を読んで、次の一言を3つから選ぶ。</p>` +
      dl.map(d=>{ const st = state.dlgStats[d.id]; return `<div style="padding:6px 0"><div class="small" style="margin-bottom:6px">${esc(d.title_ja)}${st ? `<span class="small muted">（前回 ${st.best}/${st.n} が最善）</span>` : ""}</div>
        <button class="btn small" onclick="startDialogue('${d.id}')">練習する</button></div>`; }).join("") + `</div>`;
    secNo++;
  }
  h += `<div class="card"><h2 style="margin-top:0">${"①②③④⑤⑥"[secNo-1]} 作文課題</h2>
    <p class="small muted" style="margin:-4px 0 8px">状況に沿って書いてみて、好きなAIに添削してもらう。</p>`;
  t.essay_prompts.forEach((ep,i)=>{
    h += `<div style="padding:8px 0;${i?'border-top:1px solid var(--line)':''}">
      <div class="small" style="margin-bottom:6px">${esc(ep.prompt_jp)}</div>
      <button class="btn small" onclick="openCommEssay('${taskId}','${ep.id}')">この課題で書く</button>
    </div>`;
  });
  h += `</div>`;

  el.innerHTML = h;
  window.scrollTo(0,0);
}


/* ---------- 会話の続きを考える ----------
   短い会話を読み、自分の番（who:"you"）で次の一言を3つから選ぶ。選んだあと3つすべての
   判定（best＝この場面で一番／ok＝悪くない／ng＝ここでは合わない）と理由を見せ、会話は
   best の発話で先に進む。判定は「この場面での響き」であって、表現そのものの正誤ではない。
   最後に自由記述（模範解答とチェックポイントつき、AIに見てもらうプロンプトも出せる）。
   1本ごとの最終結果だけ state.dlgStats に残す（lastAt の新しい方でマージ）。 */
const DLG_TAG = {best:"この場面で一番", ok:"悪くない", ng:"ここでは合わない"};
let dlgSession = null;
function openDialogueList(){
  try{
    titleEl.textContent = "会話の続きを考える";
    setBack(openCommHome, "コミュニケーション");
    let h = `<div class="card"><p class="small" style="margin:0 0 6px">会話を読んで、自分の番で次の一言を3つから選ぶ。3つとも文法的には正しいので、この場面・この流れで一番自然なものを選ぶ。</p>
      <div class="actions" style="margin-top:6px"><button class="btn primary" onclick="startDialogueRandom()">ランダムに1本</button></div></div>`;
    const cats = COMM.categories || [{id:"", title:""}];
    cats.forEach(cat=>{
      const ts = (COMM.tasks||[]).filter(t=>!cat.id || t.cat===cat.id);
      const ds = DIALOGUES.filter(d=>ts.some(t=>t.id===d.task_id));
      if(!ds.length) return;
      h += `<h3 style="margin:18px 0 6px">${esc(cat.title)}</h3>`;
      ds.forEach(d=>{
        const t = commTask(d.task_id); const st = state.dlgStats[d.id];
        h += `<button class="card sout-cat" style="padding:12px 14px" onclick="startDialogue('${d.id}')">
          <div class="spread"><b>${esc(d.title_ja)}</b><span class="small muted">${st ? `前回 ${st.best}/${st.n}` : "未着手"}</span></div>
          <div class="small muted" style="margin-top:4px">${esc(t ? t.title : "")}</div>
        </button>`;
      });
    });
    el.innerHTML = h;
    window.scrollTo(0,0);
  }catch(e){ showErrorBanner("会話の続きの表示でエラー： " + e.message); }
}
function startDialogueRandom(){
  const pool = DIALOGUES.filter(d=>!state.dlgStats[d.id]);
  const list = pool.length ? pool : DIALOGUES;
  startDialogue(list[Math.floor(Math.random()*list.length)].id);
}
function startDialogue(id, backFn, backLabel){
  const d = DIALOGUES.find(x=>x.id===id);
  if(!d) return;
  dlgSession = {d, pos:0, answers:{}, back: backFn || null, backLabel: backLabel || null, done:false, today: backLabel === "今日の10分"};
  // 最初の「自分の番」の手前まで進める
  dlgAdvance();
}
function dlgAdvance(){
  const S = dlgSession;
  while(S.pos < S.d.turns.length && S.d.turns[S.pos].who !== "you") S.pos++;
  renderDialogue();
}
function renderDialogue(){
  try{ renderDialogueInner(); }
  catch(e){ showErrorBanner("会話の続きの表示でエラー： " + e.message); }
}
function dlgBubble(who, name, fr, ja){
  return `<div class="dlg-line ${who}">
    <div class="dlg-name">${esc(name)}</div>
    <div class="dlg-fr">${wrapTapWords(fr)} <button class="btn small" onclick="speakFr('${esc(fr).replace(/'/g,"\\'")}')" title="聞く">🔊</button></div>
    <div class="dlg-ja">${esc(ja)}</div>
  </div>`;
}
function renderDialogueInner(){
  const S = dlgSession, d = S.d;
  titleEl.textContent = d.title_ja;
  const back = S.back || openDialogueList;
  setBack(back, S.backLabel || "会話一覧");
  let h = `<div class="card"><p class="small" style="margin:0">${esc(d.situation_ja)}</p></div><div class="card dlg">`;
  // これまでの流れ（自分の番は best の発話で表示）
  for(let i=0; i<Math.min(S.pos, d.turns.length); i++){
    const t = d.turns[i];
    if(t.who === "other") h += dlgBubble("other", t.name || "相手", t.fr, t.ja);
    else { const b = t.options.find(o=>o.verdict==="best"); h += dlgBubble("you", "あなた", b.fr, b.ja); }
  }
  if(S.pos < d.turns.length){
    const t = d.turns[S.pos];
    const ans = S.answers[S.pos];
    h += `<div class="dlg-prompt">🗨 ${esc(t.prompt_ja || "次の一言は？")}</div><div class="choices">`;
    t.options.forEach((o,i)=>{
      let cls = "";
      if(ans !== undefined){ if(o.verdict === "best") cls = "ok"; else if(i === ans) cls = "ng"; }
      h += `<button class="choice ${cls}" ${ans!==undefined?"disabled":""} onclick="answerDialogue(${i})">
        <span class="choice-n">${i+1}</span><span class="tone-fr">${esc(o.fr)}</span>
        ${ans!==undefined ? `<span class="tone-note"><span class="tone-tag ${o.verdict==="best"?"ok":(o.verdict==="ok"?"stiff":"blunt")}">${DLG_TAG[o.verdict]}</span>${esc(o.ja)}<br>${esc(o.note)}</span>` : ""}
      </button>`;
    });
    h += `</div>`;
    if(ans !== undefined){
      h += `<div class="actions"><button class="btn primary" id="dlgNext" onclick="dlgNext()">会話を続ける</button></div>`;
    }
  } else {
    // 最後：自由記述
    const nYou = d.turns.filter(t=>t.who==="you").length;
    const nBest = Object.keys(S.answers).filter(k=>d.turns[k].options[S.answers[k]].verdict==="best").length;
    if(!S.done){
      S.done = true;
      state.dlgStats[d.id] = {n:nYou, best:nBest, lastAt:Date.now()};
      save();
    }
    h += `<div class="dlg-prompt">✅ 選択 ${nBest} / ${nYou} がこの場面で一番の答え</div>`;
    if(d.model_free){
      h += `<div class="dlg-free">
        <div class="small" style="margin:10px 0 6px"><b>最後の一言を自分で書く：</b>${esc(d.model_free.prompt_ja)}</div>
        <textarea id="ans" class="note-box" rows="3" placeholder="フランス語で書いてみる"></textarea>
        ${accentBarHtml()}
        <div class="actions"><button class="btn" onclick="dlgShowModel()">模範解答を見る</button><button class="btn small" onclick="dlgShowPrompt()">AIに見てもらう</button></div>
        <div id="dlgModel"></div><div id="dlgPromptBox"></div>
      </div>`;
    }
    h += S.today
      ? `<div class="actions"><button class="btn primary" onclick="todayDone('scene')">今日の10分：完了</button><button class="btn" onclick="startDialogue('${d.id}')">もう一度</button></div>`
      : `<div class="actions"><button class="btn primary" onclick="startDialogueRandom()">別の会話へ</button><button class="btn" onclick="startDialogue('${d.id}')">もう一度</button></div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  if(S.pos < d.turns.length && S.answers[S.pos] === undefined){
    mcqChoiceHandler = answerDialogue; document.onkeydown = mcqKeyHandler;
  }
  const lines = el.querySelectorAll(".dlg-line");
  if(lines.length > 2) lines[lines.length-1].scrollIntoView({block:"center"});
  else window.scrollTo(0,0);
}
function answerDialogue(i){
  const S = dlgSession; if(!S || S.answers[S.pos] !== undefined) return;
  const t = S.d.turns[S.pos]; if(!t || !t.options[i]) return;
  S.answers[S.pos] = i;
  const day = todayStamp();
  state.log[day] = (state.log[day]||0) + 1;
  save();
  renderDialogue();
}
function dlgNext(){
  const S = dlgSession; if(!S) return;
  S.pos++;
  dlgAdvance();
}
function dlgShowModel(){
  const m = dlgSession && dlgSession.d.model_free; if(!m) return;
  const box = document.getElementById("dlgModel");
  box.innerHTML = `<div class="ex" style="margin-top:8px"><div class="f">${wrapTapWords(m.model)} <button class="btn small" onclick="speakFr('${esc(m.model).replace(/'/g,"\\'")}')">🔊</button></div>
    <div class="small muted" style="margin-top:6px">チェックポイント</div>
    <ul class="small" style="margin:4px 0 0 18px;padding:0">${(m.check_points||[]).map(c=>`<li>${esc(c)}</li>`).join("")}</ul></div>`;
}
function dlgShowPrompt(){
  const S = dlgSession; if(!S) return;
  const d = S.d, m = d.model_free || {};
  const mine = (document.getElementById("ans")||{}).value || "";
  const convo = d.turns.map(t=> t.who==="other" ? `${t.name||"相手"}: ${t.fr}` : `私: ${t.options.find(o=>o.verdict==="best").fr}`).join("\n");
  const txt = `フランス語の会話練習をしている日本語話者です。次の会話の最後に、私が書いた一言を添削してください。\n\n` +
    `【場面】${d.situation_ja}\n【会話】\n${convo}\n\n【課題】${m.prompt_ja||""}\n【私の答え】${mine.trim()||"（未記入）"}\n\n` +
    `次の順で日本語で答えてください：\n1. 文法・綴りの誤り（あれば訂正）\n2. この場面・相手に対する丁寧さや自然さ（硬すぎ・くだけすぎ・唐突さなど）\n3. より自然な言い方の例を1〜2つ\n` +
    `（参考の模範解答：${m.model||""}）`;
  document.getElementById("dlgPromptBox").innerHTML = `<pre class="copybox" id="dlgPtxt">${esc(txt)}</pre>
    <div class="actions"><button class="btn small" onclick="copyText(document.getElementById('dlgPtxt').textContent, this)">プロンプトをコピー</button></div>`;
}

/* ③ 発話の並べ替え：正しい順にタップする。ドラッグではなくタップだけの、より単純な操作にしてある */
let commOrderState = null;
function openCommOrder(taskId, drillId){
  try{ openCommOrderInner(taskId, drillId); }
  catch(e){ showErrorBanner("並べ替えの表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
// 同梱の並べ替え問題＋そのタスクのAI生成問題
function commDrills(taskId){
  const t = commTask(taskId); if(!t) return [];
  const ai = Object.values(state.aiCommDrills||{}).filter(d=>d.task_id===taskId).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  return (t.order_drill||[]).concat(ai);
}
function commDrill(taskId, drillId){ return commDrills(taskId).find(x=>x.id===drillId); }
function openCommOrderInner(taskId, drillId){
  const od = commDrill(taskId, drillId);
  if(!od) return openCommTask(taskId);
  const pool = od.sentences.map((s,i)=>({s, i})); shuffle(pool);
  commOrderState = {taskId, drillId, pool, picked:[], wrongFlash:null};
  renderCommOrder();
}
function renderCommOrder(){
  const S = commOrderState; if(!S) return openCommHome();
  const t = commTask(S.taskId), od = commDrill(S.taskId, S.drillId);
  if(!od) return openCommTask(S.taskId);
  titleEl.textContent = "発話の並べ替え";
  setBack(()=>openCommTask(S.taskId), t.title);
  const done = S.picked.length === od.sentences.length;
  let h = `<div class="card">
    <div class="small muted">${od.ai ? `<span class="pill">AI生成</span>` : ""}${esc(od.ja)}</div>`;
  for(let k=0;k<od.sentences.length;k++){
    const picked = S.picked[k];
    h += `<div class="cm-order-slot"><div class="cm-order-num">${k+1}</div><div class="cm-order-txt${picked===undefined?" empty":""}">${picked!==undefined ? esc(od.sentences[picked]) : "（ここに置く）"}</div></div>`;
  }
  h += `</div>`;
  if(!done){
    h += `<div class="card"><div class="small muted" style="margin-bottom:8px">次に来る発話はどれ？</div><div class="cm-order-pool">`;
    S.pool.forEach(({s,i})=>{
      const used = S.picked.includes(i);
      h += `<button type="button" class="cm-order-chip" ${used?"disabled":""} onclick="pickCommOrder(${i})">${esc(s)}</button>`;
    });
    h += `</div>${S.wrongFlash!==null ? `<div class="small" style="color:var(--bad);margin-top:6px">その発話はまだ早い。もう一度考えてみて。</div>` : ""}</div>`;
  } else {
    const correct = S.picked.every((v,k)=>v===k);
    h += `<div class="card" style="text-align:center">
      <div style="font-size:20px;font-weight:600">${correct ? "できた" : "完成（順番の見直しはリセットから）"}</div>
      <div class="actions" style="margin-top:10px">
        <button class="btn primary" onclick="openCommOrder('${S.taskId}','${S.drillId}')">もう一度</button>
        <button class="btn" onclick="openCommTask('${S.taskId}')">タスクに戻る</button>
      </div>
    </div>`;
  }
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function pickCommOrder(i){
  const S = commOrderState; if(!S) return;
  const expected = S.picked.length; // このドリルは1解のみを正解として扱う（自然な会話の流れは1通りに絞ってある）
  if(i === expected){ S.picked.push(i); S.wrongFlash = null; }
  else { S.wrongFlash = i; }
  renderCommOrder();
}

/* ④ 作文課題：読解・自由作文と同じ一往復パターン。ここでは軽量に、プロンプト作成と
   生の返答表示だけにしてある（見出しパースなどは自由作文の枠組みをそのまま使う設計にできる）。 */
function buildCommEssayPrompt(taskId, epId){
  const t = commTask(taskId), ep = t.essay_prompts.find(x=>x.id===epId);
  const L = [];
  L.push("あなたは日本語話者にフランス語を教える経験豊富な教師です。次の課題で書いたフランス語の文章を添削してください。");
  L.push("");
  L.push("# 課題");
  L.push(ep.prompt_jp);
  L.push(`- 使うとよい流れ：${ep.target_structure}`);
  L.push("");
  L.push("# 私が書いた文章");
  L.push("（ここに自分の文章を貼る）");
  L.push("");
  L.push("# 添削でお願いしたいこと");
  L.push("- 修正後の全文");
  L.push("- 語彙の修正（あれば）");
  L.push("- 構文の修正（あれば）");
  L.push("- 改善点");
  L.push("- 特に次の点を確認してください：");
  ep.check_points.forEach(c=>L.push("  ・" + c));
  return L.join("\n");
}
function openCommEssay(taskId, epId){
  try{ openCommEssayInner(taskId, epId); }
  catch(e){ showErrorBanner("作文課題の表示でエラー： " + e.message); }
}
function openCommEssayInner(taskId, epId){
  const t = commTask(taskId), ep = t.essay_prompts.find(x=>x.id===epId);
  titleEl.textContent = "作文課題";
  setBack(()=>openCommTask(taskId), t.title);
  let h = `<div class="card">
    <div class="small" style="margin-bottom:6px"><b>課題</b></div>
    <div class="small" style="margin-bottom:10px">${esc(ep.prompt_jp)}</div>
    <div class="small muted">使うとよい流れ：${esc(ep.target_structure)}</div>
    <textarea id="commEssayText" placeholder="ここにフランス語で書く" style="min-height:140px;margin-top:10px"></textarea>
    <div class="actions">
      <button class="btn primary" onclick="showCommEssayPrompt('${taskId}','${epId}')">添削用プロンプトを出力</button>
      <button class="btn" onclick="saveCommEssay('${taskId}','${epId}')">自由作文に保存</button>
    </div>
    <div id="commEssayPromptBox"></div>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function showCommEssayPrompt(taskId, epId){
  const text = document.getElementById("commEssayText").value || "";
  const txt = buildCommEssayPrompt(taskId, epId).replace("（ここに自分の文章を貼る）", text || "（まだ何も書いていない）");
  document.getElementById("commEssayPromptBox").innerHTML = `<pre class="copybox" id="commEssayPtxt">${esc(txt)}</pre>
    <div class="actions"><button class="btn small" onclick="copyText(document.getElementById('commEssayPtxt').textContent, this)">コピー</button></div>
    <p class="small muted" style="margin-top:8px">好きなAIに貼って、返ってきた添削をそのまま読む。書いた文章を残したいときは「自由作文に保存」を押すと、自由作文の一覧に入り、あとから添削結果の貼り付け・保存もできる。</p>`;
}
// 書いた文章を自由作文（state.essays）として保存し、自由作文の編集画面を開く。
// 課題文はタイトルとして残すので、あとで何の課題だったか分かる。
function saveCommEssay(taskId, epId){
  try{
    const t = commTask(taskId), ep = t.essay_prompts.find(x=>x.id===epId);
    const text = (document.getElementById("commEssayText").value || "").trim();
    if(!text){ alert("まだ何も書いていない。"); return; }
    const now = Date.now();
    const e = {id:newEssayId(), title:"【" + t.title + "】" + ep.prompt_jp.slice(0, 40), text, correctedFull:"", vocabNotes:"", structNotes:"", improvements:"", commentary:"", rawCorrection:"", parsedOk:false, createdAt:now, updatedAt:now, lastAt:now};
    state.essays[e.id] = e;
    save();
    openEssayEditor(e.id);
  }catch(err){ showErrorBanner("自由作文への保存でエラー： " + err.message); }
}

/* ---------- 場面別トーン選択 ----------
   場面（日本語）を見て、3つのフランス語から一番合う言い方を選ぶ。
   答えると3つすべてに「ちょうどいい／くだけすぎ／硬すぎ／きつすぎ」のラベルと理由を出す。
   「丁寧なほど正解」ではなく、場面で正解が変わる（注文に大げさな敬語は不正解、申請書では格式が正解）。
   出題は tone.json（build.py が TONE 定数のプレースホルダに埋め込む）。永続データは持たない（進捗マージに影響させない）。 */
let toneSession = null;
let toneConf = {cat:"all"};
// 判定は「この場面での推奨度」。表現そのものの文法的な正誤ではない（2026-09 レビュー G050）
const TONE_TAG = {ok:"この場面に合う", casual:"くだけすぎ", stiff:"硬すぎ", blunt:"きつく響く"};
const TONE_N = 10;
function tonePool(cat){
  const out = [];
  (TONE.cats||[]).forEach(c=>{ if(cat==="all" || c.id===cat) c.items.forEach(it=>out.push(Object.assign({catTitle:c.title}, it))); });
  // AI生成の問題も同じ分野に混ぜる
  Object.values(state.aiTone||{}).forEach(it=>{
    if(cat==="all" || it.cat===cat){
      const c = (TONE.cats||[]).find(x=>x.id===it.cat) || {title:""};
      out.push(Object.assign({catTitle:c.title}, it));
    }
  });
  return out;
}
function openToneHome(){
  try{ openToneHomeInner(); }
  catch(e){ showErrorBanner("トーン選択の表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openToneHomeInner(){
  toneSession = null;
  titleEl.textContent = "場面別トーン選択";
  setBack(renderHome, "ホーム");
  const cats = [{id:"all", title:"すべて"}].concat((TONE.cats||[]).map(c=>({id:c.id, title:c.title})));
  let h = `<div class="card">
    <p class="small" style="margin:0 0 6px">場面を読んで、一番合う言い方を3つから選ぶ。</p>
    <p class="small muted" style="margin:0">丁寧なほど正解、ではない。コーヒーの注文に大げさな敬語は合わないし、申請書にくだけた言い方は合わない。答えると、3つそれぞれがなぜ合う・合わないのかが出る。判定は「この場面でどう響くか」で、表現そのものが誤りという意味ではない（別の場面なら普通に使える言い方も多い）。</p>
  </div>
  <div class="card"><h2 style="margin-top:0">分野</h2><div class="tone-cats">`;
  cats.forEach(c=>{
    h += `<button class="btn ${toneConf.cat===c.id?"primary":""}" onclick="toneConf.cat='${c.id}';openToneHome()">${esc(c.title)}<small>${tonePool(c.id).length}問</small></button>`;
  });
  h += `</div><div class="actions"><button class="btn primary" onclick="startTone()">始める（${Math.min(TONE_N, tonePool(toneConf.cat).length)}問）</button></div></div>`;
  const nAiTone = Object.keys(state.aiTone||{}).length;
  h += `<div class="card"><h2 style="margin-top:0">AIで問題を増やす</h2>
    <p class="small muted" style="margin:0 0 8px">分野と問題数を選ぶとプロンプトを作る。好きなAIに貼って、返ってきた答えを貼り戻すと、その分野の出題に混ざる。</p>
    ${nAiTone ? `<div class="small" style="margin-bottom:6px">AI生成の問題：${nAiTone}問</div>` : ""}
    <div class="actions" style="margin-top:0"><button class="btn primary" onclick="openToneAiGen()">問題を作る</button>
    ${nAiTone ? `<button class="btn" onclick="openToneAiList()">AI生成の問題を見る</button>` : ""}</div>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function startTone(items){
  try{
    const list = items || shuffle(tonePool(toneConf.cat)).slice(0, TONE_N);
    if(!list.length) return;
    // 選択肢の並びは毎回シャッフル（正解の位置を覚えてしまわないように）
    toneSession = {items: list.map(it=>Object.assign({}, it, {opts: shuffle(it.opts.slice())})), idx:0, answered:null, results:[]};
    renderTone();
  }catch(e){ showErrorBanner("トーン選択の開始でエラー： " + e.message); }
}
function renderTone(){
  try{ renderToneInner(); }
  catch(e){ showErrorBanner("トーン選択の表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function renderToneInner(){
  const S = toneSession;
  if(!S) return openToneHome();
  if(S.idx >= S.items.length) return renderToneResult();
  const it = S.items[S.idx];
  titleEl.textContent = `場面別トーン選択 ${S.idx+1} / ${S.items.length}`;
  setBack(openToneHome, "やめる");
  let h = `<div class="card">
    <div class="small muted">${esc(it.catTitle)}${it.ai ? ` <span class="pill">AI生成</span>` : ""}</div>
    <div class="tone-situ">${esc(it.situ)}</div>
    <div class="choices">`;
  it.opts.forEach((o,i)=>{
    let cls = "";
    if(S.answered !== null){
      if(o.tag === "ok") cls = "ok";
      else if(i === S.answered) cls = "ng";
    }
    h += `<button class="choice ${cls}" data-i="${i}" ${S.answered!==null?"disabled":""} onclick="answerTone(${i})">
      <span class="choice-n">${i+1}</span><span class="tone-fr">${esc(o.fr)}</span>
      ${S.answered!==null ? `<span class="tone-note"><span class="tone-tag ${o.tag}">${TONE_TAG[o.tag]}</span>${esc(o.note)}</span>` : ""}
    </button>`;
  });
  h += `</div>`;
  if(S.answered !== null){
    const ok = it.opts.find(o=>o.tag==="ok");
    h += `<div class="actions">
      <button class="btn" onclick="speakFr('${esc(ok.fr).replace(/'/g,"\\'")}')">🔊 正解を聞く</button>
      <button class="btn primary" id="toneNext" onclick="nextTone()">${S.idx+1 >= S.items.length ? "結果を見る" : "次へ"}</button>
    </div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
  mcqChoiceHandler = answerTone;       // PCでは 1〜3 キーでも選べる（他の4択と同じ仕組み）
  document.onkeydown = mcqKeyHandler;
}
function answerTone(i){
  const S = toneSession; if(!S || S.answered !== null) return;
  const it = S.items[S.idx];
  S.answered = i;
  S.results.push({item: it, chosen: it.opts[i], correct: it.opts[i].tag === "ok"});
  renderTone();
}
function nextTone(){
  const S = toneSession; if(!S) return;
  S.idx++; S.answered = null;
  renderTone();
}
function renderToneResult(){
  const S = toneSession;
  titleEl.textContent = "場面別トーン選択 結果";
  setBack(openToneHome, "トーン選択");
  const nOk = S.results.filter(r=>r.correct).length;
  const miss = S.results.filter(r=>!r.correct);
  let h = `<div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:600">${nOk} / ${S.results.length}</div>
    <div class="muted small">${miss.length ? "間違えた場面を見直す" : "全問正解"}</div>
  </div>`;
  miss.forEach(r=>{
    const ok = r.item.opts.find(o=>o.tag==="ok");
    h += `<div class="card" style="padding:12px 14px">
      <div style="font-weight:600;margin-bottom:6px">${esc(r.item.situ)}</div>
      <div class="small"><span class="tone-tag ${r.chosen.tag}">${TONE_TAG[r.chosen.tag]}</span><span class="tone-fr">${esc(r.chosen.fr)}</span></div>
      <div class="small muted" style="margin:2px 0 6px">${esc(r.chosen.note)}</div>
      <div class="small"><span class="tone-tag ok">${TONE_TAG.ok}</span><span class="tone-fr">${esc(ok.fr)}</span></div>
      <div class="small muted" style="margin-top:2px">${esc(ok.note)}</div>
    </div>`;
  });
  window._toneRetry = miss.map(r=>r.item);
  h += `<div class="actions">
    ${miss.length ? `<button class="btn primary" onclick="startTone(window._toneRetry)">間違えた${miss.length}問をもう一度</button>` : ""}
    <button class="btn ${miss.length?"":"primary"}" onclick="startTone()">新しく${TONE_N}問</button>
    <button class="btn" onclick="openToneHome()">分野を選び直す</button>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}

/* ---------- 名詞の性ドリル ----------
   単語データの名詞（gram 列の性の表記）から自動で出題する。AIもネットも使わない。
   性が一つに決まる語だけを使う（男女同形・性で意味が変わる語・複数でしか使わない語は除く）。
   名詞を見せて「男性／女性」を選ぶ。l' で始まる語も同じ聞き方で答えられる。
   答えたあとに冠詞付きの形と、語尾の傾向（例外なら例外と明示）を出す。
   永続データは持たない。間違えた語は単語のお気に入り（vocabFav）にまとめて入れられる。 */
let genderSession = null;
let genderConf = {lv:"all", n:20};
const GENDER_LEVELS = [{id:"all",label:"すべて"},{id:"A1",label:"A1"},{id:"A2",label:"A2"},{id:"B1",label:"B1"},{id:"B2",label:"B2"},{id:"C",label:"C1・C2"}];
// 語尾の傾向（長い語尾から照合する）。あくまで「多い」という傾向で、例外は答え合わせで明示する。
const GENDER_RULES = [
  ["tion","f","-tion で終わる語はほぼ女性"], ["sion","f","-sion で終わる語はほぼ女性"],
  ["ette","f","-ette で終わる語はほぼ女性"], ["euse","f","-euse で終わる語は女性"],
  ["ance","f","-ance で終わる語はほぼ女性"], ["ence","f","-ence で終わる語はほぼ女性（例外：silence）"],
  ["isme","m","-isme で終わる語は男性"], ["ment","m","-ment で終わる語はほぼ男性"],
  ["ure","f","-ure で終わる語はほぼ女性"], ["ade","f","-ade で終わる語は女性が多い（例外：stade, grade）"],
  ["ude","f","-ude で終わる語は女性が多い（例外：coude）"], ["ise","f","-ise で終わる語は女性が多い（例外：malaise）"],
  ["age","m","-age で終わる語はほぼ男性（例外：page, plage, image, cage, nage, rage）"],
  ["eau","m","-eau で終わる語はほぼ男性（例外：eau, peau）"],
  ["oir","m","-oir で終わる語は男性"], ["ier","m","-ier で終わる語は男性が多い"],
  ["ail","m","-ail で終わる語は男性"], ["eil","m","-eil で終わる語は男性"],
  ["té","f","-té で終わる語はほぼ女性（例外：été, côté, comité, pâté）"], ["ée","f","-ée で終わる語は女性が多い（例外：musée, lycée, trophée, apogée）"],
  ["ie","f","-ie で終わる語はほぼ女性（例外：parapluie, incendie, génie）"], ["at","m","-at で終わる語は男性が多い"],
];
function genderRuleOf(word){
  if(/\s/.test(word)) return null;            // 複数語の見出し語は語尾の傾向を当てはめない
  const w = word.toLowerCase();
  return GENDER_RULES.find(r=>w.endsWith(r[0])) || null;
}
function genderPool(lv){
  const m = defaultCardById(), out = [];
  Object.keys(m).forEach(id=>{
    const c = m[id];
    if(c.pos !== "NOM" || !c.fr || !c.gram) return;
    const g = String(c.gram).trim();
    if(!/^(男性|女性)/.test(g)) return;
    if(/男女|意味が変わる/.test(g)) return;
    if(/^(男性|女性)・?複数(のみ)?$/.test(g)) return;
    const lvl = String(c.level||"");
    if(lv !== "all" && (lv === "C" ? !/^C/.test(lvl) : lvl !== lv)) return;
    out.push({id, g: /^男性/.test(g) ? "m" : "f"});
  });
  return out;
}
function openGenderHome(){
  try{ openGenderHomeInner(); }
  catch(e){ showErrorBanner("名詞の性ドリルの表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openGenderHomeInner(){
  genderSession = null;
  titleEl.textContent = "名詞の性ドリル";
  setBack(renderHome, "ホーム");
  const C = genderConf;
  let h = `<div class="card">
    <p class="small" style="margin:0 0 6px">名詞を見て、男性か女性かを選ぶ。</p>
    <p class="small muted" style="margin:0">答えると、冠詞付きの形と語尾の傾向（-tion はほぼ女性、-age はほぼ男性、など）が出る。問題は単語データの名詞から自動で作る。</p>
  </div>
  <div class="card"><h2 style="margin-top:0">レベル</h2><div class="tone-cats" style="grid-template-columns:repeat(3,minmax(0,1fr))">`;
  GENDER_LEVELS.forEach(L=>{
    h += `<button class="btn ${C.lv===L.id?"primary":""}" onclick="genderConf.lv='${L.id}';openGenderHome()">${esc(L.label)}<small>${genderPool(L.id).length}語</small></button>`;
  });
  h += `</div><h2>問題数</h2><div class="actions" style="margin-top:0">
    ${[10,20,30].map(k=>`<button class="btn ${C.n===k?"primary":""}" onclick="genderConf.n=${k};openGenderHome()">${k}問</button>`).join("")}
  </div>
  <div class="actions"><button class="btn primary" onclick="startGender()">始める</button></div></div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function startGender(list){
  try{
    const items = list || shuffle(genderPool(genderConf.lv)).slice(0, genderConf.n);
    if(!items.length){ alert("出題できる名詞がない。"); return; }
    genderSession = {items, idx:0, answered:null, results:[]};
    renderGender();
  }catch(e){ showErrorBanner("名詞の性ドリルの開始でエラー： " + e.message); }
}
function renderGender(){
  try{ renderGenderInner(); }
  catch(e){ showErrorBanner("名詞の性ドリルの表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function genderAnswerHtml(q){
  const c = getCard(q.id);
  const art = nounArticle(c);
  const def = art ? art.art + art.sep + c.fr : c.fr;
  const indef = (q.g === "m" ? "un " : "une ") + c.fr;
  const rule = genderRuleOf(c.fr);
  let h = `<div class="gd-ans">${esc(def)} <button class="btn small" onclick="speakFr('${esc(nounSpeakText(c)).replace(/'/g,"\\'")}')">🔊</button></div>
    <div class="small" style="text-align:center">${q.g==="m"?"男性":"女性"}・${esc(indef)}</div>`;
  const extra = String(c.gram).replace(/^(男性|女性)[・\s]*/,"").trim();
  if(extra) h += `<div class="small muted" style="text-align:center;margin-top:2px">${esc(extra)}</div>`;
  if(rule){
    const exc = rule[1] !== q.g;
    h += `<div class="small" style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${exc?"var(--bad-weak)":"var(--accent-weak)"}">${esc(rule[2])}${exc ? "。<b>この語は例外</b>" : ""}</div>`;
  }
  return h;
}
function renderGenderInner(){
  const S = genderSession;
  if(!S) return openGenderHome();
  if(S.idx >= S.items.length) return renderGenderResult();
  const q = S.items[S.idx], c = getCard(q.id);
  titleEl.textContent = `名詞の性 ${S.idx+1} / ${S.items.length}`;
  setBack(openGenderHome, "やめる");
  const cls = g => S.answered === null ? "" : (g === q.g ? "ok" : (S.answered === g ? "ng" : ""));
  let h = `<div class="card">
    <div class="gd-word">${esc(c.fr)}</div>
    <div class="gd-ja">${esc(c.ja||c.back||"")}</div>
    <div class="gd-btns choices">
      <button class="choice ${cls("m")}" data-i="0" ${S.answered!==null?"disabled":""} onclick="answerGender(0)">男性<small>le / un</small></button>
      <button class="choice ${cls("f")}" data-i="1" ${S.answered!==null?"disabled":""} onclick="answerGender(1)">女性<small>la / une</small></button>
    </div>`;
  if(S.answered !== null){
    h += genderAnswerHtml(q);
    h += `<div class="actions"><button class="btn primary" id="gdNext" onclick="nextGender()">${S.idx+1 >= S.items.length ? "結果を見る" : "次へ"}</button></div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
  mcqChoiceHandler = answerGender;      // PCでは 1（男性）／2（女性）キーでも答えられる
  document.onkeydown = mcqKeyHandler;
  const nb = document.getElementById("gdNext"); if(nb) nb.focus();
}
function answerGender(i){
  const S = genderSession; if(!S || S.answered !== null) return;
  const q = S.items[S.idx], g = i === 0 ? "m" : "f";
  S.answered = g;
  S.results.push({q, correct: g === q.g});
  renderGender();
}
function nextGender(){
  const S = genderSession; if(!S) return;
  S.idx++; S.answered = null;
  renderGender();
}
function renderGenderResult(){
  const S = genderSession;
  titleEl.textContent = "名詞の性 結果";
  setBack(openGenderHome, "名詞の性ドリル");
  const nOk = S.results.filter(r=>r.correct).length;
  const miss = S.results.filter(r=>!r.correct);
  let h = `<div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:600">${nOk} / ${S.results.length}</div>
    <div class="muted small">${miss.length ? "間違えた名詞" : "全問正解"}</div>
  </div>`;
  if(miss.length){
    h += `<div class="card" style="padding:12px 14px">`;
    miss.forEach(r=>{
      const c = getCard(r.q.id), art = nounArticle(c), rule = genderRuleOf(c.fr);
      h += `<div class="spread" style="padding:6px 0;border-bottom:1px solid var(--line)">
        <span><span class="tone-fr">${esc(art ? art.art + art.sep + c.fr : c.fr)}</span> <span class="small muted">${r.q.g==="m"?"男性":"女性"}・${esc(c.ja||"")}</span>
        ${rule && rule[1] !== r.q.g ? `<br><span class="small" style="color:var(--bad)">語尾の傾向の例外</span>` : ""}</span>
        <button class="btn small" onclick="speakFr('${esc(nounSpeakText(c)).replace(/'/g,"\\'")}')">🔊</button>
      </div>`;
    });
    h += `</div>`;
  }
  window._genderRetry = miss.map(r=>r.q);
  h += `<div class="actions">
    ${miss.length ? `<button class="btn primary" onclick="startGender(window._genderRetry)">間違えた${miss.length}語をもう一度</button>
    <button class="btn" id="gdFavBtn" onclick="genderAddFav()">間違えた名詞を単語のお気に入りに入れる</button>` : ""}
    <button class="btn ${miss.length?"":"primary"}" onclick="startGender()">新しく${genderConf.n}問</button>
    <button class="btn" onclick="openGenderHome()">設定に戻る</button>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function genderAddFav(){
  const ids = (window._genderRetry||[]).map(q=>q.id);
  let added = 0;
  ids.forEach(id=>{ if(!state.vocabFav[id]){ state.vocabFav[id] = true; added++; } });
  save();
  const b = document.getElementById("gdFavBtn");
  if(b){ b.disabled = true; b.textContent = added ? `お気に入りに${added}語入れた` : "すでに全部お気に入りに入っている"; }
}

/* ---------- コミュニケーション・トーン選択のAI生成 ----------
   文法のAI生成と同じ一往復パターン。アプリは外部APIを呼ばず、プロンプトを作って表示し、
   貼り戻されたJSONを1問ずつ検証して取り込むだけ。
   ・並べ替え：state.aiCommDrills（タスクごと）。正しい順番が1通りに決まる問題を作らせる
   ・トーン選択：state.aiTone（分野ごと）。ちょうどいい選択肢は必ず1つ、「丁寧なほど正解」にしない */
function aiParseResponse(raw){
  if(!raw || !raw.trim()) throw new Error("AIの返答が貼り付けられていない。");
  const tryParse = s => { try{ return JSON.parse(s); }catch(e){ return null; } };
  let data = null;
  const j1 = extractJsonFromText(raw); if(j1) data = tryParse(j1);
  if(!data){ const j2 = extractJsonFromText(unsmartenQuotes(raw)); if(j2) data = tryParse(j2); }
  if(!data) throw new Error("JSONとして読み取れなかった。AIの返答をそのまま全部貼り付けているか確認して。");
  if(data.status === "quality_error") throw new Error("AIが「質を保てない」と返した：" + (data.reason||"理由の記載なし") + "。問題数を減らすか、別のAIで試して。");
  if(data.status && data.status !== "ok") throw new Error("AIの返答がエラーだった：" + (data.reason||data.status));
  return data;
}
function aiSituLines(conf, L){
  const situ = AI_SITU.find(x=>x.id===conf.situ) || AI_SITU[0];
  L.push(`- ${situ.desc}。`);
  if((conf.free||"").trim()) L.push(`- 特に「${conf.free.trim()}」の場面を中心にする。`);
  L.push("- 特定の業界（製造業、設備保全など）の専門的な場面に偏らせない。");
}
function aiConfButtonsHtml(conf, confVar, counts, reopen){
  return `<h2>問題数</h2><div class="actions" style="margin-top:0">
      ${counts.map(k=>`<button class="btn ${conf.n===k?"primary":""}" onclick="${confVar}.n=${k};${reopen}">${k}問</button>`).join("")}
    </div>`;
}
function aiSituButtonsHtml(conf, confVar, reopen){
  return `<h2>例文のシチュエーション</h2><div class="actions" style="margin-top:0">
      ${AI_SITU.map(x=>`<button class="btn ${conf.situ===x.id?"primary":""}" onclick="${confVar}.situ='${x.id}';${reopen}">${esc(x.label)}</button>`).join("")}
    </div>
    <input type="text" value="${esc(conf.free)}" placeholder="場面を指定する（任意。例：レストラン、面接）" style="margin-top:8px" oninput="${confVar}.free=this.value" autocorrect="off" autocapitalize="off" spellcheck="false">`;
}
function aiPasteCardHtml(importCall){
  return `<div class="card">
    <h2 style="margin-top:0">AIの答えを貼り付ける</h2>
    <textarea id="aiResponse" placeholder="AIの返答をここに貼り付け" style="min-height:140px" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
    <div class="actions"><button class="btn primary" onclick="${importCall}">取り込む</button></div>
    <div id="aiImportMsg"></div>
  </div>`;
}
function aiShowPrompt(txt){
  document.getElementById("aiPromptBox").innerHTML = `<pre class="copybox" id="aiPtxt" style="max-height:220px;overflow:auto">${esc(txt)}</pre>
    <div class="actions"><button class="btn primary" onclick="copyText(document.getElementById('aiPtxt').textContent, this)">プロンプトをコピー</button></div>`;
}

/* --- 並べ替え --- */
let commAiConf = {n:5, situ:"mix", free:""};
function openCommAiGen(taskId){
  try{
    const t = commTask(taskId); if(!t) return openCommHome();
    titleEl.textContent = "並べ替え問題を増やす";
    setBack(()=>openCommTask(taskId), t.title);
    const re = `openCommAiGen('${taskId}')`;
    el.innerHTML = `<div class="card">
      <div class="small muted">${esc(t.title)}</div>
      ${aiConfButtonsHtml(commAiConf, "commAiConf", [3,5,10], re)}
      ${aiSituButtonsHtml(commAiConf, "commAiConf", re)}
      <div class="actions"><button class="btn primary" onclick="aiShowPrompt(buildCommAiPrompt('${taskId}'))">プロンプトを作る</button></div>
      <div id="aiPromptBox"></div>
    </div>` + aiPasteCardHtml(`importCommAiDrills('${taskId}')`);
    window.scrollTo(0,0);
  }catch(e){ showErrorBanner("並べ替えのAI生成画面でエラー： " + e.message); }
}
function buildCommAiPrompt(taskId){
  const t = commTask(taskId), C = commAiConf;
  const L = [];
  L.push("あなたは日本語話者にフランス語を教える経験豊富な教師です。次のコミュニケーション場面について、「発話の並べ替え問題」を作ってください。");
  L.push("学習者は、シャッフルされたフランス語の発話を、自然な順番にタップして並べます。");
  L.push("");
  L.push("# 場面");
  L.push(`- ${t.title}（${t.sub}）`);
  L.push(`- ${t.situation_ja}`);
  L.push("");
  L.push("# 話の自然な流れ（この順番で並ぶ）");
  (t.flow||[]).forEach(f=>L.push(`- ${f.part}：${f.ja}`));
  L.push("");
  L.push("# この場面で使う表現（なるべく使う）");
  (t.roles||[]).forEach(r=>L.push(`- ${r.title}：` + r.items.map(it=>it.std).join(" ／ ")));
  L.push("");
  L.push("# シチュエーション");
  aiSituLines(C, L);
  L.push("");
  L.push(`# 作る数：${C.n}問`);
  L.push("");
  L.push("# ルール");
  L.push("- 1問は4〜5文のフランス語の発話。1文ずつ独立した文にする。");
  L.push("- 正しい順番が1通りに決まるようにする。話の流れやつなぎ語（d'abord、ensuite、donc、enfin など）、前の文を受ける代名詞で順番が分かるようにし、どの2文を入れ替えても不自然になるようにする。");
  L.push("- ja には、その問題の場面を日本語で短く書く（例：同僚に書類のチェックを頼む）。");
  L.push("- 自然で正しいフランス語にする。くだけた言い方や俗語は使わない。");
  L.push("- 下の既存の問題と同じ場面・同じ文は作らない。");
  L.push("");
  L.push("# 既存の問題（重複させない）");
  commDrills(taskId).forEach(d=>L.push(`- ${d.ja}：${d.sentences[0]}`));
  L.push("");
  L.push("# 出力前の自己点検");
  L.push("1問ずつ、順番が1通りに決まるか（入れ替えても成り立つ2文がないか）、文法と語彙が自然か、場面の指定を守っているかを確認し、問題があれば直すか削除する。3問未満しか作れない場合は {\"status\":\"quality_error\",\"reason\":\"理由\"} だけを返す。");
  L.push("");
  L.push("# 出力形式");
  L.push("JSONだけを出力する。前置きや説明は書かない。sentences は正しい順番で並べる。");
  L.push(`{"status":"ok","schema":"fr-comm-order-v1","task_id":"${taskId}","drills":[{"ja":"場面","sentences":["文1","文2","文3","文4"]}]}`);
  return L.join("\n");
}
function importCommAiDrills(taskId){
  const msg = document.getElementById("aiImportMsg");
  try{
    const data = aiParseResponse(document.getElementById("aiResponse").value);
    if(data.task_id && data.task_id !== taskId) throw new Error("別のタスク用の返答になっている。このタスクのプロンプトで作り直して。");
    if(!Array.isArray(data.drills) || !data.drills.length) throw new Error("drills（問題の一覧）が見つからない。");
    const seen = new Set(commDrills(taskId).map(d=>aiNorm(d.sentences[0])));
    const ok = [], ng = [], stamp = Date.now().toString(36);
    data.drills.forEach((d,k)=>{
      const ja = String((d&&d.ja)||"").trim();
      const ss = Array.isArray(d&&d.sentences) ? d.sentences.map(x=>String(x||"").trim()).filter(Boolean) : [];
      if(!ja){ ng.push(`${k+1}問目：場面（ja）がない`); return; }
      if(ss.length < 3 || ss.length > 6){ ng.push(`${k+1}問目：文の数が3〜6ではない`); return; }
      if(new Set(ss.map(aiNorm)).size !== ss.length){ ng.push(`${k+1}問目：同じ文が重複している`); return; }
      if(seen.has(aiNorm(ss[0]))){ ng.push(`${k+1}問目：既存の問題と同じ`); return; }
      seen.add(aiNorm(ss[0]));
      ok.push({id:`ai_${taskId}_${stamp}_${k}`, task_id:taskId, ja, sentences:ss, ai:true, createdAt:Date.now()});
    });
    if(!ok.length) throw new Error("取り込める問題がなかった。<br>" + ng.map(esc).join("<br>"));
    ok.forEach(d=>{ state.aiCommDrills[d.id] = d; });
    save();
    document.getElementById("aiResponse").value = "";
    msg.innerHTML = `<p class="small"><b>${ok.length}問を取り込んだ。</b>タスクの「発話の並べ替え」に追加された。</p>
      ${ng.length ? `<p class="small muted">取り込めなかった ${ng.length}問：<br>${ng.map(esc).join("<br>")}</p>` : ""}
      <div class="actions"><button class="btn primary" onclick="openCommTask('${taskId}')">タスクに戻る</button></div>`;
  }catch(e){ msg.innerHTML = `<p class="small" style="color:var(--bad)">${e.message}</p>`; }
}
function deleteAiCommDrill(taskId, id){
  if(!confirm("このAI生成の問題を削除する？")) return;
  delete state.aiCommDrills[id]; save();
  const y = window.scrollY; openCommTask(taskId); window.scrollTo(0,y);
}

/* --- トーン選択 --- */
let toneAiConf = {n:10, cat:"daily", free:""};
function openToneAiGen(){
  try{
    titleEl.textContent = "トーン選択の問題を増やす";
    setBack(openToneHome, "トーン選択");
    const C = toneAiConf;
    el.innerHTML = `<div class="card">
      <h2 style="margin-top:0">分野</h2><div class="tone-cats">
        ${(TONE.cats||[]).map(c=>`<button class="btn ${C.cat===c.id?"primary":""}" onclick="toneAiConf.cat='${c.id}';openToneAiGen()">${esc(c.title)}</button>`).join("")}
      </div>
      ${aiConfButtonsHtml(C, "toneAiConf", [5,10,20], "openToneAiGen()")}
      <input type="text" value="${esc(C.free)}" placeholder="場面を指定する（任意。例：病院、面接、義理の家族）" style="margin-top:8px" oninput="toneAiConf.free=this.value" autocorrect="off" autocapitalize="off" spellcheck="false">
      <div class="actions"><button class="btn primary" onclick="aiShowPrompt(buildToneAiPrompt())">プロンプトを作る</button></div>
      <div id="aiPromptBox"></div>
    </div>` + aiPasteCardHtml("importToneAi()");
    window.scrollTo(0,0);
  }catch(e){ showErrorBanner("トーン選択のAI生成画面でエラー： " + e.message); }
}
const TONE_CAT_DESC = {
  daily:"日常生活（店、レストラン、道を聞く、窓口、近所づきあい、電話など）",
  work:"業種を問わない仕事の場面（上司、同僚、取引先、会議、面接、メール、顧客対応など）",
  tuvous:"tu と vous の使い分け（初対面、子ども、友人、上司に tu を提案される前と後、店員、客など）",
  written:"話し言葉と書き言葉の使い分け（報告書、論説、手紙、会話の時制や倒置など）"
};
function buildToneAiPrompt(){
  const C = toneAiConf;
  const cat = (TONE.cats||[]).find(c=>c.id===C.cat) || TONE.cats[0];
  const seeds = cat.items.slice(0,2).map(it=>({situ:it.situ, opts:it.opts}));
  const L = [];
  L.push("あなたは日本語話者にフランス語を教える経験豊富な教師です。「場面に合う言い方を選ぶ」問題を作ってください。");
  L.push("学習者は、日本語の場面を読み、3つのフランス語から一番合う言い方を選びます。");
  L.push("");
  L.push(`# 分野：${cat.title}`);
  L.push(`- ${TONE_CAT_DESC[cat.id] || cat.title}`);
  if((C.free||"").trim()) L.push(`- 特に「${C.free.trim()}」の場面を中心にする。`);
  L.push("- 特定の業界（製造業、設備保全など）の専門的な場面に偏らせない。");
  L.push("");
  L.push(`# 作る数：${C.n}問`);
  L.push("");
  L.push("# ルール");
  L.push("- situ は日本語で具体的な場面（誰に・何をするか）を書く。");
  L.push("- opts は3つ。tag は次のどれか：ok（その場面にちょうどいい）、casual（くだけすぎ）、stiff（硬すぎ・大げさ）、blunt（きつすぎ・失礼）。");
  L.push("- ok はちょうど1つだけ。残り2つは casual / stiff / blunt から選び、できるだけ違う種類にする。");
  L.push("- 「丁寧なほど正解」にしない。コーヒーの注文なら標準的な言い方が ok で大げさな敬語は stiff、行政への申請書なら格式ある言い方が ok になる、というように場面で正解が変わるようにする。標準的な言い方がそのまま ok になる問題も混ぜる。");
  L.push("- ok の選択肢は自然で正しいフランス語にする。casual の選択肢は実際に耳にする言い方にする（明らかな文法の誤りにはしない）。");
  L.push("- note は日本語で1文、なぜ合う・合わないかを書く。");
  L.push("- 下の既存の場面と同じものは作らない。");
  L.push("");
  L.push("# 既存の場面（重複させない）");
  tonePool(cat.id).forEach(it=>L.push("- " + it.situ));
  L.push("");
  L.push("# お手本（形式の見本。内容はまねしない）");
  L.push(JSON.stringify(seeds, null, 1));
  L.push("");
  L.push("# 出力前の自己点検");
  L.push("1問ずつ、ok がちょうど1つか、ok 以外の選択肢が本当にその場面で合わないか、フランス語が自然か、note が的確かを確認し、問題があれば直すか削除する。3問未満しか作れない場合は {\"status\":\"quality_error\",\"reason\":\"理由\"} だけを返す。");
  L.push("");
  L.push("# 出力形式");
  L.push("JSONだけを出力する。前置きや説明は書かない。");
  L.push(`{"status":"ok","schema":"fr-tone-v1","cat":"${cat.id}","items":[{"situ":"場面","opts":[{"fr":"…","tag":"ok","note":"…"},{"fr":"…","tag":"casual","note":"…"},{"fr":"…","tag":"stiff","note":"…"}]}]}`);
  return L.join("\n");
}
function importToneAi(){
  const msg = document.getElementById("aiImportMsg");
  try{
    const C = toneAiConf;
    const data = aiParseResponse(document.getElementById("aiResponse").value);
    const catId = data.cat || C.cat;
    if(!(TONE.cats||[]).some(c=>c.id===catId)) throw new Error("分野（cat）が不明：" + esc(String(catId)));
    if(!Array.isArray(data.items) || !data.items.length) throw new Error("items（問題の一覧）が見つからない。");
    const seen = new Set(tonePool(catId).map(it=>aiNorm(it.situ)));
    const TAGS = ["ok","casual","stiff","blunt"];
    const ok = [], ng = [], stamp = Date.now().toString(36);
    data.items.forEach((it,k)=>{
      const situ = String((it&&it.situ)||"").trim();
      const opts = Array.isArray(it&&it.opts) ? it.opts.map(o=>({fr:String((o&&o.fr)||"").trim(), tag:String((o&&o.tag)||"").trim(), note:String((o&&o.note)||"").trim()})) : [];
      if(!situ){ ng.push(`${k+1}問目：場面（situ）がない`); return; }
      if(opts.length !== 3){ ng.push(`${k+1}問目：選択肢が3つではない`); return; }
      if(opts.some(o=>!o.fr)){ ng.push(`${k+1}問目：空の選択肢がある`); return; }
      if(opts.some(o=>!TAGS.includes(o.tag))){ ng.push(`${k+1}問目：tag が ok / casual / stiff / blunt 以外`); return; }
      if(opts.filter(o=>o.tag==="ok").length !== 1){ ng.push(`${k+1}問目：ok の選択肢が1つではない`); return; }
      if(new Set(opts.map(o=>aiNorm(o.fr))).size !== 3){ ng.push(`${k+1}問目：選択肢が重複している`); return; }
      if(seen.has(aiNorm(situ))){ ng.push(`${k+1}問目：既存の場面と同じ`); return; }
      seen.add(aiNorm(situ));
      ok.push({id:`ai_tone_${stamp}_${k}`, cat:catId, situ, opts, ai:true, createdAt:Date.now()});
    });
    if(!ok.length) throw new Error("取り込める問題がなかった。<br>" + ng.map(esc).join("<br>"));
    ok.forEach(it=>{ state.aiTone[it.id] = it; });
    save();
    document.getElementById("aiResponse").value = "";
    toneConf.cat = catId;
    msg.innerHTML = `<p class="small"><b>${ok.length}問を取り込んだ。</b>この分野の出題に混ざる。</p>
      ${ng.length ? `<p class="small muted">取り込めなかった ${ng.length}問：<br>${ng.map(esc).join("<br>")}</p>` : ""}
      <div class="actions"><button class="btn primary" onclick="openToneHome()">トーン選択に戻る</button></div>`;
  }catch(e){ msg.innerHTML = `<p class="small" style="color:var(--bad)">${e.message}</p>`; }
}
function openToneAiList(){
  try{
    titleEl.textContent = "AI生成の問題";
    setBack(openToneHome, "トーン選択");
    const all = Object.values(state.aiTone||{}).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    let h = `<div class="card"><div class="small">${all.length}問。削除すると出題されなくなる。</div></div>`;
    all.forEach(it=>{
      const c = (TONE.cats||[]).find(x=>x.id===it.cat) || {title:""};
      const okOpt = it.opts.find(o=>o.tag==="ok");
      h += `<div class="card" style="padding:12px 14px">
        <div><span class="pill">${esc(c.title)}</span></div>
        <div style="margin:6px 0 2px;font-weight:600">${esc(it.situ)}</div>
        <div class="small"><span class="tone-tag ok">ちょうどいい</span><span class="tone-fr">${esc(okOpt ? okOpt.fr : "")}</span></div>
        <div class="actions" style="margin-top:6px"><button class="btn small" onclick="deleteAiTone('${it.id}')">削除</button></div>
      </div>`;
    });
    el.innerHTML = h;
  }catch(e){ showErrorBanner("AI生成問題の一覧でエラー： " + e.message); }
}
function deleteAiTone(id){
  if(!confirm("この問題を削除する？")) return;
  delete state.aiTone[id]; save();
  const y = window.scrollY; openToneAiList(); window.scrollTo(0,y);
}

/* ---------- 慣用句 ----------
   テーマ別の慣用句（expressions imagées）。各表現に意味・直訳・注記・例文。
   くだけたもの（reg: "fam"）は「聞いて分かればいい」扱いで、カード学習（SRS）の対象から外す。
   一覧と検索には出す。カードは単語と同じSRS（id接頭辞 idi_）、例文の☆は exampleFav（idiex_）。 */
let _idiomCardById = null, _idiomThemeById = null;
function ensureIdiomIndex(){
  if(_idiomCardById) return;
  _idiomCardById = {}; _idiomThemeById = {};
  (IDIOMS.themes||[]).forEach(t=>{
    _idiomThemeById[t.id] = t;
    (t.items||[]).forEach(it=>{
      _idiomCardById[it.id] = {id:it.id, idiom:true, themeId:t.id, themeTitle:t.title,
        front:it.expr, fr:it.expr, back:it.ja, ja:it.ja, lit:it.lit, reg:it.reg, note:it.note, exFr:it.exFr, exJa:it.exJa};
    });
  });
}
function idiomCardById(){ ensureIdiomIndex(); return _idiomCardById; }
function idiomTheme(tid){ ensureIdiomIndex(); return _idiomThemeById[tid]; }
function idiomStudyIds(themeId){
  const m = idiomCardById();
  return Object.keys(m).filter(id=>m[id].reg==="std" && (!themeId || m[id].themeId===themeId));
}
function idiomRegPill(reg){
  return reg === "fam" ? `<span class="pill idi-fam">くだけた・聞いて分かればいい</span>` : `<span class="pill idi-std">使える</span>`;
}
function idiomItemBodyHtml(c){
  const exId = "idiex_" + c.id;
  const on = !!state.exampleFav[exId];
  return `
    <div class="sout-main">${esc(c.fr)} ${soutSpeakBtn(c.fr)}</div>
    <div style="margin:2px 0 2px"><b>${esc(c.ja)}</b></div>
    ${c.lit ? `<div class="idi-lit">直訳：${esc(c.lit)}</div>` : ""}
    ${c.note ? `<div class="sout-note">${esc(c.note)}</div>` : ""}
    <div class="ex" style="margin-top:10px">
      <div class="spread">
        <div class="f sout-ex">${wrapTapWords(soutTypo(c.exFr))}&nbsp;${soutSpeakBtn(c.exFr)}</div>
        <button class="fav-btn ${on?"on":""}" onclick="toggleIdiomExampleFav('${c.id}')" title="例文を保存">${on?"★":"☆"}</button>
      </div>
      <div class="j">${esc(c.exJa)}</div>
    </div>`;
}
function idiomItemCardHtml(c, showTheme){
  return `<div class="card" style="padding:14px 16px">
    <div style="margin-bottom:4px">${idiomRegPill(c.reg)}${showTheme ? `<span class="pill">${esc(c.themeTitle)}</span>` : ""}</div>
    ${idiomItemBodyHtml(c)}
  </div>`;
}
let _idiomView = null;
function toggleIdiomExampleFav(id){
  try{
    const c = getCard(id); if(!c || !c.idiom) return;
    toggleExampleFav("idiex_" + id, {kind:"idiom", label:"慣用句・" + c.themeTitle, fr:c.exFr, jp:c.exJa, en:"", refWord:c.fr});
    if(vocabSession) return renderVocabCard();
    if(document.getElementById("exampleFavList")) return renderExampleFavList();
    const y = window.scrollY;
    if(_idiomView && _idiomView.type === "search") renderSearchResults();
    else if(_idiomView && _idiomView.type === "theme") openIdiomTheme(_idiomView.id, true);
    else if(_idiomView && _idiomView.type === "home"){ const q = (document.getElementById("idiSearch")||{}).value || ""; openIdiomHome(true); if(q){ document.getElementById("idiSearch").value = q; renderIdiomSearch(q); } }
    window.scrollTo(0,y);
  }catch(e){ showErrorBanner("例文の保存でエラー： " + e.message); }
}
function startIdiomStudy(themeId, mode){
  const t = themeId ? idiomTheme(themeId) : null;
  const ids = idiomStudyIds(themeId);
  const back = t ? {fn:()=>openIdiomTheme(themeId), label:"「" + t.title + "」"} : {fn:()=>openIdiomHome(), label:"慣用句"};
  const modeJa = mode === "new" ? "新しく覚える" : mode === "due" ? "復習" : "全部";
  startVocabStudy(ids, mode, `${t ? t.title : "慣用句"}（${modeJa}）`, back);
}
function idiomStudyButtonsHtml(themeId){
  const ids = idiomStudyIds(themeId);
  const p = commProgressOf(ids);
  const arg = themeId ? `'${themeId}'` : "''";
  return `<div class="actions" style="margin-top:8px">
    <button class="btn primary" ${p.fresh?"":"disabled"} onclick="startIdiomStudy(${arg},'new')">新しく覚える（${Math.min(p.fresh, NEW_CARDS_PER_SESSION)}）</button>
    <button class="btn" ${p.due?"":"disabled"} onclick="startIdiomStudy(${arg},'due')">復習（${p.due}）</button>
    <button class="btn" onclick="startIdiomStudy(${arg},'all')">全部カードで</button>
  </div>
  <div class="small muted" style="margin-top:6px">カードで学習済み ${p.learned} / ${p.total}（「使える」表現のみ）</div>`;
}
function openIdiomHome(keepScroll){
  try{
    _idiomView = {type:"home"};
    titleEl.textContent = "慣用句";
    setBack(renderHome, "ホーム");
    const all = Object.values(idiomCardById());
    let h = `<div class="card">
      <p class="small" style="margin:0 0 8px">イメージで意味を表す決まった言い回し。直訳を見ると覚えやすい。</p>
      <div class="small muted" style="line-height:1.9">${idiomRegPill("std")} 会話やメールで普通に使える<br>${idiomRegPill("fam")} 友人同士のくだけた言い方。自分で使う必要はないので、カード学習からは外してある</div>
      ${idiomStudyButtonsHtml("")}
    </div>
    <div class="card" style="padding:12px 14px">
      <input type="text" id="idiSearch" placeholder="検索（フランス語・日本語どちらでも）" oninput="renderIdiomSearch(this.value)" autocorrect="off" autocapitalize="off" spellcheck="false">
    </div>
    <div id="idiSearchResult"></div><div id="idiThemes">
    <div class="small muted" style="margin:4px 0 8px">全${all.length}表現（使える ${all.filter(c=>c.reg==="std").length}・くだけた ${all.filter(c=>c.reg==="fam").length}）</div>`;
    (IDIOMS.themes||[]).forEach(t=>{
      const p = commProgressOf(idiomStudyIds(t.id));
      h += `<button class="card sout-cat" style="padding:12px 14px" onclick="openIdiomTheme('${t.id}')">
        <div class="spread"><b>${esc(t.title)}</b><span class="small muted">${t.items.length}表現</span></div>
        <div class="small muted" style="margin-top:4px">学習済み ${p.learned}/${p.total}${p.due ? `・復習 ${p.due}` : ""}</div>
      </button>`;
    });
    h += `</div>`;
    el.innerHTML = h;
    if(!keepScroll) window.scrollTo(0,0);
  }catch(e){ showErrorBanner("慣用句の表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function renderIdiomSearch(q){
  const box = document.getElementById("idiSearchResult"), th = document.getElementById("idiThemes");
  if(!box) return;
  const nq = soutNorm(q).trim();
  if(!nq){ box.innerHTML = ""; if(th) th.style.display = ""; return; }
  if(th) th.style.display = "none";
  const hits = Object.values(idiomCardById()).filter(c=>[c.fr, c.ja, c.lit, c.note, c.exFr, c.exJa].some(t=>soutNorm(t).indexOf(nq) >= 0));
  box.innerHTML = `<p class="small muted" style="margin:4px 0 8px">${hits.length}件</p>` + hits.map(c=>idiomItemCardHtml(c, true)).join("");
}
function openIdiomTheme(themeId, keepScroll){
  try{
    const t = idiomTheme(themeId); if(!t) return openIdiomHome();
    _idiomView = {type:"theme", id:themeId};
    titleEl.textContent = t.title;
    setBack(()=>openIdiomHome(), "慣用句");
    const m = idiomCardById();
    let h = `<div class="card">${idiomStudyButtonsHtml(themeId)}</div>`;
    h += t.items.map(it=>idiomItemCardHtml(m[it.id], false)).join("");
    el.innerHTML = h;
    if(!keepScroll) window.scrollTo(0,0);
  }catch(e){ showErrorBanner("慣用句の表示でエラー： " + e.message); }
}

/* ---------- 上品なフランス語（langage soutenu） ----------
   日常で使える丁寧で上品な言い方を、場面別に「標準的な言い方 → 上品な言い方」の形で並べる。
   くだけた言い方（俗語）は教材に入れない方針。対比の元になる std も標準形で書いてある。
   各表現は3段階（日常で使える／改まった場面／文語・読めればいい）のラベルと、
   自然に使える場面・浮く場面の注記を持つ。
   ・覚えたい表現は単語カードと同じSRS（gradeVocab）で回せる（getCard が SOUTENU からカードを組み立てる）
   ・例文の☆は「保存した構文・例文」（exampleFav、id接頭辞 soutex_）に合流。単語の復習用お気に入り
     （vocabFav）とは別物。 */
let _soutView = null; // 今開いている画面（☆の切り替え後に同じ画面を描き直すため）
// 表示用：フランス語の約物の前後の空白を改行しない空白にする（» や ? が行頭に孤立しないように）。
// データ自体は普通の空白のまま（検索・読み上げに影響させない）。
function soutTypo(t){ return String(t||"").replace(/« /g,"«\u00a0").replace(/ ([»?!:;])/g,"\u00a0$1"); }
function soutNorm(s){ return String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase(); }
function soutSpeakBtn(text){
  return `<button class="btn small" onclick="speakFr('${esc(text).replace(/'/g,"\\'")}')" title="発音を聞く">🔊</button>`;
}
// 表現1つ分の本文（カード裏・一覧で共通）
// 使用場面タグ（2026-09 レビュー提案）。「どこで使うと自然か」を前面に出し、
// 「普通の言い方で十分な場面」も併記して、硬すぎる言い方を避けられるようにする。
const SOUT_USE_ORDER = ["親しい相手にも","同僚・知人に","初対面・目上に","店・窓口で","正式な書面で","スピーチ・式典で","読めればいい"];
const SOUT_USE_ICON = {"親しい相手にも":"😊","同僚・知人に":"👥","初対面・目上に":"🤝","店・窓口で":"🏪","正式な書面で":"✉️","スピーチ・式典で":"🎤","読めればいい":"📖"};
function soutUsePills(c){
  return (c.use||[]).map(u=>`<span class="pill sout-use">${SOUT_USE_ICON[u]||""} ${esc(u)}</span>`).join("");
}
function soutenuItemBodyHtml(c){
  const exId = "soutex_" + c.id;
  const on = !!state.exampleFav[exId];
  return `
    ${(c.use||[]).length ? `<div style="margin:0 0 6px">${soutUsePills(c)}</div>` : ""}
    <div class="sout-main">${esc(soutTypo(c.sout))} ${soutSpeakBtn(c.sout)}</div>
    <div style="margin:2px 0 6px"><b>${esc(c.ja)}</b></div>
    <div class="sout-note"><b>自然に使える</b>${esc(c.ok)}</div>
    ${c.plain ? `<div class="sout-note"><b>普通で十分</b>${esc(c.plain)}</div>` : ""}
    ${c.ng ? `<div class="sout-note" style="color:var(--muted)"><b>注意</b>${esc(c.ng)}</div>` : ""}
    <div class="ex" style="margin-top:10px">
      <div class="spread">
        <div class="f sout-ex">${wrapTapWords(soutTypo(c.exFr))}&nbsp;${soutSpeakBtn(c.exFr)}</div>
        <button class="fav-btn ${on?"on":""}" onclick="toggleSoutenuExampleFav('${c.id}')" title="例文を保存">${on?"★":"☆"}</button>
      </div>
      <div class="j">${esc(c.exJa)}</div>
    </div>`;
}
function soutenuItemCardHtml(c, showCat){
  return `<div class="card" style="padding:14px 16px">
    <div class="spread" style="margin-bottom:4px">
      <span>${soutLvPill(c.lv)}${showCat ? `<span class="pill">${esc(c.catTitle)}</span>` : ""}</span>
    </div>
    <div class="sout-std">標準： ${esc(c.std || c.front)}</div>
    ${soutenuItemBodyHtml(c)}
  </div>`;
}
function toggleSoutenuExampleFav(id){
  try{
    const c = getCard(id);
    if(!c || !c.soutenu) return;
    toggleExampleFav("soutex_" + id, {kind:"soutenu", label:"上品なフランス語・" + c.catTitle, fr:c.exFr, jp:c.exJa, en:"", refWord:c.sout});
    if(vocabSession) return renderVocabCard();
    if(document.getElementById("exampleFavList")) return renderExampleFavList();
    rerenderSoutView();
  }catch(e){ showErrorBanner("例文の保存でエラー： " + e.message); }
}
function rerenderSoutView(){
  if(!_soutView) return;
  const y = window.scrollY;
  if(_soutView.type === "search"){ renderSearchResults(); window.scrollTo(0, y); return; }
  if(_soutView.type === "home") openSoutenuHomeInner(true);
  else if(_soutView.type === "cat") openSoutenuCatInner(_soutView.catId, true);
  window.scrollTo(0, y);
}
function soutProgressOf(ids){
  const learned = ids.filter(id=>state.vocabProgress[id]).length;
  return {learned, total: ids.length, due: vocabDueCount(ids), fresh: vocabNewCount(ids)};
}
function startSoutenuStudy(catId, mode){
  const cat = catId ? soutenuCat(catId) : null;
  const ids = cat ? soutenuCatIds(catId) : soutenuAllIds();
  const name = cat ? cat.title : "上品なフランス語";
  const back = cat ? {fn:()=>openSoutenuCat(catId), label:"「" + cat.title + "」"} : {fn:openSoutenuHome, label:"上品なフランス語"};
  const modeJa = mode === "new" ? "新しく覚える" : mode === "due" ? "復習" : "全部";
  startVocabStudy(ids, mode, `${name}（${modeJa}）`, back);
}
function soutStudyButtonsHtml(catId, ids){
  const p = soutProgressOf(ids);
  const arg = catId ? `'${catId}'` : "''";
  return `<div class="actions" style="margin-top:8px">
    <button class="btn primary" ${p.fresh?"":"disabled"} onclick="startSoutenuStudy(${arg},'new')">新しく覚える（${Math.min(p.fresh, NEW_CARDS_PER_SESSION)}）</button>
    <button class="btn" ${p.due?"":"disabled"} onclick="startSoutenuStudy(${arg},'due')">復習（${p.due}）</button>
    <button class="btn" onclick="startSoutenuStudy(${arg},'all')">全部カードで</button>
  </div>
  <div class="small muted" style="margin-top:6px">カードで学習済み ${p.learned} / ${p.total}</div>`;
}
function openSoutenuHome(){
  try{ openSoutenuHomeInner(false); }
  catch(e){ showErrorBanner("上品なフランス語の表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openSoutenuHomeInner(keepScroll){
  _soutView = {type:"home"};
  titleEl.textContent = "上品なフランス語";
  setBack(renderHome, "ホーム");
  const all = soutenuAllIds();
  const saved = Object.keys(state.exampleFav).filter(k=>k.indexOf("soutex_")===0).length;
  let h = `<div class="card">
    <p class="small" style="margin:0 0 8px">標準的な言い方を、日常でそのまま使える丁寧で上品な言い方に一段上げる。くだけた言い方は扱わない。</p>
    <div class="small muted" style="line-height:1.9">
      ${soutLvPill(1)} 仕事・店・窓口など普段の会話で自然に使える<br>
      ${soutLvPill(2)} 手紙・改まった場で。日常で多用すると硬い<br>
      ${soutLvPill(3)} 会話ではまず使わない。読んで分かれば十分
    </div>
    ${soutStudyButtonsHtml("", all)}
    <div class="actions" style="margin-top:8px"><button class="btn small" onclick="openToneHome()">🎯 場面に合う言い方を選ぶドリル</button></div>
    ${saved ? `<div class="actions" style="margin-top:8px"><button class="btn small" onclick="openExampleFavList()">保存した例文（${saved}）</button></div>` : ""}
  </div>
  <div class="card" style="padding:12px 14px">
    <input type="text" id="soutSearch" placeholder="検索（フランス語・日本語どちらでも）" oninput="renderSoutSearch(this.value)" autocorrect="off" autocapitalize="off" spellcheck="false">
    <div class="small muted" style="margin:10px 0 4px">使う場面で絞る</div>
    <div class="actions" style="margin-top:0">${SOUT_USE_ORDER.map(u=>{
      const n = soutenuAllIds().filter(id=>(soutenuCardById()[id].use||[]).includes(u)).length;
      return `<button class="cj-chip sout-use-chip" data-use="${esc(u)}" onclick="renderSoutScene(this.dataset.use)">${SOUT_USE_ICON[u]} ${esc(u)}（${n}）</button>`;
    }).join("")}</div>
  </div>
  <div id="soutSearchResult"></div>
  <div id="soutSections">`;
  (SOUTENU.sections||[]).forEach(sec=>{
    h += `<h3 style="margin:18px 0 4px">${esc(sec.title)}</h3><p class="small muted" style="margin:0 0 8px">${esc(sec.desc||"")}</p>`;
    (sec.cats||[]).forEach(cat=>{
      const n = (cat.items||[]).length;
      if(!n){
        h += `<div class="card sout-cat disabled" style="padding:12px 14px"><div class="spread"><b>${esc(cat.title)}</b><span class="small muted">準備中</span></div></div>`;
        return;
      }
      const p = soutProgressOf(cat.items.map(it=>it.id));
      h += `<button class="card sout-cat" style="padding:12px 14px" onclick="openSoutenuCat('${cat.id}')">
        <div class="spread"><b>${esc(cat.title)}</b><span class="small muted">${n}表現</span></div>
        ${cat.desc ? `<div class="small muted" style="margin-top:4px">${esc(cat.desc)}</div>` : ""}
        <div class="small muted" style="margin-top:4px">学習済み ${p.learned}/${p.total}${p.due ? `・復習 ${p.due}` : ""}</div>
      </button>`;
    });
  });
  h += `</div>`;
  el.innerHTML = h;
  if(!keepScroll) window.scrollTo(0,0);
}
let _soutScene = null;
function renderSoutScene(u){
  const box = document.getElementById("soutSearchResult");
  const secs = document.getElementById("soutSections");
  if(!box) return;
  _soutScene = (_soutScene === u) ? null : u;   // 同じ場面をもう一度押すと解除
  document.querySelectorAll(".sout-use-chip").forEach(b=>b.classList.toggle("on", b.dataset.use === _soutScene));
  const inp = document.getElementById("soutSearch"); if(inp) inp.value = "";
  if(!_soutScene){ box.innerHTML = ""; if(secs) secs.style.display = ""; return; }
  if(secs) secs.style.display = "none";
  const m = soutenuCardById();
  const hits = soutenuAllIds().map(id=>m[id]).filter(c=>(c.use||[]).includes(_soutScene));
  box.innerHTML = `<p class="small muted" style="margin:4px 0 8px">「${esc(_soutScene)}」で自然な言い方 ${hits.length}件</p>` + hits.map(c=>soutenuItemCardHtml(c, true)).join("");
}
function renderSoutSearch(q){
  _soutScene = null;
  document.querySelectorAll(".sout-use-chip").forEach(b=>b.classList.remove("on"));
  const box = document.getElementById("soutSearchResult");
  const secs = document.getElementById("soutSections");
  if(!box) return;
  const nq = soutNorm(q).trim();
  if(!nq){ box.innerHTML = ""; if(secs) secs.style.display = ""; return; }
  if(secs) secs.style.display = "none";
  const m = soutenuCardById();
  const hits = soutenuAllIds().map(id=>m[id]).filter(c=>
    [c.std, c.sout, c.ja, c.ok, c.ng, c.exFr, c.exJa, c.plain, (c.use||[]).join(" ")].some(t=>soutNorm(t).indexOf(nq) >= 0));
  box.innerHTML = `<p class="small muted" style="margin:4px 0 8px">${hits.length}件</p>` + hits.map(c=>soutenuItemCardHtml(c, true)).join("");
}
function openSoutenuCat(catId){
  try{ openSoutenuCatInner(catId, false); }
  catch(e){ showErrorBanner("上品なフランス語の表示でエラー： " + e.message + (e.stack ? " / " + String(e.stack).split("\n")[0] : "")); }
}
function openSoutenuCatInner(catId, keepScroll){
  const cat = soutenuCat(catId);
  if(!cat) return openSoutenuHome();
  _soutView = {type:"cat", catId};
  titleEl.textContent = cat.title;
  setBack(openSoutenuHome, "上品なフランス語");
  const ids = soutenuCatIds(catId);
  const m = soutenuCardById();
  let h = `<div class="card">
    ${cat.desc ? `<p class="small" style="margin:0">${esc(cat.desc)}</p>` : ""}
    ${soutStudyButtonsHtml(catId, ids)}
  </div>`;
  h += ids.map(id=>soutenuItemCardHtml(m[id], false)).join("");
  el.innerHTML = h;
  if(!keepScroll) window.scrollTo(0,0);
}

/* ---------- 文例集 ----------
   メールの書き出しや結びのような定型文は、単語カードとして暗記で回すものではなく、
   書くときに探して・自分用に直して・貼るもの。そのためSRSとは別の参照用セクションにし、
   ☆保存／本文の編集／コピー／複数選択してまとめてコピー、を中心に組む。
   自分で書いた定型文も同じ場所に足せる（state.phraseCustom）。 */
/* メールの型（図解）。フランス語のメールは「どの部品を、どの順で、どのくらいの丁寧さで置くか」
   がほぼ決まっている。文例を並べるだけだと、どこに何を入れるかが分からないので、
   構造・丁寧さの段階・結語の選び方・注釈つきの完成例をまとめて置く。 */
const MAIL_STRUCT = [
  {part:"Objet", ja:"件名", ex:"Demande de devis — remplacement de la pompe de relevage, bâtiment B",
   tip:"用件＋対象を名詞で。Bonjour や挨拶は書かない。返信のとき以外は自分で新しく書く。"},
  {part:"Formule d'appel", ja:"宛名", ex:"Bonjour Madame Le Goff,",
   tip:"名字が分かるなら Bonjour + Madame/Monsieur + 名字。分からなければ Madame, Monsieur,。行末はカンマで、次に空行を1つ。"},
  {part:"Accroche", ja:"書き出し", ex:"Je fais suite à notre échange téléphonique de ce matin.",
   tip:"日本語の「お世話になっております」に当たる決まり文句はない。いきなり用件の背景から入る。"},
  {part:"Corps", ja:"本文", ex:"La pompe du sous-sol présente des déclenchements répétés depuis une semaine.\nLe modèle installé a été mis en service en 2019.",
   tip:"事実 → 原因 → 対応の順。1通につき用件は1つ。3つ以上あるなら箇条書きにする。"},
  {part:"Demande", ja:"依頼・次の一手", ex:"Pourriez-vous nous établir un devis en précisant le délai d'approvisionnement ?",
   tip:"相手に何をしてほしいのかを1文で。ここが無いメールは動いてもらえない。期限があれば添える。"},
  {part:"Formule de politesse", ja:"結びの一文", ex:"Je reste à votre disposition pour tout complément d'information.",
   tip:"結語の直前に置く1文。待ちの姿勢か、補足の申し出か、礼のどれかを選ぶ。"},
  {part:"Salutation", ja:"結語", ex:"Bien cordialement,",
   tip:"相手との距離で選ぶ（下の「結語の選び方」参照）。最後はカンマ、その下に署名。"},
  {part:"Signature", ja:"署名", ex:"Masashi Takagi\nTechnicien de maintenance\n0X XX XX XX XX",
   tip:"氏名・肩書・電話の3行が最小構成。フランスでは電話番号を入れておくと折り返しが早い。"},
];
const MAIL_LADDER = [
  {w:16, fr:"Tu peux me confirmer la date ?", ja:"tu で話す親しい同僚だけ。社外には使わない"},
  {w:34, fr:"Pouvez-vous me confirmer la date ?", ja:"中立。社内や、何度もやり取りしている相手"},
  {w:52, fr:"Pourriez-vous me confirmer la date ?", ja:"標準。迷ったらこれで外さない"},
  {w:68, fr:"Serait-il possible de confirmer la date ?", ja:"相手に断る余地を残す。無理を頼むとき"},
  {w:84, fr:"Je vous prie de bien vouloir confirmer la date.", ja:"丁寧だが要求としては強い。期限を添えると効く"},
  {w:100, fr:"Je vous saurais gré de bien vouloir confirmer la date.", ja:"書面向けの硬い言い方。メールではやや重い"},
];
const MAIL_CLOSING = [
  {who:"親しい同僚", fr:"À bientôt, / Salut,", tip:"tu で話す相手だけ"},
  {who:"顔なじみの取引先", fr:"Bien à vous,", tip:"距離が近いが丁寧さは保つ"},
  {who:"通常の社外", fr:"Cordialement,", tip:"最も無難。9割はこれで足りる"},
  {who:"少し丁寧に", fr:"Bien cordialement,", tip:"初めての相手や、頼みごとのとき"},
  {who:"初対面・応募・行政", fr:"Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.", tip:"正式な結語。宛名で使った呼びかけ（Madame, Monsieur など）をそのまま繰り返す"},
];
const MAIL_MODELS = [
  {id:"mm_job", title:"応募メール", sub:"求人に応募する",
   lines:[
     {tag:"Objet", txt:"Candidature au poste de technicien de maintenance — Masashi Takagi", obj:true},
     {tag:"宛名", txt:"Madame, Monsieur,"},
     {tag:"書き出し", txt:"Je me permets de vous adresser ma candidature pour le poste de technicien de maintenance, publié sur votre site le 12 septembre."},
     {tag:"本文", txt:"Technicien de maintenance industrielle depuis huit ans, j'interviens sur des équipements statiques et lors des arrêts techniques. Je suis titulaire de la certification CND niveau 2 (ISO 9712) ainsi que de plusieurs habilitations HSE."},
     {tag:"依頼", txt:"Vous trouverez ci-joint mon CV ainsi qu'une lettre de motivation. Je serais heureux de vous exposer mon parcours lors d'un entretien."},
     {tag:"結びの一文", txt:"Dans l'attente de votre retour, je vous remercie de l'attention que vous porterez à ma candidature."},
     {tag:"結語", txt:"Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées."},
     {tag:"署名", txt:"Masashi Takagi\nTechnicien de maintenance\n0X XX XX XX XX"},
   ]},
  {id:"mm_devis", title:"業者への見積依頼", sub:"外注に頼む",
   lines:[
     {tag:"Objet", txt:"Demande de devis — remplacement de la pompe de relevage, bâtiment B", obj:true},
     {tag:"宛名", txt:"Bonjour Madame Le Goff,"},
     {tag:"書き出し", txt:"Je fais suite à notre échange téléphonique de ce matin."},
     {tag:"本文", txt:"La pompe de relevage du sous-sol du bâtiment B présente des déclenchements répétés depuis une semaine. Le modèle installé a été mis en service en 2019."},
     {tag:"依頼", txt:"Pourriez-vous nous établir un devis pour son remplacement, en précisant le délai d'approvisionnement ? Merci également de prévoir le protocole de sécurité avant votre venue."},
     {tag:"結びの一文", txt:"Je reste à votre disposition pour tout complément d'information."},
     {tag:"結語", txt:"Bien cordialement,"},
     {tag:"署名", txt:"Masashi Takagi\nTechnicien de maintenance\n0X XX XX XX XX"},
   ]},
  {id:"mm_panne", title:"不具合の第一報", sub:"社内に状況を知らせる",
   lines:[
     {tag:"Objet", txt:"Arrêt de la CTA toiture — bâtiment A — intervention en cours", obj:true},
     {tag:"宛名", txt:"Bonjour,"},
     {tag:"書き出し", txt:"Je vous signale un dysfonctionnement sur la centrale de traitement d'air du bâtiment A."},
     {tag:"本文", txt:"Le défaut est apparu ce matin vers 7 h 30. L'équipement est actuellement à l'arrêt et la zone a été balisée. L'origine de la panne n'est pas encore identifiée."},
     {tag:"依頼", txt:"Le prestataire a été appelé et interviendra dans la journée. Je vous tiendrai informé de l'évolution."},
     {tag:"結語", txt:"Cordialement,"},
     {tag:"署名", txt:"Masashi Takagi\nTechnicien de maintenance\n0X XX XX XX XX"},
   ]},
];
const MAIL_PITFALLS = [
  {x:"Bonjour, j'espère que vous allez bien. Je me présente…（長い前置き）",
   o:"Je me permets de vous écrire au sujet de [sujet].",
   tip:"「お世話になっております」に当たる定型はフランス語にない。2行目には用件が来る。"},
  {x:"Objet : Bonjour", o:"Objet : Demande de devis — pompe de relevage, bâtiment B",
   tip:"件名は挨拶ではなく、用件と対象。相手は件名で優先順位を決める。"},
  {x:"Bonjour Madame Le Goff\nJe fais suite…", o:"Bonjour Madame Le Goff,\n\nJe fais suite…",
   tip:"宛名の行末はカンマ。そのあと空行を1つ入れ、本文は大文字で始める。"},
  {x:"Pourriez-vous confirmer?  Merci!", o:"Pourriez-vous confirmer ? Merci !",
   tip:"フランスの組版では : ; ? ! の前にスペースを入れる。, と . の前には入れない。"},
  {x:"Merci pour votre coopération.（「よろしくお願いします」の直訳）",
   o:"Merci d'avance. / Dans l'attente de votre retour.",
   tip:"日本語の万能の締めは直訳できない。依頼なら Merci d'avance、返事待ちなら Dans l'attente de votre retour。"},
  {x:"Cordialement", o:"Cordialement,", tip:"結語のあとにはカンマ。その下の行に署名を置く。"},
  {x:"用件を3つ詰め込んだ長いメール", o:"1通に用件1つ。どうしても複数なら箇条書き（tirets）にする。",
   tip:"用件が混ざると、返事が一部にしか来ない。分けて送ったほうが速く回る。"},
];

function mailModelText(m){
  const L = [];
  m.lines.forEach(l=>{
    if(l.obj){ L.push("Objet : " + l.txt); L.push(""); return; }
    L.push(l.txt);
    L.push("");
  });
  return L.join("\n").trim();
}
function copyMailModel(id, btn){
  const m = MAIL_MODELS.find(x=>x.id===id);
  if(m) copyText(mailModelText(m), btn);
}
function openMailStructure(){
  titleEl.textContent = "メールの型";
  setBack(openPhraseHome, "文例集");
  let h = `<div class="card">
    <p class="small muted" style="margin:0">フランス語のビジネスメールは、置く部品とその順番がほぼ決まっている。型どおりに並べれば、多少ぎこちなくても「ちゃんとしたメール」として読まれる。逆に順番を崩すと、内容が良くても読みにくく見える。</p>
  </div>`;

  h += `<div class="card"><h2 style="margin-top:0">1. 全体の型</h2>
    <p class="small muted" style="margin:-4px 0 10px">上から順に置く。太字が部品の名前、枠内が実際の書き方。</p>
    <div class="mg-flow">`;
  MAIL_STRUCT.forEach(s=>{
    h += `<div class="mg-step">
      <div class="mg-part">${esc(s.part)} <span>／ ${esc(s.ja)}</span></div>
      <div class="mg-ex">${wrapTapWords(s.ex)}</div>
      <div class="mg-tip">${esc(s.tip)}</div>
    </div>`;
  });
  h += `</div></div>`;

  h += `<div class="card"><h2 style="margin-top:0">2. 丁寧さのものさし</h2>
    <p class="small muted" style="margin:-4px 0 6px">同じ「確認してください」でも段階がある。バーが長いほど改まった言い方。迷ったら真ん中の Pourriez-vous。</p>
    <div class="mg-scale">`;
  MAIL_LADDER.forEach(l=>{
    h += `<div class="mg-lvl">
      <div><div class="mg-bar" style="width:${l.w}%;opacity:${0.35 + l.w/160}"></div></div>
      <div><div class="mg-lvl-fr">${wrapTapWords(l.fr)}</div><div class="mg-lvl-ja">${esc(l.ja)}</div></div>
    </div>`;
  });
  h += `</div></div>`;

  h += `<div class="card"><h2 style="margin-top:0">3. 結語の選び方</h2>
    <p class="small muted" style="margin:-4px 0 6px">相手との距離で決まる。上ほど近く、下ほど改まる。</p>`;
  MAIL_CLOSING.forEach(c=>{
    h += `<div class="mg-branch">
      <span class="mg-who">${esc(c.who)}</span>
      <div><div class="mg-lvl-fr">${wrapTapWords(c.fr)}</div><div class="mg-lvl-ja">${esc(c.tip)}</div></div>
    </div>`;
  });
  h += `<p class="mg-tip" style="margin-top:10px">正式な結語（Veuillez agréer …）を使うときは、宛名で書いた呼びかけを結語の中でそのまま繰り返す。宛名が「Madame, Monsieur,」なら結語も「…, Madame, Monsieur, …」になる。</p>
  </div>`;

  h += `<div class="card"><h2 style="margin-top:0">4. 完成例（部品つき）</h2>
    <p class="small muted" style="margin:-4px 0 0">左が部品の名前。「全文をコピー」でそのまま下書きに使える。名前・番号・日付は自分のものに直す。</p>`;
  MAIL_MODELS.forEach(m=>{
    h += `<h3 style="margin-bottom:4px">${esc(m.title)}<span class="di-sub">${esc(m.sub)}</span></h3>
      <div class="mg-mail">`;
    m.lines.forEach(l=>{
      h += `<div class="mg-line${l.obj?" mg-obj":""}">
        <div class="mg-tag">${esc(l.tag)}</div>
        <div class="mg-txt">${wrapTapWords(l.txt)}</div>
      </div>`;
    });
    h += `</div><div class="actions" style="margin-top:8px">
      <button class="btn small" onclick="copyMailModel('${m.id}', this)">全文をコピー</button>
    </div>`;
  });
  h += `</div>`;

  h += `<div class="card"><h2 style="margin-top:0">5. 日本語のメールとのズレ</h2>
    <p class="small muted" style="margin:-4px 0 8px">日本語の作法をそのまま持ち込むとずれる箇所。左が避けたい形、右が普通の形。</p>`;
  MAIL_PITFALLS.forEach(p=>{
    // 改行そのものが論点の項目があるので、\n は <br> にして見える形で出す
    h += `<div class="mg-warn">
      <div class="mg-x">✗ ${esc(p.x).replace(/\n/g,"<br>")}</div>
      <div class="mg-o" style="margin-top:4px">✓ ${esc(p.o).replace(/\n/g,"<br>")}</div>
      <div class="mg-tip">${esc(p.tip)}</div>
    </div>`;
  });
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}

function phraseCats(){
  const cats = PHRASES.slice();
  const custom = Object.values(state.phraseCustom);
  if(custom.length) cats.push({id:"_mine", group:"自分の定型文", title:"自分で登録した文", sub:"自分で書き足したもの", note:"", items:custom});
  return cats;
}
function phraseCatById(id){ return phraseCats().find(c=>c.id===id); }
function phraseById(id){
  if(state.phraseCustom[id]) return state.phraseCustom[id];
  for(const c of PHRASES){ const it = c.items.find(x=>x.id===id); if(it) return it; }
  return null;
}
function phraseCatOf(id){
  if(state.phraseCustom[id]) return {title:"自分の定型文"};
  for(const c of PHRASES){ if(c.items.some(x=>x.id===id)) return c; }
  return null;
}
// 表示・コピーに使う本文。自分用に書き換えていればそちらを優先する。
function phraseTextOf(id){
  const t = state.phraseText[id];
  if(t !== undefined && t !== null && String(t).trim()) return t;
  const p = phraseById(id);
  return p ? p.fr : "";
}
function phraseIsEdited(id){
  const p = phraseById(id);
  return !!(p && state.phraseText[id] && state.phraseText[id] !== p.fr);
}
// 保存順ではなく、文例集に定義した並び（書き出し→本文→結び）で返す。
// まとめてコピーしたときに、そのままメールの下書きとして成立する順番にするため。
// 自分で登録した定型文は最後に、登録の古い順で置く。
let _phraseOrder = null;
function phraseOrderIndex(id){
  if(!_phraseOrder){
    _phraseOrder = {};
    let n = 0;
    PHRASES.forEach(c=>{ c.items.forEach(it=>{ _phraseOrder[it.id] = n++; }); });
  }
  if(_phraseOrder[id] !== undefined) return _phraseOrder[id];
  const cu = state.phraseCustom[id];
  return 1e6 + (cu ? cu.createdAt/1e6 : 0);   // 自作分は末尾へ
}
function phraseSavedIds(){
  return Object.keys(state.phraseFav)
    .filter(id=>state.phraseFav[id] && phraseById(id))
    .sort((a,b)=>phraseOrderIndex(a) - phraseOrderIndex(b));
}
function togglePhraseFav(id, elm){
  if(state.phraseFav[id]) delete state.phraseFav[id];
  else state.phraseFav[id] = Date.now();
  save();
  if(elm){
    const on = !!state.phraseFav[id];
    elm.textContent = on ? "★" : "☆";
    elm.classList.toggle("on", on);
  }
}
function savePhraseText(id, v){
  const p = phraseById(id);
  if(!p) return;
  const val = (v||"").trim();
  if(!val || val === p.fr) delete state.phraseText[id];
  else state.phraseText[id] = val;
  save();
}
function copyPhrase(id, btn){ copyText(phraseTextOf(id), btn); }

function phraseRowHtml(it, opts){
  const o = opts || {};
  const on = !!state.phraseFav[it.id];
  const edited = phraseIsEdited(it.id);
  let h = `<div class="ph">`;
  if(o.check) h += `<label class="ph-check"><input type="checkbox" class="ph-cb" value="${esc(it.id)}"><span></span></label>`;
  h += `<div class="ph-main">`;
  if(o.catLabel) h += `<div class="ph-cat">${esc(o.catLabel)}</div>`;
  h += `<div class="ph-fr">${wrapTapWords(phraseTextOf(it.id))}</div>`;
  h += `<div class="ph-ja">${esc(it.ja||"")}</div>`;
  if(it.note) h += `<div class="ph-note">${esc(it.note)}</div>`;
  if(o.editable){
    h += `<textarea class="ph-edit" id="phEdit_${esc(it.id)}" placeholder="自分用に書き換える（[  ]を埋めるなど）"
      onchange="savePhraseText('${esc(it.id)}', this.value); renderPhraseSaved()">${esc(phraseTextOf(it.id))}</textarea>`;
  }
  if(edited && !o.editable) h += `<div class="ph-note">自分用に書き換え済み</div>`;
  h += `</div><div class="ph-btns">
    <button class="fav-btn ${on?"on":""}" onclick="togglePhraseFav('${esc(it.id)}', this)">${on?"★":"☆"}</button>
    <button class="btn small" onclick="copyPhrase('${esc(it.id)}', this)">コピー</button>`;
  if(o.removable) h += `<button class="btn small" onclick="deleteCustomPhrase('${esc(it.id)}')">削除</button>`;
  h += `</div></div>`;
  return h;
}

function openPhraseHome(){
  titleEl.textContent = "文例集";
  setBack(renderHome, "ホーム");
  const saved = phraseSavedIds().length;
  const cats = phraseCats();
  let h = `<div class="card">
    <p class="small muted" style="margin:0 0 10px">メール・報告・電話でそのまま使える定型文。覚えるためではなく、書くときに探して貼るための場所。[  ]の部分は自分で埋める。☆を付けた文は「保存した文例」に集まり、自分用に書き換えて何度でも使い回せる。文中の語をタップすれば、いつもどおり単語のお気に入りにも入る。</p>
    <input type="text" id="phSearch" placeholder="フランス語・日本語で検索（例: 催促、disponible）" oninput="renderPhraseSearch()">
    <div id="phSearchOut"></div>
  </div>`;
  h += `<div class="card"><div class="spread">
    <div><h2 style="margin:0">メールの型</h2>
      <p class="small muted" style="margin:4px 0 0">どの部品をどの順で置くか・丁寧さの段階・完成例（図解）</p></div>
    <button class="btn primary" onclick="openMailStructure()">開く</button>
  </div></div>`;
  h += `<div class="card"><div class="spread">
    <div><h2 style="margin:0">保存した文例</h2>
      <p class="small muted" style="margin:4px 0 0">☆を付けた文と、自分で登録した定型文（${saved}件）</p></div>
    <button class="btn ${saved?"primary":""}" onclick="openPhraseSaved()">開く</button>
  </div></div>`;
  let lastGroup = "";
  cats.forEach(c=>{
    if(c.group !== lastGroup){
      if(lastGroup) h += `</div>`;
      h += `<h3>${esc(c.group)}</h3><div class="card" style="padding:4px 16px">`;
      lastGroup = c.group;
    }
    const nSaved = c.items.filter(it=>state.phraseFav[it.id]).length;
    h += `<div class="topic" onclick="openPhraseCat('${esc(c.id)}')">
      <span class="tname">${esc(c.title)}<span class="di-sub">${esc(c.sub||"")}</span></span>
      <span class="tmeta">${c.items.length}文${nSaved?` ・ ★${nSaved}`:""}</span>
    </div>`;
  });
  if(lastGroup) h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}

function renderPhraseSearch(){
  const q = (document.getElementById("phSearch").value||"").trim().toLowerCase();
  const out = document.getElementById("phSearchOut");
  if(!q){ out.innerHTML = ""; return; }
  const hits = [];
  phraseCats().forEach(c=>{
    c.items.forEach(it=>{
      const hay = (phraseTextOf(it.id) + " " + (it.ja||"") + " " + (it.note||"") + " " + c.title).toLowerCase();
      if(hay.includes(q)) hits.push({it, c});
    });
  });
  if(!hits.length){ out.innerHTML = `<p class="small muted" style="margin:10px 0 0">該当なし。</p>`; return; }
  let h = `<p class="small muted" style="margin:10px 0 4px">${hits.length}件</p>`;
  hits.slice(0,30).forEach(({it,c})=>{ h += phraseRowHtml(it, {catLabel:c.title}); });
  if(hits.length > 30) h += `<p class="small muted" style="margin:6px 0 0">上位30件のみ表示。語を足して絞り込む。</p>`;
  out.innerHTML = h;
}

function openPhraseCat(catId){
  const c = phraseCatById(catId);
  if(!c) return openPhraseHome();
  titleEl.textContent = c.title;
  setBack(openPhraseHome, "文例集");
  let h = "";
  if(c.note) h += `<div class="card"><p class="small muted" style="margin:0">${esc(c.note)}</p></div>`;
  h += `<div class="card">`;
  c.items.forEach(it=>{ h += phraseRowHtml(it, {removable: catId==="_mine"}); });
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}

function openPhraseSaved(){
  titleEl.textContent = "保存した文例";
  setBack(openPhraseHome, "文例集");
  renderPhraseSaved();
}
function renderPhraseSaved(){
  const ids = phraseSavedIds();
  let h = `<div class="card">
    <h2 style="margin-top:0">自分の定型文を追加</h2>
    <p class="small muted" style="margin:0 0 8px">よく使う言い回しを自分で登録できる。会社名や現場名を入れた完成形で入れておくと、そのまま貼れる。</p>
    <textarea id="phNewFr" placeholder="フランス語の文" style="min-height:70px"></textarea>
    <input type="text" id="phNewJa" placeholder="日本語のメモ（任意）" style="margin-top:8px">
    <div class="actions"><button class="btn" onclick="addCustomPhrase()">登録する</button></div>
  </div>`;
  if(!ids.length){
    h += `<div class="card"><p class="muted small" style="margin:0">まだ保存した文例がない。文例集の各文の☆を押すとここに集まる。</p></div>`;
    el.innerHTML = h;
    return;
  }
  h += `<div class="card">
    <div class="spread" style="margin-bottom:10px;gap:8px">
      <span class="small muted" style="white-space:nowrap">${ids.length}件</span>
      <span class="actions" style="margin:0">
        <button class="btn small" onclick="phraseCheckAll(true)">全選択</button>
        <button class="btn small" onclick="phraseCheckAll(false)">解除</button>
        <button class="btn small primary" onclick="copyCheckedPhrases(this)">選んだ文をまとめてコピー</button>
      </span>
    </div>
    <p class="small muted" style="margin:0 0 10px">書き出し・本文・結びを選んでまとめてコピーすれば、メールの下書きがそのまま作れる。下の入力欄で自分用に書き換えた内容がコピーされる。</p>`;
  ids.forEach(id=>{
    const it = phraseById(id);
    const c = phraseCatOf(id);
    h += phraseRowHtml(it, {check:true, editable:true, catLabel: c?c.title:"", removable: !!state.phraseCustom[id]});
  });
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function phraseCheckAll(on){
  document.querySelectorAll(".ph-cb").forEach(cb=>{ cb.checked = on; });
}
function copyCheckedPhrases(btn){
  const picked = [...document.querySelectorAll(".ph-cb")].filter(cb=>cb.checked).map(cb=>phraseTextOf(cb.value));
  if(!picked.length){ alert("コピーする文を選んで。"); return; }
  copyText(picked.join("\n\n"), btn);
}
function addCustomPhrase(){
  const fr = (document.getElementById("phNewFr").value||"").trim();
  const ja = (document.getElementById("phNewJa").value||"").trim();
  if(!fr){ alert("フランス語の文を入れて。"); return; }
  const id = "pu" + Date.now().toString(36) + Math.floor(Math.random()*1000);
  state.phraseCustom[id] = {id, fr, ja, note:"", createdAt:Date.now()};
  state.phraseFav[id] = Date.now();
  save();
  renderPhraseSaved();
}
function deleteCustomPhrase(id){
  if(!state.phraseCustom[id]) return;
  if(!confirm("この定型文を削除する？")) return;
  delete state.phraseCustom[id];
  delete state.phraseFav[id];
  delete state.phraseText[id];
  save();
  renderPhraseSaved();
}

/* ---------- 読解モード ----------
   ニュース記事のURL（または本文貼り付け）→ AI用出題プロンプトを生成 → 外部AI（ChatGPT/Claude/Gemini等の
   無料枠）に読み込ませる → 返ってきたJSONをここに貼り付けて取り込む、という一往復で完結する設計。
   アプリ自体は通信しない（他の機能と同じ静的レシーバー方式）。
   問題の質はユーザーが使うAIのモデル次第でばらつくため、意味内容までは検証できないが、
   構造的な整合性チェックと、機械的に検出できる範囲の品質注意（警告であってブロックはしない）を行う。 */
const READING_LEVELS_UI = ["A2","B1","B2","C1","C2"];
let readingDraft = {url:"", body:"", cefr:"B2", count:5, aiLabel:""};

// 本文貼り付け時のノイズ行（Cookie同意・シェアボタン等のナビ文言）を粗く除去する。
// 完全ではないが、貼り付けたテキストの大半が本文であれば十分効く。
function stripBoilerplate(text){
  const BAD = /^(partager|abonnez[- ]vous|s'abonner|publicit[ée]s?|newsletter|cookies?|tout accepter|accepter( les)? cookies|lire aussi|à lire aussi|a lire aussi|sur le même sujet|sur le meme sujet|voir aussi|commentaires?|réagir|reagir|copier le lien|imprimer|envoyer par (e-?mail|courriel)|suivez[- ]nous|partager sur|©.*|tous droits réservés|se connecter|s'inscrire|menu|sommaire|publicité)\s*[:：]?\s*$/i;
  return (text||"").split(/\r?\n/)
    .map(l=>l.trim())
    .filter(l=>l && !BAD.test(l))
    .join("\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function buildReadingPrompt(d){
  const L = [];
  L.push(`あなたはフランス語学習教材の作成者です。以下の指示に厳密に従い、フランス語の記事を使ったCEFR ${d.cefr} レベルの読解問題を作成してください。`);
  L.push("");
  if(d.body){
    L.push("【記事本文】次の <<<ARTICLE〜ARTICLE>>> の間の文章を記事として使ってください。URLへのアクセスやWeb検索は不要です。");
    L.push("<<<ARTICLE");
    L.push(d.body);
    L.push("ARTICLE>>>");
    L.push("");
    L.push(`出典として、source.url には次の値をそのまま使ってください: ${d.url}`);
  } else {
    L.push(`【記事の取得】次のURLの記事本文を取得してください: ${d.url}`);
    L.push("記事が取得できない場合（有料会員限定・bot対策・要ログインなど）は、内容を推測で埋めず、後述のエラー形式（status:\"error\"）で返してください。");
  }
  L.push("");
  L.push("【手順】");
  L.push(`1. 記事を、CEFR ${d.cefr} レベルの読解問題に適した長さ・語彙・構文になるよう書き直してください（要約ではなく、原文の情報を保ったまま平易化・調整する「アダプテーション」）。書き直した本文を adapted_article.text_fr として出力してください。`);
  L.push("2. 以降の設問・選択肢・根拠文（evidence_fr）は、必ずこの adapted_article.text_fr の内容のみに基づいて作成してください。元の記事にしかない情報を使わないでください。");
  L.push(`3. 設問は${d.count}問を目標に作成してください。ただし質を落としてまで数を埋めないでください。条件を満たす問題を${d.count}問作れない場合は、作成できた問題だけを出力してください。最低3問に満たない場合は、後述のエラー形式（status:"quality_error"）で返してください。`);
  L.push("4. 設問の種類は、細部理解（type:\"detail\"）・推論（\"inference\"）・主旨（\"main_idea\"）・語彙の文脈的意味（\"vocab_context\"）・話者の立場（\"attitude\"）などをできるだけ混ぜ、全問が同じ種類にならないようにしてください。");
  L.push("5. 各設問は4択（choicesに4つ）とし、正解は1つだけに定まるようにしてください。複数の選択肢が正解になり得る問題は避けてください。");
  L.push("6. 誤答（distractor）は次のように作成してください。");
  L.push("　・本文には存在するが、その設問の答えにはなっていない情報を誤答にする（無関係な当て推量にしない）。");
  L.push("　・複数の人物・立場が出てくる記事では、それぞれの主張を微妙に入れ替えたものを誤答にする。");
  L.push("　・部分的に正しいが一部が間違っている選択肢も混ぜる。");
  L.push("　・「toujours」「jamais」のような断定的な語だけで誤答と分かる、あからさまな誤答は避ける。");
  L.push("　・正解と誤答で文の長さ・文体・具体性をできるだけ揃え、正解だけが目立たないようにする。");
  L.push("7. 正解の位置（answer_index）は問題ごとに散らし、同じ位置に偏らないようにしてください。");
  L.push("8. 次の例のように、すべての選択肢が本文の語彙・登場人物・論点に関係した、もっともらしい内容にしてください。明らかに無関係な選択肢は作らないでください（内容は今回の記事に合わせて作成すること。これは形式の例）。");
  L.push(JSON.stringify({
    question_fr: "Quelle différence distingue principalement les critiques des deux intervenants ?",
    choices: [
      "Le premier refuse toute réglementation, tandis que le second défend une autorégulation nationale.",
      "Le premier critique le coût des contrôles, tandis que le second conteste leur faisabilité.",
      "Le premier insiste sur la diversité des acteurs consultés, tandis que le second réclame des règles contraignantes.",
      "Le premier défend les modèles fermés, tandis que le second souhaite les interdire."
    ],
    answer_index: 2
  }, null, 2));
  L.push("9. 各設問には、正解の根拠となる一文または連続する一節を adapted_article.text_fr からそのまま（一字一句違えず）引用し、evidence_fr としてください。要約や言い換えではなく、本文中の文字列と完全に一致させてください。");
  L.push("10. 各設問には、なぜその選択肢が正解で他が誤りなのかを日本語で explanation_ja として簡潔に説明してください。");
  L.push("11. 出力する前に、必ず自己点検してください：各設問の正解が本当に1つだけに定まっているか／evidence_fr が adapted_article.text_fr 内にそのままの文字列で存在するか／誤答が本文と無関係な当て推量になっていないか／正解の位置が偏っていないか。問題が見つかれば出力前に修正してください。");
  L.push("12. 出力は次のJSON形式のみとし、それ以外の文章（前置き・説明・Markdownのコードフェンスなど）は一切含めないでください。");
  L.push("");
  L.push("【出力形式（成功時）】");
  L.push(JSON.stringify({
    status:"ok", schema:"fr-reading-v1",
    source:{url:"...", title:"..."},
    cefr:d.cefr,
    adapted_article:{text_fr:"..."},
    questions:[{id:"q1", type:"detail", question_fr:"...", choices:["...","...","...","..."], answer_index:0, evidence_fr:"...", explanation_ja:"..."}]
  }, null, 2));
  L.push("");
  L.push("【出力形式（記事が取得できない場合）】");
  L.push(JSON.stringify({status:"error", error_code:"article_unavailable", message_ja:"..."}, null, 2));
  L.push("");
  L.push("【出力形式（質の高い問題が最低3問作れない場合）】");
  L.push(JSON.stringify({status:"quality_error", message_ja:"..."}, null, 2));
  return L.join("\n");
}

// AIの返答からJSON部分だけを取り出す。前後に説明文やMarkdownのコードフェンスが
// 付いていても、``` フェンスを剥がした上で最初の { から対応する } までを括弧の
// 深さで追跡して切り出す（文字列リテラル内の { } は数えない）。
function extractJsonFromText(raw){
  let s = (raw||"").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if(fence) s = fence[1].trim();
  const start = s.indexOf("{");
  if(start === -1) return null;
  let depth = 0, inStr = false, escNext = false, end = -1;
  for(let i=start;i<s.length;i++){
    const c = s[i];
    if(inStr){
      if(escNext){ escNext = false; }
      else if(c === "\\"){ escNext = true; }
      else if(c === '"'){ inStr = false; }
      continue;
    }
    if(c === '"'){ inStr = true; continue; }
    if(c === "{") depth++;
    else if(c === "}"){ depth--; if(depth === 0){ end = i; break; } }
  }
  if(end === -1) return null;
  return s.slice(start, end+1);
}

// 空白・引用符の表記ゆれを吸収した上での文字列一致チェック（根拠文の照合用）
function normReadingText(s){
  return (s||"").normalize("NFKC").replace(/[\u201C\u201D\u201E\u201F]/g,'"').replace(/[\u2018\u2019\u201A\u201B]/g,"'").replace(/\s+/g," ").trim();
}

// スマホ（特にiOS）の「スマート引用符」機能は、貼り付けたテキストの中の直引用符 " を
// 湾曲引用符 " " に勝手に置き換えてしまうことがある。JSONの構造上の引用符までこれで
// 壊れると JSON.parse が失敗する（PCでは起きない現象）。素の文字列でパースが失敗した
// 場合だけ、湾曲引用符を直引用符に戻して救済を試みる。
function unsmartenQuotes(s){
  return (s||"").replace(/[\u201C\u201D\u201E\u201F]/g,'"').replace(/[\u2018\u2019\u201A\u201B]/g,"'");
}

// 構造的な検証のみ（意味内容の正しさまでは検証できない）。
// 引っかかったら具体的な理由をそのまま返す（黙って直そうとしない）。
function validateReadingImport(data){
  if(!data || typeof data !== "object") return {ok:false, error:"JSONオブジェクトとして読み取れなかった。"};
  if(data.status === "error"){
    return {ok:false, isAiError:true, error: data.message_ja || "AIが記事を取得できなかった（有料会員限定・bot対策などの可能性）。別の記事を試すか、本文貼り付け方式に切り替えて。"};
  }
  if(data.status === "quality_error"){
    return {ok:false, isAiError:true, error: data.message_ja || "AIが十分な品質の問題を最低3問作れなかった。問題数を減らすか、別のAI・別の記事で試して。"};
  }
  if(data.status !== "ok") return {ok:false, error:`status の値が想定外（"${esc(String(data.status))}"）。"ok"・"error"・"quality_error"のいずれかのはず。`};
  if(!data.adapted_article || typeof data.adapted_article.text_fr !== "string" || !data.adapted_article.text_fr.trim())
    return {ok:false, error:"adapted_article.text_fr が無いか空。"};
  if(!Array.isArray(data.questions) || data.questions.length < 3)
    return {ok:false, error:`questions が配列でないか3問未満（${Array.isArray(data.questions)?data.questions.length:0}問）。`};
  const seenIds = new Set();
  for(let i=0;i<data.questions.length;i++){
    const q = data.questions[i];
    const label = `問${i+1}`;
    if(!q || typeof q !== "object") return {ok:false, error:`${label}: 問題オブジェクトが不正。`};
    if(!q.id || typeof q.id !== "string") return {ok:false, error:`${label}: id が無い。`};
    if(seenIds.has(q.id)) return {ok:false, error:`${label}: id "${q.id}" が他の問題と重複している。`};
    seenIds.add(q.id);
    if(!q.question_fr || typeof q.question_fr !== "string" || !q.question_fr.trim())
      return {ok:false, error:`${label}: question_fr が空。`};
    if(!Array.isArray(q.choices) || q.choices.length !== 4)
      return {ok:false, error:`${label}: choices が4つの配列になっていない。`};
    if(q.choices.some(c=>typeof c !== "string" || !c.trim()))
      return {ok:false, error:`${label}: choices に空の選択肢がある。`};
    const normSet = new Set(q.choices.map(c=>c.trim().toLowerCase()));
    if(normSet.size !== 4)
      return {ok:false, error:`${label}: choices に重複した選択肢がある。`};
    if(!Number.isInteger(q.answer_index) || q.answer_index < 0 || q.answer_index > 3)
      return {ok:false, error:`${label}: answer_index が0〜3の整数になっていない。`};
    if(!q.evidence_fr || typeof q.evidence_fr !== "string" || !q.evidence_fr.trim())
      return {ok:false, error:`${label}: evidence_fr が空。`};
    if(!q.explanation_ja || typeof q.explanation_ja !== "string" || !q.explanation_ja.trim())
      return {ok:false, error:`${label}: explanation_ja が空。`};
  }
  return {ok:true};
}

// 意味内容までは判定できないが、機械的に検出できる範囲の「弱い問題」の兆候を洗い出す。
// これは警告であってインポートを止めるものではない（アプリ側の形式的チェック）。
const READING_ABSOLUTE_WORDS = /\b(toujours|jamais|aucun|aucune|tous|toutes|personne|rien)\b/i;
function wordsOfFr(s){
  return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").match(/[a-z]+/g) || [];
}
function computeReadingWarnings(set){
  const perQ = {}, setLevel = [];
  const qs = set.questions || [];
  const adapted = set.adaptedText || "";
  qs.forEach(q=>{
    const w = [];
    const choices = q.choices || [];
    const correct = choices[q.answer_index] || "";
    const others = choices.filter((_,i)=>i!==q.answer_index);
    if(adapted && q.evidence_fr && !normReadingText(adapted).includes(normReadingText(q.evidence_fr)))
      w.push("根拠文（evidence_fr）が本文中にそのままの形では見つからない。引用が不正確な可能性。");
    const avgOtherLen = others.reduce((a,c)=>a+c.length,0) / (others.length||1);
    if(avgOtherLen > 0 && correct.length > avgOtherLen * 1.6)
      w.push("正解の選択肢が他より大幅に長い。長さだけで推測できる可能性。");
    const wcs = choices.map(c=>c.trim().split(/\s+/).filter(Boolean).length);
    const maxWc = Math.max(...wcs), minWc = Math.max(1, Math.min(...wcs));
    if(maxWc / minWc > 3)
      w.push("選択肢どうしの長さ（語数）の差が大きい。文体を揃えると良いかも。");
    const absCountOthers = others.filter(c=>READING_ABSOLUTE_WORDS.test(c)).length;
    if(absCountOthers >= 2 && !READING_ABSOLUTE_WORDS.test(correct))
      w.push("誤答の多くに「toujours/jamais」など断定的な語が含まれる。それだけで誤答と見抜かれる可能性。");
    const evWords = new Set(wordsOfFr(q.evidence_fr));
    if(evWords.size){
      const overlap = c => { const cw = wordsOfFr(c); if(!cw.length) return 0; return cw.filter(x=>evWords.has(x)).length / cw.length; };
      const corrOv = overlap(correct);
      const maxOtherOv = Math.max(0, ...others.map(overlap));
      if(corrOv - maxOtherOv > 0.45)
        w.push("正解の選択肢が根拠文の語をそのまま多く含んでいる。本文を読まずに選べる可能性。");
    }
    if(w.length) perQ[q.id] = w;
  });
  if(qs.length >= 4){
    if(qs.every(q=>q.answer_index === qs[0].answer_index))
      setLevel.push("全問で正解の位置が同じ。位置だけで当てられる可能性。");
    if(qs.every(q=>q.type && q.type === qs[0].type))
      setLevel.push("全問が同じ種類（type）。設問のバリエーションが少ない。");
  }
  return {perQ, setLevel};
}

function openReadingHome(){
  titleEl.textContent = "読解モード";
  setBack(renderHome, "ホーム");
  const sets = Object.values(state.readingSets).sort((a,b)=>b.createdAt-a.createdAt);
  const savedCount = Object.keys(state.readingSaved).length;
  let h = `<div class="card">
    <p class="small muted" style="margin:0 0 12px">好きな記事のURLからAI用の出題プロンプトを作り、外部のAI（ChatGPT・Claude・Geminiなど。無料枠でよい）に読み込ませて、返ってきたJSONをここに貼り付けると読解問題になる。生成はアプリ内では行わない（通信は一切しない）。</p>
    <button class="btn primary" onclick="openReadingGenerator()">新しい記事を読み込む</button>
  </div>`;
  h += `<div class="card"><div class="spread">
    <div><h2 style="margin:0">保存した問題</h2>
      <p class="small muted" style="margin:4px 0 0">気に入った設問だけを後からまとめて解き直せる（${savedCount}問）</p></div>
    <button class="btn" onclick="openReadingSaved()">開く</button>
  </div></div>`;
  h += `<div class="card"><h2>読み込んだ記事</h2>`;
  if(!sets.length){
    h += `<p class="muted small" style="margin:0">まだ記事を読み込んでいない。</p>`;
  } else {
    sets.forEach(s=>{
      const n = (s.questions||[]).length;
      h += `<div class="deck">
        <div class="deck-head">
          <span class="deck-name">${esc(s.title || s.url)}</span>
          <span class="pill">${esc(s.cefr)}</span>
        </div>
        <div class="small muted" style="margin:4px 0 8px">${n}問 ・ ${esc(new Date(s.createdAt).toLocaleDateString("ja-JP"))}${s.aiLabel?` ・ ${esc(s.aiLabel)}`:""}</div>
        <div class="actions" style="margin-top:0">
          <button class="btn small primary" onclick="openReadingSet('${s.id}')">開く</button>
          <button class="btn small" onclick="deleteReadingSet('${s.id}')">削除</button>
        </div>
      </div>`;
    });
  }
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}

function openReadingGenerator(){
  titleEl.textContent = "記事を読み込む";
  setBack(openReadingHome, "読解");
  const d = readingDraft;
  let h = `<div class="card">
    <label class="small muted" style="display:block;margin-bottom:4px">記事のURL（必須）</label>
    <input type="text" id="rdUrl" value="${esc(d.url)}" placeholder="https://...">
    <label class="small muted" style="display:block;margin:14px 0 4px">本文の貼り付け（任意・推奨）</label>
    <p class="small muted" style="margin:0 0 6px">無料AIはURLを開けないことが多い（有料会員限定・bot対策など）。記事本文をここに貼り付けておくと、AIがURLを取得できなくても本文だけで問題を作れて、より確実。</p>
    <textarea id="rdBody" placeholder="記事本文をここに貼り付け（任意）" style="min-height:160px" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false">${esc(d.body)}</textarea>
    <div class="small muted" style="display:flex;justify-content:space-between;margin-top:4px">
      <span id="rdBodyCount">${d.body.length.toLocaleString()}文字</span>
      <button class="btn small" type="button" onclick="document.getElementById('rdBody').value='';document.getElementById('rdBodyCount').textContent='0文字';document.getElementById('rdBodyWarn').style.display='none';">クリア</button>
    </div>
    <div class="small muted" id="rdBodyWarn" style="margin-top:4px;${d.body.length>6000?"":"display:none"}">かなり長い。要点だけに絞るか、記事の一部（該当セクション）だけを貼り付けても良い。</div>
    <div class="grid2" style="margin-top:14px">
      <div>
        <label class="small muted" style="display:block;margin-bottom:4px">レベル（CEFR）</label>
        <select id="rdCefr">${READING_LEVELS_UI.map(lv=>`<option value="${lv}" ${lv===d.cefr?"selected":""}>${lv}</option>`).join("")}</select>
      </div>
      <div>
        <label class="small muted" style="display:block;margin-bottom:4px">問題数（自由に指定）</label>
        <input type="number" id="rdCount" value="${d.count}" min="3" max="30" step="1">
      </div>
    </div>
    <p class="small muted" style="margin:6px 0 0">無料枠のAIは、問題数が多いと質が落ちやすい。まずは5問前後がおすすめ。AI側が指定数に届かなくても、作れた分だけで取り込める。</p>
    <div class="actions">
      <button class="btn primary" onclick="genReadingPrompt()">AI用プロンプトを作成</button>
    </div>
    <div id="rdPromptBox"></div>
  </div>
  <div class="card">
    <h2 style="margin-top:0">AIの返答を貼り付ける</h2>
    <p class="small muted" style="margin:0 0 8px">上のプロンプトをAIに読み込ませて、返ってきた内容をそのまま貼り付ける。前後に説明文が付いていても構わない（JSON部分だけ自動で取り出す）。</p>
    <label class="small muted" style="display:block;margin-bottom:4px">使ったAI（任意・メモ用）</label>
    <input type="text" id="rdAiLabel" value="${esc(d.aiLabel)}" placeholder="例: ChatGPT無料版、Gemini、Claude…">
    <textarea id="rdResponse" placeholder="AIの返答をここに貼り付け" style="min-height:160px;margin-top:10px" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
    <div id="rdImportMsg"></div>
    <div class="actions">
      <button class="btn primary" onclick="importReadingResponse()">取り込む</button>
    </div>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
  const bodyEl = document.getElementById("rdBody");
  bodyEl.addEventListener("input", e=>{
    const n = e.target.value.length;
    document.getElementById("rdBodyCount").textContent = n.toLocaleString()+"文字";
    document.getElementById("rdBodyWarn").style.display = n>6000 ? "" : "none";
  });
}

function genReadingPrompt(){
  const url = (document.getElementById("rdUrl").value||"").trim();
  if(!url){ alert("記事のURLを入力して。"); return; }
  const bodyRaw = (document.getElementById("rdBody").value||"").trim();
  const cefr = document.getElementById("rdCefr").value;
  let count = parseInt(document.getElementById("rdCount").value,10);
  if(!Number.isFinite(count) || count < 3) count = 3;
  if(count > 30) count = 30;
  const body = stripBoilerplate(bodyRaw);
  readingDraft = {url, body, cefr, count, aiLabel: (document.getElementById("rdAiLabel")||{}).value || readingDraft.aiLabel || ""};
  const txt = buildReadingPrompt(readingDraft);
  const box = document.getElementById("rdPromptBox");
  box.innerHTML = `<pre class="copybox" id="rdPtxt">${esc(txt)}</pre>
    <div class="actions"><button class="btn small" onclick="copyText(document.getElementById('rdPtxt').textContent, this)">プロンプトをコピー</button></div>`;
}

function importReadingResponse(){
  const raw = document.getElementById("rdResponse").value;
  const aiLabel = (document.getElementById("rdAiLabel").value||"").trim();
  readingDraft.aiLabel = aiLabel;
  const msgBox = document.getElementById("rdImportMsg");
  const jsonText = extractJsonFromText(raw);
  if(!jsonText){
    msgBox.innerHTML = `<p class="small" style="color:var(--bad)">JSON部分が見つからなかった。AIの返答に "{" で始まるJSONが含まれているか確認して。</p>`;
    return;
  }
  let data;
  try{ data = JSON.parse(jsonText); }
  catch(e1){
    // スマホの「スマート引用符」でJSON構造上の引用符が湾曲引用符に化けているケースを救済する。
    const fixed = unsmartenQuotes(jsonText);
    if(fixed !== jsonText){
      try{ data = JSON.parse(fixed); }
      catch(e2){
        msgBox.innerHTML = `<p class="small" style="color:var(--bad)">JSONとして読み取れなかった（${esc(e1.message)}）。AIの返答がJSON形式のまま貼られているか確認して。</p>`;
        return;
      }
    } else {
      msgBox.innerHTML = `<p class="small" style="color:var(--bad)">JSONとして読み取れなかった（${esc(e1.message)}）。AIの返答がJSON形式のまま貼られているか確認して。</p>`;
      return;
    }
  }
  const v = validateReadingImport(data);
  if(!v.ok){
    msgBox.innerHTML = `<p class="small" style="color:var(--bad)">${esc(v.error)}</p>`;
    return;
  }
  const id = "rs" + Date.now().toString(36) + Math.floor(Math.random()*1000);
  const set = {
    id, createdAt: Date.now(),
    url: (data.source && data.source.url) || readingDraft.url,
    title: (data.source && data.source.title) || "",
    cefr: data.cefr || readingDraft.cefr,
    requestedCount: readingDraft.count,
    aiLabel,
    adaptedText: data.adapted_article.text_fr,
    questions: data.questions.map(q=>({id:q.id, type:q.type||"", question_fr:q.question_fr, choices:q.choices, answer_index:q.answer_index, evidence_fr:q.evidence_fr, explanation_ja:q.explanation_ja})),
  };
  state.readingSets[id] = set;
  save();
  msgBox.innerHTML = "";
  document.getElementById("rdResponse").value = "";
  openReadingSet(id);
}

function openReadingSet(id){
  const set = state.readingSets[id];
  if(!set) return openReadingHome();
  titleEl.textContent = set.title || "読解セット";
  setBack(openReadingHome, "読解");
  const warnings = computeReadingWarnings(set);
  const n = set.questions.length;
  let h = `<div class="card">
    <div class="small muted" style="margin-bottom:6px">生成目標：${esc(set.cefr)}・DALF形式　／　生成モデル：${esc(set.aiLabel || "未記入")}</div>
    <div class="small muted" style="margin-bottom:10px">品質：未検証／本人確認済み（機械的な整合性チェックのみ実施。意味内容までは検証していない）</div>
    <div class="small" style="margin-bottom:10px">${esc(set.title || set.url)}<br><span class="muted" style="word-break:break-all">${esc(set.url)}</span></div>
    <div class="small muted" style="margin-bottom:10px">${n}問${n < set.requestedCount ? `（依頼した${set.requestedCount}問のうち${n}問。AIが十分な品質の問題を作れなかった可能性）` : ""}</div>`;
  const totalWarn = warnings.setLevel.length + Object.values(warnings.perQ).reduce((a,arr)=>a+arr.length,0);
  if(totalWarn){
    h += `<details style="margin-bottom:10px"><summary class="small" style="cursor:pointer;color:var(--muted)">⚠ 品質に関する注意（${totalWarn}件）</summary>`;
    warnings.setLevel.forEach(w=> h += `<div class="small muted" style="margin:4px 0">・${esc(w)}</div>`);
    Object.keys(warnings.perQ).forEach(qid=>{
      const idx = set.questions.findIndex(q=>q.id===qid);
      warnings.perQ[qid].forEach(w=> h += `<div class="small muted" style="margin:4px 0">・問${idx+1}：${esc(w)}</div>`);
    });
    h += `</details>`;
  }
  h += `<div class="actions" style="margin-top:0">
    <button class="btn primary" onclick="startReadingQuiz('${id}')">問題を解く</button>
    <button class="btn small" onclick="toggleReadingArticle('${id}')">本文を読む</button>
    <button class="btn small" onclick="deleteReadingSet('${id}')">削除</button>
  </div>
  <div id="rdArticleBox" class="hidden" style="margin-top:12px"></div>
  </div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function toggleReadingArticle(id){
  const set = state.readingSets[id];
  const box = document.getElementById("rdArticleBox");
  if(!set || !box) return;
  if(box.classList.contains("hidden")){
    box.innerHTML = `<div class="rd-passage">${wrapTapWords(set.adaptedText).replace(/\n/g,"<br>")}</div>`;
    box.classList.remove("hidden");
  } else box.classList.add("hidden");
}
function deleteReadingSet(id){
  const set = state.readingSets[id];
  if(!set) return;
  if(!confirm(`「${set.title||set.url}」を削除する？（保存済みの個別問題は残る）`)) return;
  delete state.readingSets[id];
  save();
  openReadingHome();
}

let readingSession = null;
function startReadingQuiz(id){
  const set = state.readingSets[id];
  if(!set) return;
  readingSession = {setId:id, idx:0, results:[]};
  renderReadingQ();
}
// 出題画面で本文を常に見られるように。開閉できる<details>にして、
// 長い記事で問題文が埋もれないよう畳めるようにしつつ、デフォルトは開いた状態にする
// （本文を見ながら解きたいという要望のため）。
function readingPassageHtml(text){
  if(!text) return "";
  return `<details class="card" open style="margin-bottom:14px">
    <summary style="cursor:pointer;font-weight:600">記事本文</summary>
    <div class="rd-passage" style="margin-top:10px">${wrapTapWords(text).replace(/\n/g,"<br>")}</div>
  </details>`;
}
function renderReadingQ(){
  if(!readingSession) return openReadingHome();
  const set = state.readingSets[readingSession.setId];
  if(!set){ readingSession = null; return openReadingHome(); }
  if(readingSession.idx >= set.questions.length) return renderReadingResult();
  const q = set.questions[readingSession.idx];
  titleEl.textContent = "読解問題";
  setBack(()=>{ if(confirm("中断して読解セットに戻る？")){ const sid=readingSession.setId; readingSession=null; openReadingSet(sid); } }, "中断");
  const pct = Math.round(readingSession.idx / set.questions.length * 100);
  let h = `<div class="bar-progress"><div style="width:${pct}%"></div></div>`;
  h += readingPassageHtml(set.adaptedText);
  h += `<div class="card">`;
  h += `<div class="small muted" style="margin-bottom:6px">${readingSession.idx+1} / ${set.questions.length}</div>`;
  h += `<div class="prompt-fr">${esc(q.question_fr)}</div>`;
  h += `<div class="choices">`;
  q.choices.forEach((c,i)=>{
    h += `<button class="choice" data-i="${i}" onclick="submitReadingChoice(${i})"><span class="choice-n">${i+1}</span>${esc(c)}</button>`;
  });
  h += `</div><div id="fb"></div></div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
  mcqChoiceHandler = submitReadingChoice;
  document.onkeydown = mcqKeyHandler;
}
function submitReadingChoice(i){
  const set = state.readingSets[readingSession.setId];
  const q = set.questions[readingSession.idx];
  const correct = i === q.answer_index;
  document.querySelectorAll(".choice").forEach(btn=>{
    btn.disabled = true;
    const ci = +btn.dataset.i;
    if(ci === q.answer_index) btn.classList.add("ok");
    else if(ci === i) btn.classList.add("ng");
  });
  readingSession.results.push({qid:q.id, correct});
  const day = todayStamp();
  state.log[day] = (state.log[day]||0) + 1;
  save();
  const savedId = set.id + "__" + q.id;
  const isSaved = !!state.readingSaved[savedId];
  let fb = `<div class="small" style="margin-top:10px;color:${correct?"var(--accent)":"var(--bad)"}">${correct?"正解":"不正解"}</div>`;
  fb += `<div class="small muted" style="margin-top:6px">根拠：${wrapTapWords(q.evidence_fr)}</div>`;
  fb += `<div class="small" style="margin-top:6px">${esc(q.explanation_ja)}</div>`;
  fb += `<div class="actions">
    <button class="btn small ${isSaved?"primary":""}" id="rdSaveBtn" onclick="toggleSaveReadingQ('${set.id}','${q.id}')">${isSaved?"★保存済み":"☆この問題を保存"}</button>
    <button class="btn primary" id="rdNextBtn">${readingSession.idx+1 >= set.questions.length ? "結果を見る" : "次へ"}</button>
  </div>`;
  document.getElementById("fb").innerHTML = fb;
  document.getElementById("rdNextBtn").onclick = ()=>{ readingSession.idx++; renderReadingQ(); };
}
function toggleSaveReadingQ(setId, qid){
  const set = state.readingSets[setId];
  if(!set) return;
  const q = set.questions.find(x=>x.id===qid);
  if(!q) return;
  const savedId = setId + "__" + qid;
  if(state.readingSaved[savedId]){
    delete state.readingSaved[savedId];
  } else {
    state.readingSaved[savedId] = {
      id: savedId, setId, qid,
      url: set.url, title: set.title, cefr: set.cefr,
      question_fr: q.question_fr, choices: q.choices, answer_index: q.answer_index,
      evidence_fr: q.evidence_fr, explanation_ja: q.explanation_ja,
      articleText: set.adaptedText,
      savedAt: Date.now(),
    };
  }
  save();
  const btn = document.getElementById("rdSaveBtn");
  if(btn){
    const on = !!state.readingSaved[savedId];
    btn.textContent = on ? "★保存済み" : "☆この問題を保存";
    btn.classList.toggle("primary", on);
  }
}
function renderReadingResult(){
  const set = state.readingSets[readingSession.setId];
  const r = readingSession.results;
  const ok = r.filter(x=>x.correct).length;
  titleEl.textContent = "結果";
  setBack(null);
  let h = `<div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:600">${ok} / ${r.length}</div>
    <div class="muted small">正答</div>
  </div>`;
  h += `<div class="actions">
    <button class="btn primary" onclick="openReadingSet('${set.id}')">この記事に戻る</button>
    <button class="btn" onclick="openReadingHome()">読解ホームへ</button>
  </div>`;
  el.innerHTML = h;
  readingSession = null;
  window.scrollTo(0,0);
}

function openReadingSaved(){
  titleEl.textContent = "保存した読解問題";
  setBack(openReadingHome, "読解");
  const ids = Object.keys(state.readingSaved).sort((a,b)=>state.readingSaved[b].savedAt-state.readingSaved[a].savedAt);
  let h = "";
  if(!ids.length){
    h += `<div class="card"><p class="muted small" style="margin:0">まだ保存した問題がない。読解問題に答えたときに☆で保存できる。</p></div>`;
    el.innerHTML = h;
    return;
  }
  h += `<div class="card"><div class="actions" style="margin-top:0">
    <button class="btn primary" onclick="startSavedReadingQuiz()">まとめて復習（${ids.length}問）</button>
  </div></div>`;
  h += `<div class="card">`;
  ids.forEach(id=>{
    const s = state.readingSaved[id];
    h += `<div class="vl">
      <div class="spread">
        <div style="min-width:0">
          <span class="vl-fr" style="font-size:15px">${esc(s.question_fr)}</span>
          <span class="pill" style="margin-left:6px">${esc(s.cefr)}</span>
          <div class="small muted">${esc(s.title || s.url)}</div>
        </div>
        <button class="btn small" onclick="removeSavedReadingQ('${id}')">削除</button>
      </div>
    </div>`;
  });
  h += `</div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
}
function removeSavedReadingQ(id){
  delete state.readingSaved[id];
  save();
  openReadingSaved();
}
let savedReadingSession = null;
function startSavedReadingQuiz(){
  const ids = Object.keys(state.readingSaved);
  if(!ids.length) return;
  savedReadingSession = {ids, idx:0, results:[]};
  renderSavedReadingQ();
}
function renderSavedReadingQ(){
  if(!savedReadingSession) return openReadingSaved();
  if(savedReadingSession.idx >= savedReadingSession.ids.length) return renderSavedReadingResult();
  const s = state.readingSaved[savedReadingSession.ids[savedReadingSession.idx]];
  if(!s){ savedReadingSession.idx++; return renderSavedReadingQ(); }
  titleEl.textContent = "保存した問題";
  setBack(()=>{ if(confirm("中断して戻る？")){ savedReadingSession=null; openReadingSaved(); } }, "中断");
  const pct = Math.round(savedReadingSession.idx / savedReadingSession.ids.length * 100);
  let h = `<div class="bar-progress"><div style="width:${pct}%"></div></div>`;
  h += readingPassageHtml(s.articleText);
  h += `<div class="card">`;
  h += `<div class="small muted" style="margin-bottom:6px">${savedReadingSession.idx+1} / ${savedReadingSession.ids.length}</div>`;
  h += `<div class="prompt-fr">${esc(s.question_fr)}</div>`;
  h += `<div class="choices">`;
  s.choices.forEach((c,i)=>{
    h += `<button class="choice" data-i="${i}" onclick="submitSavedReadingChoice(${i})"><span class="choice-n">${i+1}</span>${esc(c)}</button>`;
  });
  h += `</div><div id="fb"></div></div>`;
  el.innerHTML = h;
  window.scrollTo(0,0);
  mcqChoiceHandler = submitSavedReadingChoice;
  document.onkeydown = mcqKeyHandler;
}
function submitSavedReadingChoice(i){
  const s = state.readingSaved[savedReadingSession.ids[savedReadingSession.idx]];
  const correct = i === s.answer_index;
  document.querySelectorAll(".choice").forEach(btn=>{
    btn.disabled = true;
    const ci = +btn.dataset.i;
    if(ci === s.answer_index) btn.classList.add("ok");
    else if(ci === i) btn.classList.add("ng");
  });
  savedReadingSession.results.push(correct);
  const day = todayStamp();
  state.log[day] = (state.log[day]||0) + 1;
  save();
  let fb = `<div class="small" style="margin-top:10px;color:${correct?"var(--accent)":"var(--bad)"}">${correct?"正解":"不正解"}</div>`;
  fb += `<div class="small muted" style="margin-top:6px">根拠：${wrapTapWords(s.evidence_fr)}</div>`;
  fb += `<div class="small" style="margin-top:6px">${esc(s.explanation_ja)}</div>`;
  fb += `<div class="actions"><button class="btn primary" id="rdNextBtn">${savedReadingSession.idx+1 >= savedReadingSession.ids.length ? "結果を見る":"次へ"}</button></div>`;
  document.getElementById("fb").innerHTML = fb;
  document.getElementById("rdNextBtn").onclick = ()=>{ savedReadingSession.idx++; renderSavedReadingQ(); };
}
function renderSavedReadingResult(){
  const r = savedReadingSession.results;
  const ok = r.filter(Boolean).length;
  titleEl.textContent = "結果";
  setBack(null);
  let h = `<div class="card" style="text-align:center">
    <div style="font-size:34px;font-weight:600">${ok} / ${r.length}</div>
    <div class="muted small">正答</div>
  </div>`;
  h += `<div class="actions"><button class="btn primary" onclick="openReadingSaved()">保存した問題へ</button></div>`;
  el.innerHTML = h;
  savedReadingSession = null;
  window.scrollTo(0,0);
}

/* ---------- 起動 ---------- */
window.addEventListener("error", e=>{
  console.error("app error:", e.message);
  showErrorBanner("エラーが発生しました： " + e.message + "（この帯の内容をスクショで送ってもらえると原因が分かります）");
});
window.addEventListener("unhandledrejection", e=>{
  const m = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
  console.error("app promise error:", m);
  showErrorBanner("エラーが発生しました(非同期)： " + m + "（この帯の内容をスクショで送ってもらえると原因が分かります）");
});
applyUiTheme();
renderHome();

if ("serviceWorker" in navigator) {
  const registerWorker = () => {
    if(location.protocol === "file:") return;
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  };
  if(document.readyState === "complete") registerWorker();
  else window.addEventListener("load", registerWorker);
}
