// node test/test_lib.mjs — ふりがな・活用・記法・プロンプト解析の確認
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SL = require('../src/lib.js');
const N5 = SL.allowedSet('N5', ''), N4 = SL.allowedSet('N4', '');

// ふりがなの割り当て
assert.deepEqual(SL.align('先生', 'せんせい').segs, [['先生', 'せんせい']]);
assert.deepEqual(SL.align('お休みなさい。', 'おやすみなさい。').segs, [['お', null], ['休', 'やす'], ['みなさい。', null]]);
assert.deepEqual(SL.align('［煙草を］吸います', '［たばこを］すいます').segs, [['［', null], ['煙草', 'たばこ'], ['を］', null], ['吸', 'す'], ['います', null]]);
assert.deepEqual(SL.align('皆さん', 'みなさん').segs, [['皆', 'みな'], ['さん', null]]);
assert.deepEqual(SL.align('エレベーター', 'エレベーター').segs, [['エレベーター', null]]);
assert.deepEqual(SL.align('テレビ局', 'てれびきょく').segs, [['テレビ', null], ['局', 'きょく']]);
assert.equal(SL.align('食べます', 'たべる').ok, false); // 送りがなが合わない → 語全体
assert.deepEqual(SL.parseRuby('{図書館|としょかん}で本'), [['図書館', 'としょかん'], ['で本', null]]);
assert.equal(SL.segsNotation(SL.align('飲みます', 'のみます').segs), '{飲|の}みます');

// 表示のしかた
const segs = SL.align('図書館で', 'としょかんで').segs;
assert.equal(SL.renderSegs(segs, 'all', N5), '<ruby>図書館<rt>としょかん</rt></ruby>で');
assert.equal(SL.renderSegs(segs, 'outside', N5), '<ruby>図書館<rt>としょかん</rt></ruby>で');
assert.equal(SL.renderSegs(SL.align('先生', 'せんせい').segs, 'outside', N5), '先生');
assert.equal(SL.renderSegs(segs, 'kana', N5), 'としょかんで');
assert.equal(SL.renderSegs(segs, 'none', N5), '図書館で');
assert.equal(SL.renderSegs([['<b>', null]], 'all', N5), '&lt;b&gt;');
assert.deepEqual(SL.outside('図書館で本を読む', N5), ['図', '館']);
assert.deepEqual(SL.outside('図書館', N4), []);
assert.ok(SL.allowedSet('N5', '曜々a').has('曜'));
assert.equal(SL.allowedSet('custom', '花').size, 1);

// 前置きの［…］
assert.deepEqual(SL.splitCtx('［煙草を］吸います', '［たばこを］すいます'), { ctxW: '［煙草を］', ctxR: '［たばこを］', w: '吸います', r: 'すいます' });
assert.deepEqual(SL.splitCtx('食べます', 'たべます'), { ctxW: '', ctxR: '', w: '食べます', r: 'たべます' });

// 活用
const C = (w, r, pos, f) => { const x = SL.conjugate(w, r, pos, f); return x && x.w + '/' + x.r; };
const table = [
  ['書きます', 'かきます', '五段動詞', { dict: '書く', nai: '書かない', te: '書いて', ta: '書いた', pot: '書ける', vol: '書こう', imp: '書け', ba: '書けば', pass: '書かれる', caus: '書かせる', proh: '書くな', tai: '書きたい', nakatta: '書かなかった' }],
  ['行きます', 'いきます', '五段動詞', { dict: '行く', te: '行って', ta: '行った', nai: '行かない' }],
  ['持って行きます', 'もっていきます', '五段動詞', { te: '持って行って' }],
  ['うまくいきます', 'うまくいきます', '五段動詞', { te: 'うまくいって' }],
  ['泳ぎます', 'およぎます', '五段動詞', { dict: '泳ぐ', te: '泳いで', ta: '泳いだ' }],
  ['話します', 'はなします', '五段動詞', { dict: '話す', te: '話して', nai: '話さない' }],
  ['待ちます', 'まちます', '五段動詞', { dict: '待つ', te: '待って', nai: '待たない' }],
  ['死にます', 'しにます', '五段動詞', { dict: '死ぬ', te: '死んで' }],
  ['遊びます', 'あそびます', '五段動詞', { dict: '遊ぶ', te: '遊んで', vol: '遊ぼう' }],
  ['読みます', 'よみます', '五段動詞', { dict: '読む', ta: '読んだ', pot: '読める' }],
  ['帰ります', 'かえります', '五段動詞', { dict: '帰る', te: '帰って', nai: '帰らない' }],
  ['買います', 'かいます', '五段動詞', { dict: '買う', te: '買って', nai: '買わない', vol: '買おう' }],
  ['あります', 'あります', '五段動詞', { dict: 'ある', nai: 'ない', nakatta: 'なかった', te: 'あって' }],
  ['いらっしゃいます', 'いらっしゃいます', '五段動詞', { dict: 'いらっしゃる', te: 'いらっしゃって', nai: 'いらっしゃらない', imp: 'いらっしゃい' }],
  ['食べます', 'たべます', '一段動詞', { dict: '食べる', nai: '食べない', te: '食べて', pot: '食べられる', vol: '食べよう', imp: '食べろ', ba: '食べれば', caus: '食べさせる' }],
  ['見ます', 'みます', '一段動詞', { dict: '見る', te: '見て' }],
  ['勉強します', 'べんきょうします', '不規則動詞', { dict: '勉強する', nai: '勉強しない', te: '勉強して', pot: '勉強できる', pass: '勉強される' }],
  ['来ます', 'きます', '不規則動詞', { dict: '来る', nai: '来ない', te: '来て', pot: '来られる', imp: '来い', ba: '来れば' }],
  ['持って来ます', 'もってきます', '不規則動詞', { dict: '持って来る' }],
];
for (const [w, r, pos, forms] of table)
  for (const [f, want] of Object.entries(forms)) assert.equal(SL.conjugate(w, r, pos, f)?.w, want, `${w} ${f}`);
assert.equal(C('来ます', 'きます', '不規則動詞', 'nai'), '来ない/こない');
assert.equal(C('行きます', 'いきます', '五段動詞', 'te'), '行って/いって');
assert.equal(SL.conjugate('わかります', 'わかります', '五段動詞', 'pot'), null);
assert.equal(SL.conjugate('わかります', 'わかります', '五段動詞', 'dict').w, 'わかる');
assert.equal(SL.conjugate('先生', 'せんせい', '名詞', 'dict'), null);
assert.deepEqual(SL.align('来ない', 'こない').segs, [['来', 'こ'], ['ない', null]]);

// 問題の記法
const fill = SL.parseLine('きのう {本|ほん}を [{読|よ}みました]。 => メモ', 'fill');
assert.deepEqual(fill.parts, [{ text: 'きのう {本|ほん}を ' }, { blank: '{読|よ}みました' }, { text: '。' }]);
assert.equal(fill.answer, '{読|よ}みました'); assert.equal(fill.note, 'メモ');
assert.deepEqual(SL.parseLine('わたしは / まいあさ / コーヒーを / {飲|の}みます。', 'order').chunks, ['わたしは', 'まいあさ', 'コーヒーを', '{飲|の}みます。']);
assert.equal(SL.parseLine('【たべます】', 'fill').answer, 'たべます');
assert.equal(SL.parseLine('# メモ', 'free'), null);
assert.equal(SL.parseLine('なにを しますか。 => テニスを します。', 'free').answer, 'テニスを します。');
const chk = SL.checkLines('図書館で [本]を読みます。\nあいう\n{図書館|としょかん}で [ほん]', 'fill', N5);
assert.deepEqual(chk.problems, [{ line: 1, kind: 'kanji', chars: ['図', '館'] }, { line: 2, kind: 'noBlank' }]);

// 自動ふりがな
const sample = [
  { w: '図書館', r: 'としょかん', pos: '名詞' }, { w: '本', r: 'ほん', pos: '名詞' },
  { w: '読みます', r: 'よみます', pos: '五段動詞' }, { w: '行きます', r: 'いきます', pos: '五段動詞' },
  { w: '銀行', r: 'ぎんこう', pos: '名詞' }, { w: '一日', r: 'いちにち', pos: '名詞' }, { w: '一日', r: 'ついたち', pos: '名詞' },
];
const map = SL.buildReadingMap(sample);
const ar = SL.autoRuby('図書館で本を読みました。\n{銀行|ぎんこう}へ行って、一日', map);
assert.equal(ar.text, '{図書館|としょかん}で{本|ほん}を{読|よ}みました。\n{銀行|ぎんこう}へ{行|い}って、一日');
assert.deepEqual(ar.unknown, ['一日']);
assert.equal(SL.autoRuby('行う', map).text, '行う'); // 行+う は単語リストにないので付けない

// AI の返答の読み取り
const ids = new Set(['N5-0028', 'N5-0030']);
assert.deepEqual(SL.parseMeaningReply('```\nN5-0028|teacher|professeur\n- N5-0030|学生|student|étudiant\nN9-0001|x|y\n```', ids),
  { 'N5-0028': { en: 'teacher', fr: 'professeur' }, 'N5-0030': { en: 'student', fr: 'étudiant' } });
assert.match(SL.meaningPrompt([{ id: 'N5-0028', w: '先生', r: 'せんせい', pos: '名詞' }]), /N5-0028\|先生（せんせい）\|名詞/);
assert.match(SL.questionPrompt({ words: [{ w: '本', r: 'ほん' }], level: 'N5', type: 'fill', count: 3, allowed: N5 }), /穴埋め問題を3問/);

// 乱数は同じ種なら同じ並び
assert.deepEqual(SL.shuffle([1, 2, 3, 4, 5], SL.rng(42)), SL.shuffle([1, 2, 3, 4, 5], SL.rng(42)));

// 実データ（data/vocab.json がある場合）: 全動詞の辞書形・て形が作れること、ふりがなが割り当てられること
const dataPath = new URL('../data/vocab.json', import.meta.url);
if (fs.existsSync(dataPath)) {
  const vocab = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const verbs = vocab.filter(v => /動詞/.test(v.pos));
  const fails = [];
  for (const v of verbs) {
    const s = SL.splitCtx(v.w, v.r);
    for (const f of ['dict', 'nai', 'te', 'ta']) {
      const c = SL.conjugate(s.w, s.r, v.pos, f);
      if (!c || !SL.align(c.w, c.r).ok) fails.push(`${v.id} ${v.w} ${f}`);
    }
  }
  assert.deepEqual(fails, [], '活用できない動詞');
  const misaligned = vocab.filter(v => !SL.align(v.w, v.r).ok).map(v => `${v.id} ${v.w}/${v.r}`);
  console.log(`vocab ${vocab.length}語・動詞${verbs.length}語。ふりがなを語全体に付けた語: ${misaligned.length}`, misaligned.slice(0, 20));
}
console.log('test_lib: ok');
