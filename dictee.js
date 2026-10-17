'use strict';
const $=id=>document.getElementById(id), safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.normalize('NFC').toLocaleLowerCase('fr').replace(/[’‘]/g,"'").replace(/œ/g,'oe').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
if(location.pathname.startsWith('/practice/'))document.querySelector('.back').href='/';
let historyToken=null;const nativePractice=location.pathname.startsWith('/practice/');
const key='grammaire-audio-dictee-v1';let items=[],queue=[],index=0,onlyMistakes=false,scored=false,records={};
try{records=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
function identity(p){return p.id+':'+p.textHash;}
function persist(){try{localStorage.setItem(key,JSON.stringify(records));}catch{$('summary').textContent='この環境では復習履歴を保存できません。';}}
function buildQueue(){const lesson=$('lesson').value;queue=items.filter(p=>(!lesson||p.lessonId===lesson)&&(!onlyMistakes||records[identity(p)]?.wrong));index=0;show();}
function show(){
  $('audio').pause();$('answer').value='';$('feedback').innerHTML='';scored=false;
  const p=queue[index];for(const id of ['listen','check','reveal','next','answer'])$(id).disabled=!p;
  $('summary').textContent=`登録音声 ${items.length}文 · 復習が必要 ${items.filter(p=>records[identity(p)]?.wrong).length}文`;
  if(!p){$('audio').removeAttribute('src');$('progress').textContent=onlyMistakes?'この教材に復習が必要な文はありません。':items.length?'この教材の登録音声はありません。':'音声を登録すると、ここでディクテを練習できます。';return;}
  $('progress').textContent=`${index+1} / ${queue.length} · ${p.lessonTitle||p.lessonId}`;
  $('audio').src=p.asset;$('audio').playbackRate=Number($('rate').value);
}
function play(){$('audio').play().catch(()=>$('progress').textContent='再生できませんでした。音声の公開・保存状態を確認してください。');}
function check(reveal=false){
  const p=queue[index];if(!p)return;
  const expected=normalize(p.text).split(' '),actual=normalize($('answer').value).split(' '),correct=!reveal&&normalize(p.text)===normalize($('answer').value);
  // LCS aligns omissions without marking every later word wrong.
  const dp=Array.from({length:expected.length+1},()=>new Uint16Array(actual.length+1));
  for(let i=1;i<=expected.length;i++)for(let j=1;j<=actual.length;j++)dp[i][j]=expected[i-1]===actual[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
  const matched=new Set();let i=expected.length,j=actual.length;while(i&&j){if(expected[i-1]===actual[j-1]){matched.add(i-1);i--;j--;}else if(dp[i-1][j]>=dp[i][j-1])i--;else j--;}
  $('feedback').className=correct?'correct':'incorrect';
  $('feedback').innerHTML=`<strong>${correct?'正解です！':reveal?'正解を確認して、もう一度聞いてみましょう。':'違っていた単語を確かめましょう。'}</strong><p class="answer-fr">${safe(p.text)}</p>${correct||reveal?'':`<p class="answer-words" lang="fr">${expected.map((w,i)=>`<span class="${matched.has(i)?'':'wrong'}">${safe(w)}</span>`).join(' ')}</p>`}<p>${safe(p.ja||'')}</p>`;
  if(!scored){const old=records[identity(p)]||{attempts:0};records[identity(p)]={attempts:old.attempts+1,wrong:!correct,updatedAt:Date.now()};persist();if(nativePractice&&historyToken)fetch('/api/dictee-history',{method:'POST',headers:{'Content-Type':'application/json','X-Grammaire-Token':historyToken},body:JSON.stringify({id:p.id,textHash:p.textHash,wrong:!correct})}).catch(()=>$('summary').textContent='履歴を保存できませんでした。');scored=true;}
  $('summary').textContent=`登録音声 ${items.length}文 · 復習が必要 ${items.filter(p=>records[identity(p)]?.wrong).length}文`;
}
$('listen').onclick=play;$('answerForm').onsubmit=e=>{e.preventDefault();check();};$('reveal').onclick=()=>check(true);
$('next').onclick=()=>{if(queue.length){index=(index+1)%queue.length;show();$('answer').focus();}};
$('rate').onchange=()=>$('audio').playbackRate=Number($('rate').value);$('lesson').onchange=buildQueue;
$('mistakes').onclick=()=>{onlyMistakes=true;buildQueue();};$('all').onclick=()=>{onlyMistakes=false;buildQueue();};
$('answer').onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();check();}};
(async()=>{try{if(nativePractice){const r=await fetch('/api/dictee-history');if(r.ok){const h=await r.json();historyToken=h.token;records=h.records;}}const response=await fetch('audio-manifest.json');if(!response.ok)throw Error();const data=await response.json();items=data.items.filter(p=>p.text&&p.asset&&p.language!=='ja');const lessons=new Map(items.map(p=>[p.lessonId,p.lessonTitle||p.lessonId]));$('lesson').innerHTML='<option value="">すべての教材</option>'+[...lessons].map(([id,title])=>`<option value="${safe(id)}">${safe(title)}</option>`).join('');show();buildQueue();}catch{$('progress').textContent='教材音声の一覧を読み込めませんでした。';for(const id of ['listen','check','reveal','next'])$(id).disabled=true;}})();
