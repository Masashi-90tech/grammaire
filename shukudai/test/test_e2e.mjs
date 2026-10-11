// node test/test_e2e.mjs — dist/shukudai.html をブラウザーで操作して、プレビュー・PDF・保存を確かめる
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
// playwright はグローバルに入っているものを使う（npm root -g）
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium } = pw;

const dist = new URL('../dist/shukudai.html', import.meta.url);
const outDir = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: 'ja-JP' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());
await page.goto(dist.href);
const noBanner = async () => assert.equal(await page.locator('#errBanner').count(), 0, await page.locator('#errBanner').textContent().catch(() => ''));

// ① 単語: 番号で範囲選択＋検索してタップ
await page.fill('#from', '560'); await page.fill('#to', '575');
await page.click('[data-act=pick-range]');
await page.fill('#q', 'せんせい');
await page.click('.wrow[data-id="N5-0028"]');
await page.fill('#q', '');
let words = await page.evaluate(() => SHUKUDAI.hw().words);
assert.ok(words.length >= 15, 'range pick');
assert.ok(words.includes('N5-0028'));
// 意味を ✎ で入れる
await page.fill('#q', 'せんせい');
await page.click('.wrow[data-id="N5-0028"] [data-act=edit]');
await page.fill('#e-en', 'teacher'); await page.fill('#e-fr', 'professeur');
await page.click('[data-act=edit-save]');
assert.deepEqual(await page.evaluate(() => { const m = SHUKUDAI.store().meanings['N5-0028']; return [m.en, m.fr]; }), ['teacher', 'professeur']);
// AIの往復: プロンプトに選んだ語が入り、返事を取り込める
await page.click('[data-act=ai-meaning]');
const prompt = await page.inputValue('#aiPrompt');
assert.match(prompt, /ID\|English\|Français/);
const ids = (await page.evaluate(() => SHUKUDAI.hw().words)).filter(id => id !== 'N5-0028');
await page.fill('#aiReply', ids.map((id, i) => `${id}|meaning ${i}|sens ${i}`).join('\n'));
await page.click('[data-act=import-meanings]');
assert.match(await page.textContent('#aiResult'), new RegExp(`${ids.length}語`));
await page.click('[data-act=close-modal]');
await noBanner();
await page.screenshot({ path: path.join(outDir, '1-words.png'), fullPage: false });

// ② 問題: 自分で書く問題を足す
await page.click('#tabs [data-tab=sections]');
for (const t of ['meaning', 'match', 'sentence', 'fill', 'order', 'free']) { await page.selectOption('#addType', t); await page.click('[data-act=sec-add]'); }
const secIds = await page.evaluate(() => SHUKUDAI.hw().sections.map(s => s.type + ':' + s.id));
const sid = t => secIds.find(x => x.startsWith(t + ':')).split(':')[1];
await page.fill(`[data-sid="${sid('fill')}"] textarea[data-sfield=text]`, '図書館で 本を [読みました]。\nあさ 6時に [{起|お}きます]。');
await page.click(`[data-sid="${sid('fill')}"] [data-act=auto-ruby]`);
const fillText = await page.evaluate(id => SHUKUDAI.hw().sections.find(s => s.id === id).text, sid('fill'));
assert.match(fillText, /\{図書館\|としょかん\}/);
await page.fill(`[data-sid="${sid('order')}"] textarea[data-sfield=text]`, 'わたしは / まいあさ / コーヒーを / {飲|の}みます。');
await page.fill(`[data-sid="${sid('free')}"] textarea[data-sfield=text]`, 'しゅうまつは {何|なに}を しますか。 => テニスを します。');
// 活用の形を足す（可能形）
await page.click(`[data-sid="${sid('conj')}"] [data-act=form][data-f=pot]`);
await noBanner();
await page.screenshot({ path: path.join(outDir, '2-sections.png'), fullPage: true });

// ③ 印刷: スライド
await page.click('#tabs [data-tab=print]');
await page.waitForSelector('.page-wrap');
const check = async label => {
  const r = await page.evaluate(() => ({
    pages: document.querySelectorAll('#printArea .page').length,
    over: [...document.querySelectorAll('#preview .page-body')].filter(b => b.scrollHeight > b.clientHeight + 1).length,
    detail: [...document.querySelectorAll('#preview .page-body')].map((b, i) => `${i + 1}:${b.scrollHeight}/${b.clientHeight}:${[...b.children].map(c => c.className + '@' + c.offsetTop + '+' + c.offsetHeight).slice(-3).join(',')}`).filter(x => { const [, a] = x.split(':'); const [sh, ch] = a.split('/').map(Number); return sh > ch + 1; }),
  }));
  if (r.over) console.error(label, r.detail);
  assert.ok(r.pages >= 2, `${label}: pages`);
  assert.equal(r.over, 0, `${label}: はみ出したページ`);
  return r.pages;
};
const slidePages = await check('slide');
await page.screenshot({ path: path.join(outDir, '3-print-slide.png'), fullPage: true });
await page.emulateMedia({ media: 'print' });
const pdfSlide = await page.pdf({ preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
fs.writeFileSync(path.join(outDir, 'slide.pdf'), pdfSlide);
const countPdfPages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
assert.equal(countPdfPages(pdfSlide), slidePages, 'slide PDF のページ数');

// A4 たて・すべての漢字にふりがな・日本語＋フランス語・教科書体
await page.selectOption('[data-set=format]', 'a4');
await page.selectOption('[data-set=policy]', 'all');
await page.selectOption('[data-set=lang]', 'ja-fr');
await page.selectOption('[data-set=font]', 'kyokasho');
await page.waitForTimeout(100);
const a4Pages = await check('a4');
assert.ok(await page.locator('#printArea ruby').count() > 10, 'ふりがな');
assert.match(await page.textContent('#printArea'), /professeur/);
assert.match(await page.textContent('#printArea'), /Corrigé/);
await page.screenshot({ path: path.join(outDir, '4-print-a4.png'), fullPage: true });
await page.emulateMedia({ media: 'print' });
const pdfA4 = await page.pdf({ preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
fs.writeFileSync(path.join(outDir, 'a4.pdf'), pdfA4);
assert.equal(countPdfPages(pdfA4), a4Pages, 'A4 PDF のページ数');

// こたえだけ / 日本語のみ では意味の問題が出ない
await page.selectOption('[data-set=answers]', 'only');
await page.selectOption('[data-set=lang]', 'ja');
await page.waitForTimeout(100);
const txt = await page.textContent('#printArea');
assert.doesNotMatch(txt, /professeur/);
assert.match(txt, /こたえ/);
await noBanner();

// 保存されていて、開き直しても残る
await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
await page.reload();
const after = await page.evaluate(() => ({ n: SHUKUDAI.hw().words.length, secs: SHUKUDAI.hw().sections.length, lang: SHUKUDAI.hw().settings.lang }));
assert.ok(after.n >= 15 && after.secs >= 10 && after.lang === 'ja', JSON.stringify(after));

// 一覧: 複製 → 使用済みの印 / 書き出しの読み込み（同じものを読んでも増えない）
await page.click('#tabs [data-tab=list]');
await page.click('[data-act=dup-hw]');
assert.equal(await page.evaluate(() => Object.keys(SHUKUDAI.store().homeworks).length), 2);
const backup = await page.evaluate(() => JSON.parse(JSON.stringify({ app: 'shukudai', homeworks: SHUKUDAI.store().homeworks, meanings: SHUKUDAI.store().meanings })));
assert.equal(await page.evaluate(b => SHUKUDAI.mergeBackup(b), backup), 0);
await page.click('#tabs [data-tab=words]');
assert.ok(await page.locator('.used').count() > 0, '前の宿題で使った語に印');
await noBanner();

// スマホ幅でもはみ出さない
await page.setViewportSize({ width: 390, height: 844 });
await page.click('#tabs [data-tab=print]');
await page.waitForSelector('.page-wrap');
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
assert.ok(sw <= 391, 'スマホ幅で横スクロール: ' + sw);
await page.screenshot({ path: path.join(outDir, '5-phone-print.png'), fullPage: false });
await noBanner();

assert.deepEqual(errors, []);
await browser.close();
console.log(`test_e2e: ok（slide ${slidePages}ページ / A4 ${a4Pages}ページ）→ ${outDir}`);
