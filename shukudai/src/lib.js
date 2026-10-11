/* 宿題メーカーの画面に依存しない処理（ふりがな・活用・漢字の範囲・問題の記法・AI用プロンプト）。
   node からも読めるようにしてある（test/test_lib.mjs）。 */
const SL = (() => {
  // ---------- 漢字の範囲（目安） ----------
  // 一般に出回っている JLPT 漢字リストを参考にした目安。公式の出題基準ではない。
  // 画面の「追加の漢字」で先生が足し引きできる。
  const KANJI_N5 = '日一国人年大十二本中長出三時行見月後前生五間上東四今金九入学高円子外八六下来気小七山話女北午百書先名川千水半男西電校語土木聞食車何南万毎白天母火右読友左休父雨';
  const KANJI_N4 = '会同事自社発者地業方新場員立開手力問代明動京目通言理体田主題意不作用度強公持野以思家世多正安院心界教文元重近考画海売知道集別物使品計死特私始朝運終台広住無真有口少町料工建空急止送切転研足究楽起着店病質待試族銀早映親験英医仕去味写字答夜音注帰古歌買悪図週室歩風紙黒花春赤青館屋色走秋夏習駅洋旅服夕借曜飲肉貸堂鳥飯勉冬昼茶弟牛魚兄犬妹姉漢';

  const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々〆]/;
  const isKanji = ch => KANJI_RE.test(ch);
  const hasKanji = s => [...(s || '')].some(isKanji);
  const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function allowedSet(range, extra) {
    let base = range === 'N5' ? KANJI_N5 : range === 'N4' ? KANJI_N5 + KANJI_N4 : '';
    const set = new Set([...base].filter(isKanji));
    for (const ch of String(extra || '')) if (isKanji(ch)) set.add(ch);
    return set;
  }
  // 範囲外の漢字（々は数えない）
  const outside = (text, allowed) => [...new Set([...(text || '')].filter(ch => isKanji(ch) && ch !== '々' && !allowed.has(ch)))];

  // ---------- ふりがな ----------
  // segs: [[文字列, 読み|null], ...]。読みは漢字のまとまりに付く（1字ずつではなく熟語単位）。
  function runs(w) {
    const out = [];
    for (const ch of w) {
      const k = isKanji(ch), last = out[out.length - 1];
      if (last && last.k === k) last.t += ch; else out.push({ t: ch, k });
    }
    return out;
  }
  // 表記と読みから、漢字のまとまりごとの読みを割り出す。送りがなが合わなければ語全体に読みを付ける。
  function align(w, r) {
    w = String(w || ''); r = String(r || '');
    if (!hasKanji(w)) return { segs: [[w, null]], ok: true };
    const rs = runs(w);
    const pattern = '^' + rs.map(x => x.k ? '(.+?)' : reEsc(toHira(x.t))).join('') + '$';
    const m = toHira(r).match(new RegExp(pattern, 'u'));
    if (!m) return { segs: [[w, toHira(r)]], ok: false };
    let g = 1;
    return { segs: rs.map(x => x.k ? [x.t, m[g++]] : [x.t, null]), ok: true };
  }
  // {漢字|かんじ} 記法を segs にする。読みのない漢字は [字, null] のまま（範囲チェックで指摘する）。
  const RUBY_RE = /\{([^{}|]+)\|([^{}]+)\}/g;
  function parseRuby(s) {
    const segs = []; let last = 0; s = String(s || '');
    for (const m of s.matchAll(RUBY_RE)) {
      if (m.index > last) segs.push([s.slice(last, m.index), null]);
      segs.push([m[1], toHira(m[2])]);
      last = m.index + m[0].length;
    }
    if (last < s.length) segs.push([s.slice(last), null]);
    return segs;
  }
  const segsText = segs => segs.map(x => x[0]).join('');
  const segsReading = segs => segs.map(([t, r]) => r ?? toHira(t)).join('');
  const segsNotation = segs => segs.map(([t, r]) => r && hasKanji(t) ? `{${t}|${r}}` : t).join('');
  // ふりがなのない漢字（範囲外のもの）を返す
  function unannotated(segs, allowed) {
    const out = new Set();
    for (const [t, r] of segs) if (!r) for (const ch of outside(t, allowed)) out.add(ch);
    return [...out];
  }
  /* policy:
     all     … 漢字すべてにふりがな
     outside … 範囲外の漢字を含むまとまりにだけふりがな（既定）
     kana    … 範囲外の漢字を含むまとまりはひらがなで書く
     none    … ふりがななし */
  function renderSegs(segs, policy, allowed) {
    let html = '';
    for (const [t, r] of segs) {
      if (!r || !hasKanji(t) || policy === 'none') { html += esc(t); continue; }
      const out = outside(t, allowed).length > 0;
      if (policy === 'all' || (policy === 'outside' && out)) html += `<ruby>${esc(t)}<rt>${esc(r)}</rt></ruby>`;
      else if (policy === 'kana' && out) html += esc(r);
      else html += esc(t);
    }
    return html;
  }
  const rubyHtml = (notation, policy, allowed) => renderSegs(parseRuby(notation), policy, allowed);

  // ［煙草を］吸います → 前置きの［…］と本体に分ける
  function splitCtx(w, r) {
    const cw = String(w).match(/^［[^］]*］/), cr = String(r).match(/^［[^］]*］/);
    if (!cw || !cr) return { ctxW: '', ctxR: '', w: String(w), r: String(r) };
    return { ctxW: cw[0], ctxR: cr[0], w: String(w).slice(cw[0].length), r: String(r).slice(cr[0].length) };
  }

  // ---------- 動詞の活用 ----------
  const FORMS = [
    { key: 'masu', ja: 'ます{形|けい}', en: 'masu-form', fr: 'forme en -masu' },
    { key: 'dict', ja: '{辞書形|じしょけい}', en: 'dictionary form', fr: 'forme du dictionnaire' },
    { key: 'nai', ja: 'ない{形|けい}', en: 'nai-form', fr: 'forme en -nai' },
    { key: 'nakatta', ja: 'なかった{形|けい}', en: 'nakatta-form', fr: 'forme en -nakatta' },
    { key: 'te', ja: 'て{形|けい}', en: 'te-form', fr: 'forme en -te' },
    { key: 'ta', ja: 'た{形|けい}', en: 'ta-form', fr: 'forme en -ta' },
    { key: 'tai', ja: 'たい{形|けい}', en: 'tai-form', fr: 'forme en -tai' },
    { key: 'pot', ja: '{可能形|かのうけい}', en: 'potential', fr: 'forme potentielle' },
    { key: 'vol', ja: '{意向形|いこうけい}', en: 'volitional', fr: 'forme volitive' },
    { key: 'imp', ja: '{命令形|めいれいけい}', en: 'imperative', fr: 'impératif' },
    { key: 'proh', ja: '{禁止形|きんしけい}', en: 'prohibitive', fr: 'forme prohibitive' },
    { key: 'ba', ja: 'ば{形|けい}', en: 'ba-conditional', fr: 'conditionnel en -ba' },
    { key: 'pass', ja: '{受身形|うけみけい}', en: 'passive', fr: 'forme passive' },
    { key: 'caus', ja: '{使役形|しえきけい}', en: 'causative', fr: 'forme causative' },
  ];
  const G = {
    'き': ['か', 'く', 'け', 'こ', 'いて', 'いた'], 'ぎ': ['が', 'ぐ', 'げ', 'ご', 'いで', 'いだ'],
    'し': ['さ', 'す', 'せ', 'そ', 'して', 'した'], 'ち': ['た', 'つ', 'て', 'と', 'って', 'った'],
    'に': ['な', 'ぬ', 'ね', 'の', 'んで', 'んだ'], 'び': ['ば', 'ぶ', 'べ', 'ぼ', 'んで', 'んだ'],
    'み': ['ま', 'む', 'め', 'も', 'んで', 'んだ'], 'り': ['ら', 'る', 'れ', 'ろ', 'って', 'った'],
    'い': ['わ', 'う', 'え', 'お', 'って', 'った'],
  };
  // 意志で行う動作ではないので、可能・意向・命令・禁止・受身・使役・たい形を作らない動詞（読みのます語幹で判定）
  const NON_VOLITIONAL = new Set(['わかり', 'でき', 'あり', 'いり', 'みえ', 'きこえ']);
  const VOLITIONAL_FORMS = new Set(['tai', 'pot', 'vol', 'imp', 'proh', 'pass', 'caus']);
  const ICHIDAN = { dict: 'る', nai: 'ない', nakatta: 'なかった', te: 'て', ta: 'た', tai: 'たい', pot: 'られる', vol: 'よう', imp: 'ろ', proh: 'るな', ba: 'れば', pass: 'られる', caus: 'させる' };
  const SURU = { dict: 'する', nai: 'しない', nakatta: 'しなかった', te: 'して', ta: 'した', tai: 'したい', pot: 'できる', vol: 'しよう', imp: 'しろ', proh: 'するな', ba: 'すれば', pass: 'される', caus: 'させる' };
  const KURU = { dict: ['く', 'る'], nai: ['こ', 'ない'], nakatta: ['こ', 'なかった'], te: ['き', 'て'], ta: ['き', 'た'], tai: ['き', 'たい'], pot: ['こ', 'られる'], vol: ['こ', 'よう'], imp: ['こ', 'い'], proh: ['く', 'るな'], ba: ['く', 'れば'], pass: ['こ', 'られる'], caus: ['こ', 'させる'] };

  // w, r はます形（前置きの［…］は外したもの）。返り値は {w, r}、作れないときは null。
  function conjugate(w, r, pos, form) {
    w = String(w || ''); r = toHira(r);
    if (!w.endsWith('ます') || !r.endsWith('ます')) return null;
    const wS = w.slice(0, -2), rS = r.slice(0, -2);
    if (form === 'masu') return { w, r };
    if (VOLITIONAL_FORMS.has(form) && NON_VOLITIONAL.has(rS)) return null;
    if (pos === '一段動詞') {
      let suf = ICHIDAN[form];
      if (!suf) return null;
      if (form === 'imp' && rS === 'くれ') suf = '';
      return { w: wS + suf, r: rS + suf };
    }
    if (pos === '不規則動詞') {
      if (wS.endsWith('し') && rS.endsWith('し')) {
        const suf = SURU[form];
        return suf ? { w: wS.slice(0, -1) + suf, r: rS.slice(0, -1) + suf } : null;
      }
      if (rS.endsWith('き') && (wS.endsWith('来') || wS.endsWith('き'))) {
        const k = KURU[form]; if (!k) return null;
        const pw = wS.slice(0, -1), pr = rS.slice(0, -1);
        return { w: pw + (wS.endsWith('来') ? '来' : k[0]) + k[1], r: pr + k[0] + k[1] };
      }
      return null;
    }
    if (pos !== '五段動詞') return null;
    const c = rS.slice(-1);
    if (!G[c] || wS.slice(-1) !== c) return null;
    const wb = wS.slice(0, -1), rb = rS.slice(0, -1);
    // いらっしゃいます・なさいます・くださいます・おっしゃいます・ございます は「る」の動詞
    const keigo = c === 'い' && /(いらっしゃ|なさ|くださ|おっしゃ|ござ)$/.test(rb);
    if (keigo && ['tai', 'pot', 'pass', 'caus'].includes(form)) return null;
    const [a, u, e, o, te, ta] = keigo ? G['り'] : G[c];
    const iku = c === 'き' && rb.endsWith('い') && /[行い]$/.test(wb);
    const aru = rS === 'あり';
    const build = suf => ({ w: wb + suf, r: rb + suf });
    switch (form) {
      case 'dict': return build(u);
      case 'nai': return aru ? { w: 'ない', r: 'ない' } : build(a + 'ない');
      case 'nakatta': return aru ? { w: 'なかった', r: 'なかった' } : build(a + 'なかった');
      case 'te': return build(iku ? 'って' : te);
      case 'ta': return build(iku ? 'った' : ta);
      case 'tai': return { w: wS + 'たい', r: rS + 'たい' };
      case 'pot': return build(e + 'る');
      case 'vol': return build(o + 'う');
      case 'imp': return keigo ? { w: wS, r: rS } : build(e);
      case 'proh': return build(u + 'な');
      case 'ba': return build(e + 'ば');
      case 'pass': return build(a + 'れる');
      case 'caus': return build(a + 'せる');
    }
    return null;
  }

  // ---------- 先生が書く問題の記法 ----------
  // {漢字|よみ} ふりがな / [答え] または 【答え】 穴埋め / 「 / 」並べ替えの区切り / 「 => 」答えの例
  function parseLine(line, type) {
    line = String(line || '').trim();
    if (!line || line.startsWith('#')) return null;
    let note = '';
    const arrow = line.indexOf('=>');
    if (arrow >= 0) { note = line.slice(arrow + 2).trim(); line = line.slice(0, arrow).trim(); }
    if (type === 'order') {
      const chunks = line.split(/\s*[/／]\s*/).map(s => s.trim()).filter(Boolean);
      return { type, chunks, answer: chunks.join(''), note };
    }
    if (type === 'fill') {
      const parts = []; let last = 0;
      for (const m of line.matchAll(/\[([^\[\]]+)\]|【([^【】]+)】/g)) {
        if (m.index > last) parts.push({ text: line.slice(last, m.index) });
        parts.push({ blank: (m[1] ?? m[2]).trim() });
        last = m.index + m[0].length;
      }
      if (last < line.length) parts.push({ text: line.slice(last) });
      return { type, parts, answer: parts.filter(p => p.blank).map(p => p.blank).join('、'), note };
    }
    return { type, text: line, answer: note, note: '' };
  }
  // 1行ずつ解析して、範囲外でふりがなのない漢字を集める
  function checkLines(text, type, allowed) {
    const items = [], problems = [];
    String(text || '').split(/\r?\n/).forEach((line, i) => {
      const q = parseLine(line, type);
      if (!q) return;
      const raw = line.replace(/=>.*/, '');
      const missing = unannotated(parseRuby(raw.replace(/[\[\]【】]/g, '')), allowed);
      if (type === 'fill' && !q.parts.some(p => p.blank)) problems.push({ line: i + 1, kind: 'noBlank' });
      if (type === 'order' && q.chunks.length < 2) problems.push({ line: i + 1, kind: 'noChunks' });
      if (missing.length) problems.push({ line: i + 1, kind: 'kanji', chars: missing });
      items.push(q);
    });
    return { items, problems };
  }

  // 単語リストから「漢字のまとまり → 読み」の表を作る（活用形も入れる）。
  // 1字だけのまとまりは送りがなの1字目も合わせて引く（行く/行う のような取り違えを避ける）。
  function buildReadingMap(words) {
    const map = new Map();
    const add = (w, r) => {
      const { segs, ok } = align(w, r); if (!ok) return;
      segs.forEach(([t, rd], i) => {
        if (!rd) return;
        const next = (segs[i + 1]?.[0] || '')[0] || '';
        const key = [...t].length === 1 ? t + '|' + next : t;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key).add(rd);
      });
    };
    for (const v of words) {
      const s = splitCtx(v.w, v.r);
      add(s.ctxW, s.ctxR); add(s.w, s.r);
      if (/動詞/.test(v.pos)) for (const f of FORMS) { const c = conjugate(s.w, s.r, v.pos, f.key); if (c) add(c.w, c.r); }
    }
    return map;
  }
  // ふりがなのない漢字に、単語リストから読みが1つに決まるものだけ {漢字|よみ} を付ける
  function autoRuby(text, map) {
    const unknown = new Set();
    const lines = String(text || '').split(/\r?\n/).map(line => {
      let out = '', last = 0;
      const fix = plain => plain.replace(/[㐀-䶿一-鿿豈-﫿々〆]+/g, (run, off, whole) => {
        const next = whole[off + run.length] || '';
        let hits = map.get([...run].length === 1 ? run + '|' + next : run);
        // 1字の名詞（本・上 など）は単語リストでは語末なので、後ろが助詞・句読点のときだけ語末の読みを使う
        if (!hits && [...run].length === 1 && /^[をにではのもへとや、。！？!?\s」）)]?$/.test(next)) hits = map.get(run + '|');
        if (hits && hits.size === 1) return `{${run}|${[...hits][0]}}`;
        unknown.add(run); return run;
      });
      for (const m of line.matchAll(RUBY_RE)) { out += fix(line.slice(last, m.index)) + m[0]; last = m.index + m[0].length; }
      return out + fix(line.slice(last));
    });
    return { text: lines.join('\n'), unknown: [...unknown] };
  }

  // ---------- 乱数（宿題ごとに同じ並びを再現する） ----------
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- AI に貼るプロンプト（アプリからは送信しない） ----------
  function meaningPrompt(words) {
    return [
      '次の日本語の単語に、日本語を学ぶ初級者のための短い訳を付けてください。',
      '・英語とフランス語の両方を書く。それぞれ1〜4語程度。',
      '・動詞は「ます形」で書いてあるが、訳は英語は to なしの原形、フランス語は不定詞にする。',
      '・［ ］の中は使い方の例なので訳さない。',
      '・出力は1行1語で「ID|English|Français」の形だけにする。前置き・説明・番号・空行は書かない。',
      '',
      ...words.map(v => `${v.id}|${v.w}（${v.r}）|${v.pos || ''}`),
    ].join('\n');
  }
  function parseMeaningReply(text, validIds) {
    const out = {};
    for (const raw of String(text || '').split(/\r?\n/)) {
      const parts = raw.replace(/^[\s`*-]+/, '').split('|').map(s => s.trim());
      const id = parts[0];
      if (!validIds.has(id) || parts.length < 3) continue;
      const rest = parts.slice(1).filter(Boolean);
      // AI が語や読みを書き足してきたときは、後ろの2つを英・仏として使う
      const [en, fr] = rest.length >= 2 ? rest.slice(-2) : [rest[0] || '', ''];
      out[id] = { en, fr };
    }
    return out;
  }
  const TYPE_RULES = {
    fill: ['答えにする部分を半角の [ ] で囲む。1問に1か所。', '例: きのう {図書館|としょかん}で {本|ほん}を [{読|よ}みました]。'],
    order: ['文を4〜5のまとまりに分けて、半角スラッシュ「 / 」で区切る。正しい順番のまま書く（並べ替えはアプリが行う）。', '例: わたしは / まいあさ / コーヒーを / {飲|の}みます。'],
    free: ['質問の文のあとに「 => 」を書き、答えの例を続ける。', '例: しゅうまつは {何|なに}を しますか。 => ともだちと テニスを します。'],
  };
  const TYPE_NAMES = { fill: '穴埋め問題', order: '並べ替え問題', free: '質問に答える問題' };
  function questionPrompt({ words, level, type, count, allowed }) {
    const rules = TYPE_RULES[type] || TYPE_RULES.free;
    return [
      `日本語の先生の宿題づくりを手伝ってください。JLPT ${level} レベルの学習者向けに、${TYPE_NAMES[type] || TYPE_NAMES.free}を${count}問作ってください。`,
      '',
      '使う単語（1問に1語以上。なるべく全部使う）:',
      ...words.map(v => `- ${v.w}（${v.r}）`),
      '',
      '条件:',
      `- 語彙と文法は JLPT ${level} の範囲だけを使う。`,
      allowed && allowed.size ? `- 漢字は次の字だけを使い、ほかはひらがなで書く: ${[...allowed].join('')}` : '- 漢字は初級で習うものだけにする。',
      '- 漢字にはすべて {漢字|よみ} の形でふりがなを付ける。例: {図書館|としょかん}で {本|ほん}を {読|よ}みました。',
      `- ${rules[0]}`,
      `- ${rules[1]}`,
      '- 1行に1問。番号・説明・空行・見出しは書かない。',
    ].join('\n');
  }

  return {
    KANJI_N5, KANJI_N4, FORMS, isKanji, hasKanji, toHira, esc, allowedSet, outside,
    align, parseRuby, segsText, segsReading, segsNotation, unannotated, renderSegs, rubyHtml, splitCtx,
    conjugate, parseLine, checkLines, buildReadingMap, autoRuby, rng, shuffle,
    meaningPrompt, parseMeaningReply, questionPrompt,
  };
})();
if (typeof module !== 'undefined') module.exports = SL;
