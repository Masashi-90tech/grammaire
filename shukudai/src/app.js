'use strict';
/* 宿題メーカー（JLPT N5・N4）。単語を選ぶ → 問題を組む → スライド/A4で印刷・PDF。
   データは端末内（localStorage）だけに保存し、外部には送らない。AIはプロンプトをコピーして使う往復方式。 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = SL.esc;

  // ---------- エラーは握りつぶさず画面上部に出す ----------
  function showErrorBanner(msg) {
    let b = document.getElementById('errBanner');
    if (!b) { b = document.createElement('div'); b.id = 'errBanner'; b.className = 'err-banner'; b.onclick = () => b.remove(); document.body.appendChild(b); }
    b.textContent = msg + '\n（タップで閉じる）';
  }
  window.addEventListener('error', e => showErrorBanner('エラー: ' + (e.message || e)));
  window.addEventListener('unhandledrejection', e => showErrorBanner('エラー: ' + (e.reason?.message || e.reason)));
  const guard = (name, fn) => (...a) => { try { return fn(...a); } catch (e) { console.error(e); showErrorBanner(`${name}でエラー: ${e.message}`); } };

  // ---------- 保存 ----------
  const STORE_KEY = 'shukudai.v1';
  const DEFAULT_SETTINGS = { lang: 'ja-en', range: 'N5', extraKanji: '', policy: 'outside', format: 'slide', answers: 'end', size: 'normal', font: 'gothic', nameLine: true };
  const emptyStore = () => ({ version: 1, homeworks: {}, meanings: {}, overrides: {}, custom: {}, currentId: null, ui: { tab: 'words' } });
  function normalizeHw(h) {
    h.settings = Object.assign({}, DEFAULT_SETTINGS, h.settings || {});
    h.words = Array.isArray(h.words) ? h.words : [];
    h.sections = (Array.isArray(h.sections) ? h.sections : []).filter(s => TYPES[s.type]).map(s => Object.assign(newSection(s.type), s));
    h.seed = h.seed || 1;
    return h;
  }
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const s = Object.assign(emptyStore(), raw ? JSON.parse(raw) : {});
      for (const id of Object.keys(s.homeworks)) normalizeHw(s.homeworks[id]);
      s.ui = Object.assign({ tab: 'words' }, s.ui || {});
      return s;
    } catch (e) {
      setTimeout(() => showErrorBanner('保存データを読み込めませんでした: ' + e.message));
      return emptyStore();
    }
  }
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); };
  function saveNow() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
    catch (e) { showErrorBanner('この端末に保存できませんでした（' + e.message + '）。「一覧」の「書き出す」で控えを取ってください。'); }
  }
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  // ---------- 問題の種類 ----------
  const TYPES = {
    wordlist: { label: '単語リスト', cols: 2, count: 0, ins: { ja: '{今日|きょう}の ことば', en: 'Vocabulary', fr: 'Vocabulaire' } },
    reading: { label: '読み方を書く', cols: 2, count: 10, ins: { ja: '{読|よ}み{方|かた}を ひらがなで {書|か}いて ください。', en: 'Write the reading in hiragana.', fr: 'Écrivez la lecture en hiragana.' } },
    writing: { label: '漢字で書く', cols: 2, count: 10, ins: { ja: '{漢字|かんじ}で {書|か}いて ください。', en: 'Write the underlined words in kanji.', fr: 'Écrivez les mots soulignés en kanji.' } },
    meaning: { label: '意味を書く', cols: 2, count: 10, ins: { ja: '{意味|いみ}を {書|か}いて ください。', en: 'Write the meaning.', fr: 'Écrivez le sens.' } },
    translate: { label: '日本語で書く', cols: 2, count: 10, ins: { ja: '{日本語|にほんご}で {書|か}いて ください。', en: 'Write the word in Japanese.', fr: 'Écrivez le mot en japonais.' } },
    match: { label: '線で結ぶ', cols: 1, count: 6, ins: { ja: '{線|せん}で むすんで ください。', en: 'Draw lines to match.', fr: 'Reliez par un trait.' } },
    conj: { label: '動詞の形を変える', cols: 1, count: 6, ins: { ja: '{動詞|どうし}の {形|かたち}を {変|か}えて ください。', en: 'Change the verb forms.', fr: 'Transformez les verbes.' } },
    sentence: { label: '文を作る', cols: 1, count: 5, ins: { ja: 'ことばを {使|つか}って {文|ぶん}を {作|つく}って ください。', en: 'Make a sentence with each word.', fr: 'Faites une phrase avec chaque mot.' } },
    fill: { label: '穴埋め（自分で書く）', cols: 1, custom: true, ins: { ja: '（　）に ことばを {入|い}れて ください。', en: 'Fill in the blanks.', fr: 'Complétez les phrases.' } },
    order: { label: '並べ替え（自分で書く）', cols: 1, custom: true, ins: { ja: 'ならべかえて {文|ぶん}を {作|つく}って ください。', en: 'Put the words in the right order.', fr: 'Remettez les mots dans l’ordre.' } },
    free: { label: '質問・自由問題（自分で書く）', cols: 1, custom: true, ins: { ja: '{質問|しつもん}に {答|こた}えて ください。', en: 'Answer the questions.', fr: 'Répondez aux questions.' } },
  };
  const TYPE_ORDER = ['wordlist', 'reading', 'writing', 'meaning', 'translate', 'match', 'conj', 'sentence', 'fill', 'order', 'free'];
  const POS_LIST = ['名詞', '五段動詞', '一段動詞', '不規則動詞', 'い形容詞', 'な形容詞', '副詞', '表現', 'その他'];
  const POS_GROUPS = ['名詞', '動詞', 'い形容詞', 'な形容詞', '副詞', '表現', 'その他'];
  const posGroup = p => /動詞/.test(p) ? '動詞' : p;
  const LANGS = { ja: '日本語のみ', 'ja-en': '日本語＋英語', 'ja-fr': '日本語＋フランス語', en: '英語', fr: 'フランス語' };
  const LABEL = {
    name: { ja: 'なまえ', en: 'Name', fr: 'Nom' },
    answers: { ja: 'こたえ', en: 'Answers', fr: 'Corrigé' },
    cont: { ja: '（つづき）', en: '(continued)', fr: '(suite)' },
  };
  const label = (key, lang) => {
    const L = LABEL[key];
    if (lang === 'ja') return L.ja;
    if (lang === 'en' || lang === 'fr') return L[lang];
    return key === 'cont' ? L.ja : `${L.ja} / ${L[lang.slice(3)]}`;
  };
  const meaningLang = S => /en$/.test(S.lang) ? 'en' : /fr$/.test(S.lang) ? 'fr' : null;

  function newSection(type) {
    const t = TYPES[type];
    return { id: 's' + Math.random().toString(36).slice(2, 9), type, count: t.count, forms: ['dict', 'nai', 'te', 'ta'], mode: 'reading', inRangeOnly: type === 'writing', text: '', ins: { ja: '', en: '', fr: '' } };
  }
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function newHomework() {
    return normalizeHw({
      id: 'hw-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'しゅくだい', date: todayStr(),
      createdAt: Date.now(), updatedAt: Date.now(), words: [], seed: Math.floor(Math.random() * 2 ** 31),
      settings: { ...DEFAULT_SETTINGS }, sections: ['wordlist', 'reading', 'writing', 'conj'].map(newSection),
    });
  }

  let store = loadStore();
  function hw() {
    let h = store.homeworks[store.currentId];
    if (!h) {
      const latest = Object.values(store.homeworks).sort((a, b) => b.updatedAt - a.updatedAt)[0];
      h = latest || newHomework();
      store.homeworks[h.id] = h; store.currentId = h.id; save();
    }
    return h;
  }
  const touch = () => { hw().updatedAt = Date.now(); save(); updateTopbar(); };
  const settings = h => h.settings;
  const allowedOf = h => SL.allowedSet(h.settings.range, h.settings.extraKanji);

  // ---------- 単語 ----------
  const BASE = window.SHUKUDAI_VOCAB || [];
  const BASE_BY_ID = new Map(BASE.map(v => [v.id, v]));
  function word(id) {
    const b = BASE_BY_ID.get(id) || store.custom[id];
    if (!b) return null;
    const o = store.overrides[id] || {}, m = store.meanings[id] || {};
    return { ...b, w: o.w || b.w, r: o.r || b.r, pos: o.pos || b.pos, en: m.en || '', fr: m.fr || '', edited: !!store.overrides[id] };
  }
  const allWords = () => [...BASE.map(v => word(v.id)), ...Object.keys(store.custom).map(word)];
  let readingMap = null;
  const getReadingMap = () => readingMap || (readingMap = SL.buildReadingMap(allWords()));
  function usedMap() {
    const m = new Map(), cur = store.currentId;
    for (const h of Object.values(store.homeworks)) {
      if (h.id === cur) continue;
      for (const id of h.words) if (!m.has(id) || m.get(id) < h.date) m.set(id, h.date);
    }
    return m;
  }
  const shortDate = d => d ? d.slice(5).replace('-', '/') : '';

  // ---------- 画面 ----------
  const view = $('#view');
  const ps = { lv: 'N5', pos: '', q: '', from: '', to: '', hideUsed: false, limit: 60, editing: null, randomN: 10 };

  function updateTopbar() {
    const h = hw();
    $('#hwName').textContent = `${h.title || '（題名なし）'} · ${h.date} · 単語${h.words.length}`;
  }
  const render = guard('画面の表示', () => {
    const tab = store.ui.tab || 'words';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    updateTopbar();
    ({ words: renderWords, sections: renderSections, print: renderPrint, list: renderList }[tab] || renderWords)();
  });
  function setTab(t) { store.ui.tab = t; save(); render(); window.scrollTo(0, 0); }

  // ---------- ① 単語 ----------
  function renderWords() {
    const lvChip = (v, t) => `<button class="chip ${ps.lv === v ? 'on' : ''}" data-act="lv" data-v="${v}">${t}</button>`;
    view.innerHTML = `
      <div class="card picked" id="picked"></div>
      <div class="card">
        <div class="chips" style="margin-bottom:10px">${lvChip('N5', 'N5')}${lvChip('N4', 'N4')}${lvChip('all', '全部')}${lvChip('custom', '追加した語')}</div>
        <div class="inline" style="margin-bottom:8px">
          <input type="search" id="q" placeholder="さがす（漢字・かな・意味）" value="${esc(ps.q)}" style="flex:1;min-width:180px">
          <select id="posSel"><option value="">品詞すべて</option>${POS_GROUPS.map(p => `<option ${ps.pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
          <label class="small"><input type="checkbox" id="hideUsed" ${ps.hideUsed ? 'checked' : ''}> 使った語を隠す</label>
        </div>
        <div class="inline small ${ps.lv === 'N5' || ps.lv === 'N4' ? '' : 'hidden'}" style="margin-bottom:6px">
          番号 <input type="number" id="from" min="1" value="${esc(ps.from)}"> 〜 <input type="number" id="to" min="1" value="${esc(ps.to)}">
          <button class="btn sm" data-act="pick-range">この番号の語を選ぶ</button>
        </div>
        <div class="inline small">
          <input type="number" id="randomN" min="1" max="50" value="${ps.randomN}"> 語を
          <button class="btn sm" data-act="pick-random">ランダムに選ぶ（使っていない語から）</button>
          <span class="muted" id="hitCount"></span>
        </div>
      </div>
      <div class="card"><div class="wlist" id="wlist"></div><div id="more"></div></div>
      <div class="card">
        <details><summary>リストにない語を追加する</summary>
          <div class="grid2" style="margin-top:10px">
            <label class="field"><span>表記（例: 掃除機・［本を］読みます）</span><input type="text" id="cw"></label>
            <label class="field"><span>読み（ひらがな）</span><input type="text" id="cr"></label>
            <label class="field"><span>品詞</span><select id="cpos">${POS_LIST.map(p => `<option>${p}</option>`).join('')}</select></label>
            <label class="field"><span>レベル</span><select id="clv"><option>N5</option><option>N4</option><option value="他">その他</option></select></label>
          </div>
          <p class="small muted">動詞は「ます形」で入れると、活用の問題にも使えます。</p>
          <button class="btn" data-act="add-custom">追加して選ぶ</button>
        </details>
      </div>`;
    renderPicked(); renderWordList();
  }
  function renderPicked() {
    const h = hw(), el = $('#picked'); if (!el) return;
    const chips = h.words.map(id => { const v = word(id); return v ? `<button class="chip on" data-act="unpick" data-id="${id}" title="はずす">${esc(v.w)} ×</button>` : ''; }).join('');
    el.innerHTML = `
      <div class="inline" style="justify-content:space-between;margin-bottom:6px">
        <b>選んだ単語 ${h.words.length}</b>
        <div class="row-actions">
          <button class="btn sm" data-act="ai-meaning" ${h.words.length ? '' : 'disabled'}>意味をAIで付ける…</button>
          <button class="btn sm" data-act="clear-picked" ${h.words.length ? '' : 'disabled'}>全部はずす</button>
          <button class="btn sm primary" data-act="tab" data-v="sections" ${h.words.length ? '' : 'disabled'}>② 問題へ</button>
        </div>
      </div>
      <div class="chips">${chips || '<span class="muted small">下のリストから語をタップして選んでください。</span>'}</div>`;
  }
  function filteredWords() {
    const q = SL.toHira(ps.q.trim()).toLowerCase(), used = usedMap();
    return allWords().filter(v =>
      (ps.lv === 'all' || (ps.lv === 'custom' ? v.id.startsWith('C-') : v.lv === ps.lv)) &&
      (!ps.pos || posGroup(v.pos) === ps.pos) &&
      (!ps.hideUsed || !used.has(v.id)) &&
      (!q || SL.toHira(v.w).toLowerCase().includes(q) || SL.toHira(v.r).includes(q) || v.en.toLowerCase().includes(q) || v.fr.toLowerCase().includes(q)));
  }
  function renderWordList() {
    const el = $('#wlist'); if (!el) return;
    const list = filteredWords(), used = usedMap(), sel = new Set(hw().words);
    $('#hitCount').textContent = `該当 ${list.length}語`;
    el.innerHTML = list.slice(0, ps.limit).map(v => wordRow(v, sel.has(v.id), used.get(v.id))).join('') || '<p class="muted">該当する語がありません。</p>';
    $('#more').innerHTML = list.length > ps.limit ? `<button class="btn" data-act="more" style="width:100%;margin-top:8px">もっと見る（残り ${list.length - ps.limit}語）</button>` : '';
  }
  function wordRow(v, selected, usedDate) {
    const meaning = [v.en, v.fr].filter(Boolean).join(' / ');
    return `<div class="wrow ${selected ? 'sel' : ''}" data-act="toggle" data-id="${v.id}">
      <div class="box">${selected ? '✓' : ''}</div>
      <div class="no">${esc(v.lv)} ${v.n || ''}</div>
      <div><div class="w">${SL.renderSegs(SL.align(v.w, v.r).segs, 'all', new Set())}</div>
        <div class="meta">${esc(v.pos)}${v.edited ? '（直した語）' : ''}${meaning ? ' · ' + esc(meaning) : ''}${usedDate ? `<span class="used">${shortDate(usedDate)}に使用</span>` : ''}</div></div>
      <button class="btn sm" data-act="edit" data-id="${v.id}" title="意味を入れる・表記を直す">✎</button>
      ${ps.editing === v.id ? editBox(v) : ''}
    </div>`;
  }
  function editBox(v) {
    const base = BASE_BY_ID.get(v.id);
    return `<div class="edit-box" data-act="noop">
      <div class="grid2">
        <label class="field"><span>English</span><input type="text" id="e-en" value="${esc(v.en)}"></label>
        <label class="field"><span>Français</span><input type="text" id="e-fr" value="${esc(v.fr)}"></label>
        <label class="field"><span>表記</span><input type="text" id="e-w" value="${esc(v.w)}"></label>
        <label class="field"><span>読み</span><input type="text" id="e-r" value="${esc(v.r)}"></label>
        <label class="field"><span>品詞</span><select id="e-pos">${POS_LIST.map(p => `<option ${p === v.pos ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      </div>
      <div class="row-actions">
        <button class="btn primary sm" data-act="edit-save" data-id="${v.id}">保存</button>
        ${base && store.overrides[v.id] ? `<button class="btn sm" data-act="edit-reset" data-id="${v.id}">表記・読み・品詞をリストのとおりに戻す</button>` : ''}
        ${!base ? `<button class="btn sm danger" data-act="custom-del" data-id="${v.id}">この語を消す</button>` : ''}
        <button class="btn sm" data-act="edit-close">閉じる</button>
      </div>
    </div>`;
  }

  // ---------- ② 問題 ----------
  function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function sectionItems(sec, h) {
    const S = settings(h), allowed = allowedOf(h), ml = meaningLang(S);
    const t = TYPES[sec.type];
    if (t.custom) { const r = SL.checkLines(sec.text, sec.type, allowed); return { items: r.items, eligible: r.items.length, problems: r.problems }; }
    const ws = h.words.map(word).filter(Boolean);
    if (sec.type === 'wordlist') return { items: ws, eligible: ws.length };
    const core = v => SL.splitCtx(v.w, v.r);
    let pool = ws, skipped = [];
    switch (sec.type) {
      case 'reading': pool = ws.filter(v => SL.hasKanji(core(v).w) && (!sec.inRangeOnly || !SL.outside(core(v).w, allowed).length)); break;
      case 'writing': pool = ws.filter(v => SL.hasKanji(core(v).w) && (!sec.inRangeOnly || !SL.outside(core(v).w, allowed).length)); break;
      case 'meaning': pool = ml ? ws : []; break;
      case 'translate': pool = ml ? ws.filter(v => v[ml]) : []; break;
      case 'match': pool = sec.mode === 'meaning' ? (ml ? ws.filter(v => v[ml]) : []) : ws.filter(v => SL.hasKanji(core(v).w)); break;
      case 'conj': {
        const forms = sec.forms.length ? sec.forms : ['dict'];
        pool = []; for (const v of ws.filter(v => /動詞/.test(v.pos))) {
          const c = core(v), res = forms.map(f => SL.conjugate(c.w, c.r, v.pos, f));
          if (res.every(Boolean)) pool.push({ ...v, forms: res }); else skipped.push(v.w);
        }
        break;
      }
    }
    const max = sec.type === 'match' ? 8 : 40;
    const n = Math.max(0, Math.min(sec.count || 1, max, pool.length));
    return { items: SL.shuffle(pool, SL.rng(h.seed ^ hashStr(sec.id))).slice(0, n), eligible: pool.length, skipped };
  }
  function sectionNote(sec, h) {
    const S = settings(h), ml = meaningLang(S), r = sectionItems(sec, h), notes = [];
    const t = TYPES[sec.type];
    if (t.custom) {
      notes.push([r.items.length ? 'ok' : 'warn', r.items.length ? `${r.items.length}問` : '問題がまだありません。1行に1問ずつ書いてください。']);
      for (const p of r.problems) notes.push(['warn', p.kind === 'kanji' ? `${p.line}行目: ふりがなのない範囲外の漢字 ${p.chars.join('・')}` : p.kind === 'noBlank' ? `${p.line}行目: [ ] で答えの部分を囲んでください` : `${p.line}行目: 「 / 」で2つ以上に区切ってください`]);
      return notes;
    }
    if ((sec.type === 'meaning' || sec.type === 'translate' || (sec.type === 'match' && sec.mode === 'meaning')) && !ml)
      return [['warn', '③印刷の言語が「日本語のみ」なので、この問題は出ません。']];
    if (sec.type === 'wordlist') return [[r.items.length ? 'ok' : 'warn', `${r.items.length}語${ml ? `（意味がない語 ${r.items.filter(v => !v[ml]).length}）` : ''}`]];
    notes.push([r.items.length ? 'ok' : 'warn', `${r.items.length}問（対象になる語 ${r.eligible}）`]);
    if (sec.type === 'translate' && ml && r.eligible < h.words.length) notes.push(['warn', `意味が入っていない語は出ません（${h.words.length - r.eligible}語）。①単語で意味を付けられます。`]);
    if (r.skipped?.length) notes.push(['warn', `選んだ形が作れないので外した動詞: ${r.skipped.join('、')}`]);
    return notes;
  }
  function renderSections() {
    const h = hw(), S = settings(h), allowed = allowedOf(h);
    view.innerHTML = `
      <div class="card">
        <div class="grid2">
          <label class="field"><span>題名（{漢字|よみ} でふりがなも付けられます）</span><input type="text" data-hw="title" value="${esc(h.title)}"></label>
          <label class="field"><span>日付</span><input type="date" data-hw="date" value="${esc(h.date)}"></label>
        </div>
        <div class="grid2">
          <label class="field"><span>漢字の範囲（範囲外の漢字にふりがなを付けたり、問題から外したりする基準）</span>
            <select data-set="range"><option value="N5" ${S.range === 'N5' ? 'selected' : ''}>N5の漢字（${SL.KANJI_N5.length}字）</option><option value="N4" ${S.range === 'N4' ? 'selected' : ''}>N4までの漢字（${SL.KANJI_N5.length + SL.KANJI_N4.length}字）</option><option value="custom" ${S.range === 'custom' ? 'selected' : ''}>自分で指定する（下の欄の字だけ）</option></select></label>
          <label class="field"><span>${S.range === 'custom' ? '使える漢字' : '追加の漢字（習った字など）'} — いま <b id="kanjiCount">${allowed.size}</b>字</span>
            <textarea data-set="extraKanji" style="min-height:42px" placeholder="例: 曜駅">${esc(S.extraKanji)}</textarea></label>
        </div>
        <details><summary>範囲の漢字を見る</summary><p style="word-break:break-all;letter-spacing:.1em">${esc([...allowed].join(''))}</p>
          <p class="small muted">N5・N4の字は、一般に出回っている JLPT 漢字リストを参考にした目安です（公式の基準ではありません）。</p></details>
      </div>
      ${h.words.length ? '' : '<div class="note warn">まだ単語を選んでいません。①単語で選ぶと問題ができます（自分で書く問題は単語なしでも作れます）。</div>'}
      ${h.sections.map((s, i) => sectionCard(s, i, h)).join('')}
      <div class="card">
        <div class="inline">
          <select id="addType">${TYPE_ORDER.map(t => `<option value="${t}">${TYPES[t].label}</option>`).join('')}</select>
          <button class="btn" data-act="sec-add">＋ 問題を足す</button>
          <button class="btn" data-act="reseed">出す語と順番を入れ替える</button>
          <button class="btn primary" data-act="tab" data-v="print">③ 印刷へ</button>
        </div>
      </div>`;
  }
  function sectionCard(sec, i, h) {
    const t = TYPES[sec.type];
    let opts = '';
    if (!t.custom && sec.type !== 'wordlist')
      opts += `<label class="small">問題数 <input type="number" min="1" max="${sec.type === 'match' ? 8 : 40}" data-sfield="count" value="${sec.count}"></label> `;
    if (sec.type === 'reading' || sec.type === 'writing')
      opts += `<label class="small"><input type="checkbox" data-sfield="inRangeOnly" ${sec.inRangeOnly ? 'checked' : ''}> 範囲内の漢字だけで書ける語にする</label>`;
    if (sec.type === 'match')
      opts += `<label class="small">結ぶもの <select data-sfield="mode"><option value="reading" ${sec.mode === 'reading' ? 'selected' : ''}>漢字 ↔ 読み</option><option value="meaning" ${sec.mode === 'meaning' ? 'selected' : ''}>ことば ↔ 意味</option></select></label>`;
    if (sec.type === 'conj')
      opts += `<div class="chips" style="margin-top:6px">${SL.FORMS.filter(f => f.key !== 'masu').map(f => `<button class="chip ${sec.forms.includes(f.key) ? 'on' : ''}" data-act="form" data-f="${f.key}">${SL.rubyHtml(f.ja, 'none', new Set())}</button>`).join('')}</div>`;
    if (t.custom) opts += customEditor(sec);
    const notes = sectionNote(sec, h).map(([k, m]) => `<div class="note ${k}">${esc(m)}</div>`).join('');
    return `<div class="card sec-card" data-sid="${sec.id}">
      <div class="sec-title"><b>${i + 1}. ${esc(t.label)}</b>
        <div class="row-actions"><button class="btn sm" data-act="sec-up" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-act="sec-down" ${i < h.sections.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm danger" data-act="sec-del">削除</button></div></div>
      <div class="inline" style="margin:6px 0">${opts}</div>
      <div id="notes-${sec.id}">${notes}</div>
      <details><summary>指示文を変える（空欄なら「${esc(SL.segsText(SL.parseRuby(t.ins.ja)))}」）</summary>
        <div class="grid2" style="margin-top:8px">${['ja', 'en', 'fr'].map(l => `<label class="field"><span>${{ ja: '日本語（{漢字|よみ} 可）', en: 'English', fr: 'Français' }[l]}</span><input type="text" data-sins="${l}" value="${esc(sec.ins[l])}" placeholder="${esc(t.ins[l])}"></label>`).join('')}</div>
      </details>
    </div>`;
  }
  function customEditor(sec) {
    const ex = {
      fill: 'きのう {図書館|としょかん}で {本|ほん}を [{読|よ}みました]。',
      order: 'わたしは / まいあさ / コーヒーを / {飲|の}みます。',
      free: 'しゅうまつは {何|なに}を しますか。 => ともだちと テニスを します。',
    }[sec.type];
    return `<div style="width:100%">
      <textarea data-sfield="text" placeholder="${esc(ex)}">${esc(sec.text)}</textarea>
      <div class="row-actions" style="margin-top:6px">
        <button class="btn sm" data-act="ai-questions">AIで問題を作る…</button>
        <button class="btn sm" data-act="auto-ruby">ふりがなを自動で付ける</button>
      </div>
      <details style="margin-top:6px"><summary>書き方</summary><ul class="small">
        <li>1行に1問。<span class="help-code">#</span> で始まる行は無視します。</li>
        <li>ふりがな: <span class="help-code">{図書館|としょかん}</span>（③印刷の設定で、範囲外の字だけ表示・全部表示などを切り替え）</li>
        ${sec.type === 'fill' ? '<li>答え: <span class="help-code">[読みました]</span> または <span class="help-code">【読みました】</span> → （　　）になり、こたえのページに答えが出ます。</li>' : ''}
        ${sec.type === 'order' ? '<li>区切り: <span class="help-code"> / </span> で区切って正しい順に書くと、印刷のときにばらばらに並べます。</li>' : ''}
        ${sec.type === 'free' ? '<li>答えの例: 問題のあとに <span class="help-code"> => </span> と書くと、こたえのページに出ます。</li>' : ''}
        <li>例: <span class="help-code">${esc(ex)}</span></li></ul></details>
    </div>`;
  }
  const findSec = el => { const card = el.closest('[data-sid]'); return card && hw().sections.find(s => s.id === card.dataset.sid); };
  function refreshNotes(sec) { const el = document.getElementById('notes-' + sec.id); if (el) el.innerHTML = sectionNote(sec, hw()).map(([k, m]) => `<div class="note ${k}">${esc(m)}</div>`).join(''); }

  // ---------- 宿題のページを組む ----------
  function secInsHtml(sec, S, allowed) {
    const t = TYPES[sec.type], o = sec.ins || {};
    const ja = o.ja || t.ins.ja, en = o.en || t.ins.en, fr = o.fr || t.ins.fr;
    const jaH = SL.rubyHtml(ja, S.policy, allowed);
    return { ja: jaH, 'ja-en': `${jaH}<span class="tr">${esc(en)}</span>`, 'ja-fr': `${jaH}<span class="tr">${esc(fr)}</span>`, en: esc(en), fr: esc(fr) }[S.lang];
  }
  function formLabel(f, S, allowed) {
    const ja = SL.rubyHtml(f.ja, S.policy === 'none' ? 'none' : 'all', allowed);
    const tr = { 'ja-en': f.en, 'ja-fr': f.fr }[S.lang];
    return `<span class="fl">${{ en: esc(f.en), fr: esc(f.fr) }[S.lang] || `<span>${ja}</span>`}${tr ? `<small>${esc(tr)}</small>` : ''}</span>`;
  }
  const blankHtml = (ans, answer) => `<span class="blank">${answer ? `<span class="a">${ans}</span>` : '&nbsp;'}</span>`;
  function parenBlank(notation, answer, S, allowed) {
    const len = Math.max(3, [...SL.segsReading(SL.parseRuby(notation))].length);
    return `<span class="blank paren"><span class="gap" style="min-width:${(len * 1.05).toFixed(1)}em">${answer ? `<span class="a">${SL.rubyHtml(notation, S.policy, allowed)}</span>` : ''}</span></span>`;
  }
  function wordParts(v, S, allowed) {
    const c = SL.splitCtx(v.w, v.r);
    return {
      c,
      ctx: c.ctxW ? `<span class="ctx">${SL.renderSegs(SL.align(c.ctxW, c.ctxR).segs, S.policy, allowed)}</span>` : '',
      segs: SL.align(c.w, c.r).segs,
    };
  }
  const hasAnswers = (sec, items) => !['wordlist', 'sentence'].includes(sec.type) && (sec.type !== 'free' || items.some(q => q.answer));

  function buildBlocks(h, answer) {
    const S = settings(h), allowed = allowedOf(h), ml = meaningLang(S), blocks = [];
    let num = 0;
    for (const sec of h.sections) {
      const t = TYPES[sec.type]; if (!t) continue;
      const { items } = sectionItems(sec, h);
      if (!items.length || (answer && !hasAnswers(sec, items))) continue;
      num++;
      const headFor = cont => `<div class="sec-head"><span class="sec-no">${num}</span><div class="sec-ins">${secInsHtml(sec, S, allowed)}${cont ? `<span class="cont">${esc(label('cont', S.lang))}</span>` : ''}</div></div>`;
      const head = [headFor(false)], cont = [headFor(true)];
      let cells = [];
      const P = v => wordParts(v, S, allowed);
      const R = segs => SL.renderSegs(segs, S.policy, allowed);
      switch (sec.type) {
        case 'wordlist': cells = items.map((v, i) => { const p = P(v); return `<div class="wl-item"><span class="n">${i + 1}.</span><span class="w">${p.ctx}${SL.renderSegs(p.segs, S.policy === 'none' ? 'none' : 'all', allowed)}</span>${ml ? `<span class="m">${esc(v[ml])}</span>` : ''}</div>`; }); break;
        case 'reading': cells = items.map((v, i) => { const p = P(v); return `<div class="item"><span class="n">${i + 1}.</span><span class="q">${p.ctx}<span class="u">${esc(p.c.w)}</span></span>${blankHtml(esc(SL.toHira(p.c.r)), answer)}</div>`; }); break;
        case 'writing': cells = items.map((v, i) => { const p = P(v); return `<div class="item"><span class="n">${i + 1}.</span><span class="q">${p.ctx}<span class="u">${esc(SL.toHira(p.c.r))}</span></span>${blankHtml(esc(p.c.w), answer)}</div>`; }); break;
        case 'meaning': cells = items.map((v, i) => { const p = P(v); return `<div class="item"><span class="n">${i + 1}.</span><span class="q">${p.ctx}${R(p.segs)}</span>${blankHtml(esc(v[ml] || '—'), answer)}</div>`; }); break;
        case 'translate': cells = items.map((v, i) => { const p = P(v); return `<div class="item"><span class="n">${i + 1}.</span><span class="q">${esc(v[ml])}</span>${blankHtml(`${p.ctx}${R(p.segs)}`, answer)}</div>`; }); break;
        case 'match': {
          const right = SL.shuffle(items.map((v, i) => i), SL.rng(h.seed ^ hashStr(sec.id + 'm')));
          const letters = 'abcdefgh';
          const rightText = v => sec.mode === 'meaning' ? esc(v[ml]) : esc(SL.toHira(P(v).c.r));
          const leftText = v => { const p = P(v); return sec.mode === 'meaning' ? `${p.ctx}${R(p.segs)}` : `${p.ctx}${esc(p.c.w)}`; };
          cells = items.map((v, i) => {
            const ri = answer ? i : right[i];
            const letter = letters[right.indexOf(ri)];
            return `<div class="match"><div class="l"><span class="lab">${i + 1}.</span><span>${leftText(v)}</span><span class="dot"></span></div><div>${answer ? `<span class="answer-tag">— ${letter}</span>` : ''}</div><div class="r"><span class="dot"></span><span class="lab">${letter}.</span><span>${rightText(items[ri])}</span></div></div>`;
          });
          break;
        }
        case 'conj': {
          const forms = (sec.forms.length ? sec.forms : ['dict']).map(k => SL.FORMS.find(f => f.key === k));
          const cols = `grid-template-columns:minmax(0,${forms.length > 4 ? 2 : 1.5}fr) repeat(${forms.length},minmax(0,1fr))`;
          const masu = SL.FORMS.find(f => f.key === 'masu');
          const hr = `<div class="conj-row head" style="${cols}"><div class="cell">${formLabel(masu, S, allowed)}</div>${forms.map(f => `<div class="cell">${formLabel(f, S, allowed)}</div>`).join('')}</div>`;
          head.push(hr); cont.push(hr);
          cells = items.map((v, i) => { const p = P(v); return `<div class="conj-row" style="${cols}"><div class="cell"><span><span class="n">${i + 1}.</span> ${p.ctx}${R(p.segs)}</span></div>${v.forms.map(x => `<div class="cell ${answer ? 'ans' : ''}"><span>${answer ? R(SL.align(x.w, x.r).segs) : ''}</span></div>`).join('')}</div>`; });
          break;
        }
        case 'sentence': cells = items.map((v, i) => { const p = P(v); return `<div class="item"><span class="n">${i + 1}.</span><div class="qbody"><span class="q">${p.ctx}${R(p.segs)}</span><div class="lines"><i></i></div></div></div>`; }); break;
        case 'fill': cells = items.map((q, i) => `<div class="item"><span class="n">${i + 1}.</span><div class="qbody">${q.parts.map(x => x.blank ? parenBlank(x.blank, answer, S, allowed) : SL.rubyHtml(x.text, S.policy, allowed)).join('')}</div></div>`); break;
        case 'order': cells = items.map((q, i) => {
          let order = q.chunks.map((_, k) => k);
          const rand = SL.rng(h.seed ^ hashStr(sec.id + i));
          for (let k = 0; k < 6 && order.every((x, j) => x === j) && order.length > 1; k++) order = SL.shuffle(order, rand);
          if (order.every((x, j) => x === j) && order.length > 1) order.push(order.shift());
          return `<div class="item"><span class="n">${i + 1}.</span><div class="qbody"><div class="order-chunks">${order.map(k => `<span>${SL.rubyHtml(q.chunks[k], S.policy, allowed)}</span>`).join('')}</div>
            <div class="lines">${answer ? `<span class="a">${SL.rubyHtml(q.chunks.join(''), S.policy, allowed)}</span>` : '<i></i>'}</div></div></div>`;
        }); break;
        case 'free': cells = items.map((q, i) => `<div class="item"><span class="n">${i + 1}.</span><div class="qbody"><div>${SL.rubyHtml(q.text, S.policy, allowed)}</div>
            <div class="lines">${answer ? `<span class="a">${q.answer ? SL.rubyHtml(q.answer, S.policy, allowed) : '—'}</span>` : '<i></i><i></i>'}</div></div></div>`); break;
      }
      const ncol = t.cols, rows = [];
      for (let i = 0; i < cells.length; i += ncol) rows.push(`<div class="prow cols-${ncol}">${cells.slice(i, i + ncol).join('')}</div>`);
      blocks.push({ head, cont, rows });
    }
    return blocks;
  }
  function pageShell(h, S, allowed, answer, first) {
    const name = !answer && S.nameLine && first ? `<span class="name-line">${esc(label('name', S.lang))} <i></i></span>` : '';
    const el = document.createElement('section');
    el.className = `page fmt-${S.format} size-${S.size} font-${S.font}`;
    el.innerHTML = `<div class="page-head"><div class="ph-title">${SL.rubyHtml(h.title || '', S.policy, allowed)}${answer ? ` — ${esc(label('answers', S.lang))}` : ''}</div>
      <div class="ph-right"><span>${esc((h.date || '').replaceAll('-', '.'))}</span>${name}</div></div><div class="page-body"></div><div class="page-foot"><span>&nbsp;</span><span class="pno">&nbsp;</span></div>`;
    return el;
  }
  // 実際に並べて高さを測り、はみ出したら次のページへ送る
  function layoutPages(h) {
    const S = settings(h), allowed = allowedOf(h), host = $('#measure');
    host.innerHTML = '';
    const parts = [];
    if (S.answers !== 'only') parts.push(false);
    if (S.answers !== 'none') parts.push(true);
    const all = [];
    for (const answer of parts) {
      const blocks = buildBlocks(h, answer);
      if (!blocks.length) continue;
      const pages = [];
      let body = null;
      const newPage = () => { const p = pageShell(h, S, allowed, answer, !pages.length); host.appendChild(p); pages.push(p); body = p.querySelector('.page-body'); };
      const put = htmls => { const t = document.createElement('template'); t.innerHTML = htmls.join(''); const els = [...t.content.children]; els.forEach(e => body.appendChild(e)); return els; };
      const over = () => body.scrollHeight > body.clientHeight + 1;
      newPage();
      for (const b of blocks) {
        if (S.format === 'slide' && body.childElementCount) newPage();
        b.rows.forEach((row, i) => {
          const els = put((i === 0 ? b.head : []).concat(row));
          if (over() && body.childElementCount > els.length) {
            els.forEach(e => e.remove());
            newPage();
            put((i === 0 ? b.head : b.cont).concat(row));
          }
        });
      }
      // フッターは最初から1行分の高さを取ってあるので、ページ番号を入れても本文の高さは変わらない
      pages.forEach((p, i) => { p.querySelector('.pno').textContent = pages.length > 1 ? `${i + 1} / ${pages.length}` : '\u00a0'; });
      all.push(...pages);
    }
    return all;
  }
  function setPageCss(S) {
    $('#pageSize').textContent = S.format === 'slide' ? '@page { size: 297mm 167.06mm; margin: 0; }' : '@page { size: A4 portrait; margin: 0; }';
  }

  // ---------- ③ 印刷 ----------
  function renderPrint() {
    const h = hw(), S = settings(h);
    const sel = (key, opts) => `<select data-set="${key}">${Object.entries(opts).map(([v, t]) => `<option value="${v}" ${String(S[key]) === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    view.innerHTML = `<div class="print-layout">
      <div class="card">
        <label class="field"><span>言語（指示文と意味）</span>${sel('lang', LANGS)}</label>
        <label class="field"><span>ふりがな</span>${sel('policy', { outside: '範囲外の漢字だけ', all: 'すべての漢字', kana: '範囲外の漢字はひらがなで書く', none: 'なし' })}</label>
        <label class="field"><span>形</span>${sel('format', { slide: 'スライド（16:9 横）', a4: 'A4 たて' })}</label>
        <div class="grid2" style="grid-template-columns:1fr 1fr">
          <label class="field"><span>文字</span>${sel('size', { normal: 'ふつう', large: '大きめ' })}</label>
          <label class="field"><span>書体</span>${sel('font', { gothic: 'ゴシック', kyokasho: '教科書体' })}</label>
        </div>
        <label class="field"><span>こたえ</span>${sel('answers', { end: '最後に付ける', none: '付けない', only: 'こたえだけ' })}</label>
        <label class="small"><input type="checkbox" data-set="nameLine" ${S.nameLine ? 'checked' : ''}> なまえ欄を付ける</label>
        <div class="row-actions" style="margin:12px 0 6px"><button class="btn primary" data-act="print">印刷・PDFにする</button><span class="muted small" id="pageCount"></span></div>
        <details><summary>PDFにして送るには</summary><ul class="small">
          <li>パソコン（Chrome・Edge）: 「印刷・PDFにする」→ 送信先を「PDFに保存」。余白は「なし」、「背景のグラフィック」をオン。</li>
          <li>Mac（Safari）: 「印刷・PDFにする」→ 左下の「PDF」→「PDFとして保存」。</li>
          <li>iPhone・iPad: 「印刷・PDFにする」→ 右上の共有ボタン →「ファイルに保存」またはメールで送信。スライドの形がA4に縮んだときは、形を「A4 たて」にしてください。</li>
          <li>学習者ごとに言語を変えたいときは、言語を切り替えてもう一度PDFにします。</li>
        </ul></details>
        <p class="small muted">書体「教科書体」は、端末に入っている教科書体（Windowsの UD デジタル 教科書体、Macの クレー など）を使います。ない端末ではほかの書体になります。</p>
      </div>
      <div class="preview" id="preview"></div>
    </div>`;
    renderPreview();
  }
  const renderPreview = guard('プレビュー', () => {
    const h = hw(), S = settings(h), prev = $('#preview');
    setPageCss(S);
    const pages = layoutPages(h);
    $('#printArea').innerHTML = pages.map(p => p.outerHTML).join('');
    if (!prev) { $('#measure').innerHTML = ''; return; }
    if (!pages.length) { prev.innerHTML = '<div class="note warn">ページがありません。①で単語を選ぶか、②で問題を足してください。</div>'; $('#measure').innerHTML = ''; return; }
    const w = Math.min(prev.clientWidth || 600, 900);
    prev.innerHTML = '';
    for (const p of pages) {
      const scale = w / p.offsetWidth;
      const wrap = document.createElement('div');
      wrap.className = 'page-wrap';
      wrap.style.width = w + 'px'; wrap.style.height = Math.round(p.offsetHeight * scale) + 'px';
      p.style.transform = `scale(${scale})`;
      wrap.appendChild(p); prev.appendChild(wrap);
    }
    const pc = $('#pageCount'); if (pc) pc.textContent = `${pages.length}ページ`;
  });
  // Ctrl+P など、ボタン以外から印刷したときも今の内容で組み直す
  window.addEventListener('beforeprint', () => renderPreview());

  // ---------- 一覧 ----------
  function renderList() {
    const list = Object.values(store.homeworks).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt - a.updatedAt);
    view.innerHTML = `
      <div class="card"><div class="row-actions"><button class="btn primary" data-act="new-hw">＋ 新しい宿題</button></div></div>
      <div class="card">${list.map(h => `
        <div class="inline" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:8px 0">
          <div><b>${esc(SL.segsText(SL.parseRuby(h.title || '（題名なし）')))}</b>${h.id === store.currentId ? ' <span class="chip on">編集中</span>' : ''}
            <div class="small muted">${esc(h.date)} · 単語${h.words.length} · ${h.sections.map(s => TYPES[s.type]?.label).filter(Boolean).join('・')}</div></div>
          <div class="row-actions"><button class="btn sm" data-act="open-hw" data-id="${h.id}">開く</button><button class="btn sm" data-act="dup-hw" data-id="${h.id}">複製</button><button class="btn sm danger" data-act="del-hw" data-id="${h.id}">削除</button></div>
        </div>`).join('')}</div>
      <div class="card"><h2>バックアップ</h2>
        <p class="small muted">宿題・意味・直した語は、このブラウザーの中にだけ保存されます。別の端末へ移すときや、念のための控えとして書き出してください。読み込むと、今ある宿題と合わせます（同じ宿題は新しい方を残します）。</p>
        <div class="row-actions"><button class="btn" data-act="export">書き出す</button><button class="btn" data-act="import">読み込む</button><input type="file" id="impFile" accept="application/json,.json" class="hidden"></div></div>
      <div class="card small"><h2>このツールについて</h2>
        <p>単語は Langoal の「JLPT N5／N4 語彙一覧」の PDF から取り込んだもの（N5 ${BASE.filter(v => v.lv === 'N5').length}語・N4 ${BASE.filter(v => v.lv === 'N4').length}語）。PDFの印刷が崩れていた N4 の9番は入っていません。品詞の明らかな誤り（組み立てます・引っ越しします）は直してあります。</p>
        <p>漢字の範囲（N5 ${SL.KANJI_N5.length}字・N4 ${SL.KANJI_N4.length}字）は一般に出回っているリストを参考にした目安です。動詞の活用は品詞（五段・一段・不規則）から自動で作っています。</p>
        <p class="muted">版: ${esc(window.SHUKUDAI_BUILD || '')}</p></div>`;
  }

  // ---------- AI の往復（プロンプトを作るだけ。送信はしない） ----------
  function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    if (btn) { const t = btn.textContent; btn.textContent = 'コピーしました'; setTimeout(() => { btn.textContent = t; }, 1500); }
  }
  let modalCtx = null;
  function openMeaningModal() {
    const all = hw().words.map(word).filter(Boolean);
    const missing = all.filter(v => !v.en || !v.fr);
    modalCtx = { kind: 'meaning', all, missing, onlyMissing: missing.length > 0 };
    const words = modalCtx.onlyMissing ? missing : all;
    openModal(`<h2 style="margin-top:0">意味をAIで付ける</h2>
      <p class="small">1. 下の文をコピーして、ふだん使っているAI（Claude など）に貼ってください。このツールからは何も送信しません。</p>
      <label class="small"><input type="checkbox" id="onlyMissing" ${modalCtx.onlyMissing ? 'checked' : ''}> 意味がまだない語だけ（${missing.length}語 / 全${all.length}語）</label>
      <textarea readonly id="aiPrompt">${esc(SL.meaningPrompt(words))}</textarea>
      <div class="row-actions"><button class="btn" data-act="copy-prompt">コピー</button></div>
      <p class="small">2. AIの返事をそのまま下に貼って「取り込む」を押してください。取り込んだ意味は ✎ でいつでも直せます。</p>
      <textarea id="aiReply" placeholder="N5-0028|teacher|professeur"></textarea>
      <div id="aiResult"></div>
      <div class="row-actions"><button class="btn primary" data-act="import-meanings">取り込む</button><button class="btn" data-act="close-modal">閉じる</button></div>`);
  }
  function openQuestionModal(sec) {
    const h = hw(), S = settings(h), words = h.words.map(word).filter(Boolean);
    const level = S.range === 'N4' ? 'N4' : 'N5';
    modalCtx = { kind: 'questions', sid: sec.id, words, level };
    const prompt = n => SL.questionPrompt({ words, level, type: sec.type, count: n, allowed: allowedOf(h) });
    modalCtx.prompt = prompt;
    openModal(`<h2 style="margin-top:0">AIで「${esc(TYPES[sec.type].label)}」を作る</h2>
      ${words.length ? '' : '<div class="note warn">単語を選んでいないので、単語の指定なしの依頼文になります。</div>'}
      <p class="small">1. 問題数 <input type="number" id="aiCount" min="1" max="20" value="${Math.min(10, Math.max(3, words.length || 5))}"> を決めて、下の文をAIに貼ってください。</p>
      <textarea readonly id="aiPrompt">${esc(prompt(Math.min(10, Math.max(3, words.length || 5))))}</textarea>
      <div class="row-actions"><button class="btn" data-act="copy-prompt">コピー</button></div>
      <p class="small">2. AIの返事を貼って「問題に足す」を押してください。番号や空行は自動で取り除きます。足したあと、範囲外の漢字がないか確認できます。</p>
      <textarea id="aiReply"></textarea>
      <div id="aiResult"></div>
      <div class="row-actions"><button class="btn primary" data-act="import-questions">問題に足す</button><button class="btn" data-act="close-modal">閉じる</button></div>`);
  }
  const cleanReplyLines = text => String(text || '').split(/\r?\n/)
    .map(l => l.replace(/^\s*(?:[-*・]|\d+[.)．、]|[（(]\d+[)）]|Q\d+[.:：]?)\s*/, '').trim())
    .filter(l => l && !/^```/.test(l));

  // ---------- 操作 ----------
  const actions = {
    tab: el => setTab(el.dataset.v),
    lv: el => { ps.lv = el.dataset.v; ps.limit = 60; renderWords(); },
    more: () => { ps.limit += 120; renderWordList(); },
    toggle: el => {
      const h = hw(), id = el.dataset.id, i = h.words.indexOf(id);
      if (i >= 0) h.words.splice(i, 1); else h.words.push(id);
      touch(); renderPicked();
      el.classList.toggle('sel', i < 0); el.querySelector('.box').textContent = i < 0 ? '✓' : '';
    },
    unpick: el => { const h = hw(); h.words = h.words.filter(x => x !== el.dataset.id); touch(); renderPicked(); renderWordList(); },
    'clear-picked': () => { if (!confirm('選んだ単語を全部はずしますか？')) return; hw().words = []; touch(); renderPicked(); renderWordList(); },
    'pick-range': () => {
      const a = +ps.from, b = +ps.to || a;
      if (!a) return alert('番号を入れてください。');
      const h = hw(), have = new Set(h.words);
      const add = filteredWords().filter(v => v.n >= Math.min(a, b) && v.n <= Math.max(a, b) && !have.has(v.id)).map(v => v.id);
      h.words.push(...add); touch(); renderPicked(); renderWordList();
    },
    'pick-random': () => {
      const n = Math.max(1, Math.min(50, +ps.randomN || 10)), h = hw(), have = new Set(h.words), used = usedMap();
      const pool = filteredWords().filter(v => !have.has(v.id));
      const rand = SL.rng(Date.now());
      const pick = [...SL.shuffle(pool.filter(v => !used.has(v.id)), rand), ...SL.shuffle(pool.filter(v => used.has(v.id)), rand)].slice(0, n);
      h.words.push(...pick.map(v => v.id)); touch(); renderPicked(); renderWordList();
    },
    edit: el => { ps.editing = ps.editing === el.dataset.id ? null : el.dataset.id; renderWordList(); },
    'edit-close': () => { ps.editing = null; renderWordList(); },
    'edit-save': el => {
      const id = el.dataset.id, base = BASE_BY_ID.get(id), now = Date.now();
      const en = $('#e-en').value.trim(), fr = $('#e-fr').value.trim(), w = $('#e-w').value.trim(), r = SL.toHira($('#e-r').value.trim()), pos = $('#e-pos').value;
      store.meanings[id] = { en, fr, at: now };
      if (base) {
        const o = {}; if (w && w !== base.w) o.w = w; if (r && r !== base.r) o.r = r; if (pos !== base.pos) o.pos = pos;
        if (Object.keys(o).length) store.overrides[id] = { ...o, at: now }; else delete store.overrides[id];
      } else if (store.custom[id]) Object.assign(store.custom[id], { w: w || store.custom[id].w, r: r || store.custom[id].r, pos, at: now });
      readingMap = null; ps.editing = null; touch(); renderPicked(); renderWordList();
    },
    'edit-reset': el => { delete store.overrides[el.dataset.id]; readingMap = null; touch(); renderWordList(); },
    'custom-del': el => {
      const id = el.dataset.id; if (!confirm('この語を消しますか？')) return;
      delete store.custom[id]; delete store.meanings[id];
      for (const h of Object.values(store.homeworks)) h.words = h.words.filter(x => x !== id);
      readingMap = null; ps.editing = null; touch(); renderPicked(); renderWordList();
    },
    'add-custom': () => {
      const w = $('#cw').value.trim(), r = SL.toHira($('#cr').value.trim()), pos = $('#cpos').value, lv = $('#clv').value;
      if (!w) return alert('表記を入れてください。');
      if (SL.hasKanji(w) && !r) return alert('漢字があるときは読みも入れてください。');
      if (/動詞/.test(pos) && !w.endsWith('ます')) return alert('動詞は「ます形」で入れてください（例: 読みます）。');
      const id = 'C-' + Date.now().toString(36);
      store.custom[id] = { id, lv, n: 0, w, r: r || SL.toHira(w), pos, at: Date.now() };
      hw().words.push(id); readingMap = null; touch(); renderWords();
    },
    'ai-meaning': () => openMeaningModal(),
    'copy-prompt': el => copyText($('#aiPrompt').value, el),
    'close-modal': () => { closeModal(); render(); },
    'import-meanings': () => {
      const ids = new Set(modalCtx.all.map(v => v.id));
      const got = SL.parseMeaningReply($('#aiReply').value, ids), n = Object.keys(got).length, now = Date.now();
      for (const [id, m] of Object.entries(got)) {
        const old = store.meanings[id] || {};
        store.meanings[id] = { en: m.en || old.en || '', fr: m.fr || old.fr || '', at: now };
      }
      touch();
      $('#aiResult').innerHTML = n ? `<div class="note ok">${n}語の意味を取り込みました。</div>` : '<div class="note bad">取り込める行がありませんでした。「ID|English|Français」の形の行があるか確認してください。</div>';
    },
    'ai-questions': el => openQuestionModal(findSec(el)),
    'import-questions': () => {
      const sec = hw().sections.find(s => s.id === modalCtx.sid); if (!sec) return closeModal();
      const lines = cleanReplyLines($('#aiReply').value);
      if (!lines.length) { $('#aiResult').innerHTML = '<div class="note bad">取り込める行がありません。</div>'; return; }
      sec.text = (sec.text.trim() ? sec.text.trim() + '\n' : '') + lines.join('\n');
      touch(); closeModal(); render();
    },
    'auto-ruby': el => {
      const sec = findSec(el), r = SL.autoRuby(sec.text, getReadingMap());
      sec.text = r.text; touch(); renderSections();
      const notes = document.getElementById('notes-' + sec.id);
      if (notes) notes.insertAdjacentHTML('afterbegin', `<div class="note ${r.unknown.length ? 'warn' : 'ok'}">${r.unknown.length ? `読みが1つに決まらない字には付けていません: ${esc(r.unknown.join('・'))}。{漢字|よみ} の形で書き足してください。` : 'ふりがなを付けました。読みが正しいか確認してください。'}</div>`);
    },
    form: el => {
      const sec = findSec(el), f = el.dataset.f, i = sec.forms.indexOf(f);
      if (i >= 0) sec.forms.splice(i, 1); else sec.forms.push(f);
      sec.forms.sort((a, b) => SL.FORMS.findIndex(x => x.key === a) - SL.FORMS.findIndex(x => x.key === b));
      touch(); renderSections();
    },
    'sec-add': () => { hw().sections.push(newSection($('#addType').value)); touch(); renderSections(); },
    'sec-del': el => { const h = hw(), s = findSec(el); if (s.text && !confirm('書いた問題も消えます。削除しますか？')) return; h.sections = h.sections.filter(x => x !== s); touch(); renderSections(); },
    'sec-up': el => moveSec(findSec(el), -1),
    'sec-down': el => moveSec(findSec(el), 1),
    reseed: () => { hw().seed = Math.floor(Math.random() * 2 ** 31); touch(); renderSections(); },
    print: () => { renderPreview(); setTimeout(() => window.print(), 50); },
    'new-hw': () => { const h = newHomework(); store.homeworks[h.id] = h; store.currentId = h.id; save(); setTab('words'); },
    'open-hw': el => { store.currentId = el.dataset.id; save(); setTab('sections'); },
    'dup-hw': el => {
      const src = store.homeworks[el.dataset.id], h = normalizeHw(JSON.parse(JSON.stringify(src)));
      Object.assign(h, { id: 'hw-' + Date.now().toString(36), title: (src.title || '') + '（コピー）', date: todayStr(), createdAt: Date.now(), updatedAt: Date.now() });
      store.homeworks[h.id] = h; store.currentId = h.id; save(); renderList();
    },
    'del-hw': el => {
      const h = store.homeworks[el.dataset.id];
      if (!confirm(`「${SL.segsText(SL.parseRuby(h.title || ''))}」（${h.date}）を削除しますか？`)) return;
      delete store.homeworks[h.id];
      if (store.currentId === h.id) store.currentId = null;
      save(); renderList(); updateTopbar();
    },
    export: () => {
      const data = { app: 'shukudai', version: 1, exportedAt: new Date().toISOString(), homeworks: store.homeworks, meanings: store.meanings, overrides: store.overrides, custom: store.custom };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
      a.download = `shukudai-backup-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },
    import: () => $('#impFile').click(),
    noop: () => {},
  };
  function moveSec(s, d) {
    const a = hw().sections, i = a.indexOf(s), j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; touch(); renderSections();
  }
  function mergeBackup(inc) {
    if (!inc || inc.app !== 'shukudai') throw new Error('宿題メーカーの書き出しファイルではありません。');
    let nh = 0;
    for (const [id, h] of Object.entries(inc.homeworks || {})) {
      const l = store.homeworks[id];
      if (!l || (h.updatedAt || 0) > (l.updatedAt || 0)) { store.homeworks[id] = normalizeHw(h); nh++; }
    }
    for (const k of ['meanings', 'overrides', 'custom'])
      for (const [id, v] of Object.entries(inc[k] || {})) { const l = store[k][id]; if (!l || (v.at || 0) > (l.at || 0)) store[k][id] = v; }
    readingMap = null;
    return nh;
  }

  document.addEventListener('click', guard('操作', e => {
    const tabBtn = e.target.closest('#tabs button');
    if (tabBtn) return setTab(tabBtn.dataset.tab);
    if (e.target.id === 'modal') return actions['close-modal']();
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.dataset.act === 'noop') return;
    actions[el.dataset.act]?.(el, e);
  }));
  document.addEventListener('input', guard('入力', e => {
    const t = e.target, h = hw();
    if (t.id === 'q') { ps.q = t.value; ps.limit = 60; return renderWordList(); }
    if (t.id === 'from') return void (ps.from = t.value);
    if (t.id === 'to') return void (ps.to = t.value);
    if (t.id === 'randomN') return void (ps.randomN = t.value);
    if (t.dataset.hw) { h[t.dataset.hw] = t.value; return touch(); }
    if (t.dataset.set === 'extraKanji') {
      h.settings.extraKanji = t.value; touch();
      const c = $('#kanjiCount'); if (c) c.textContent = allowedOf(h).size;
      return h.sections.forEach(refreshNotes);
    }
    if (t.dataset.sins) { const s = findSec(t); s.ins[t.dataset.sins] = t.value; return touch(); }
    if (t.dataset.sfield === 'text') { const s = findSec(t); s.text = t.value; touch(); return refreshNotes(s); }
    if (t.id === 'aiCount' && modalCtx?.prompt) $('#aiPrompt').value = modalCtx.prompt(Math.max(1, Math.min(20, +t.value || 5)));
  }));
  document.addEventListener('change', guard('設定', e => {
    const t = e.target, h = hw();
    if (t.id === 'posSel') { ps.pos = t.value; ps.limit = 60; return renderWordList(); }
    if (t.id === 'hideUsed') { ps.hideUsed = t.checked; return renderWordList(); }
    if (t.id === 'onlyMissing') {
      modalCtx.onlyMissing = t.checked;
      $('#aiPrompt').value = SL.meaningPrompt(t.checked ? modalCtx.missing : modalCtx.all); return;
    }
    if (t.id === 'impFile') {
      const f = t.files?.[0]; if (!f) return;
      f.text().then(txt => { const n = mergeBackup(JSON.parse(txt)); saveNow(); render(); alert(`読み込みました（宿題 ${n}件を追加・更新）。`); })
        .catch(err => showErrorBanner('読み込めませんでした: ' + err.message));
      t.value = ''; return;
    }
    if (t.dataset.set) {
      h.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : t.value; touch();
      return store.ui.tab === 'print' ? renderPreview() : renderSections();
    }
    if (t.dataset.sfield && t.dataset.sfield !== 'text') {
      const s = findSec(t), f = t.dataset.sfield;
      s[f] = t.type === 'checkbox' ? t.checked : f === 'count' ? Math.max(1, +t.value || 1) : t.value;
      touch(); return refreshNotes(s);
    }
  }));
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (store.ui.tab === 'print') renderPreview(); }, 200); });

  // テスト用の窓口
  window.SHUKUDAI = { store: () => store, hw, layoutPages, buildBlocks, sectionItems, render, mergeBackup, actions };
  render();
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (store.ui.tab === 'print') renderPreview(); });
})();
