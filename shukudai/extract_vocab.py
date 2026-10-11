"""Langoal の JLPT 語彙一覧 PDF（N5・N4）から、語・読み・品詞を取り出して data/vocab.json を作る。

使い方:
  pip install pdfplumber
  python3 extract_vocab.py --n5 JLPT_N5….pdf --n4 JLPT_N4….pdf

PDF はブラウザーで印刷したもので、表は「# / 語（ふりがな付き）/ 読み / ローマ字 / 品詞」の5列。
英訳の列は印刷範囲の外なので入っていない。ローマ字は使わない。
出力（data/vocab.json）は第三者の一覧から作ったデータなので、公開リポジトリには入れない（.gitignore 済み）。
"""
import argparse, json, os, re, sys
import pdfplumber

COLS = ('num', 'word', 'yomi', 'romaji', 'pos')
KANA_ONLY = re.compile(r'^[぀-ヿ～〜・［］\[\]（）()、。！？!?\s0-9A-Za-z０-９Ａ-Ｚ]+$')
KATA = re.compile(r'[ァ-ヺ]')


# 元のPDFの明らかな誤り・欠け（品詞）だけを直す。語の選定や並びには手を入れない。
FIXES = {
    'N4-0025': {'pos': '不規則動詞'},  # 引っ越しします（PDFでは名詞）
    'N4-0220': {'pos': '一段動詞'},    # 組み立てます（PDFでは不規則動詞）
    'N5-1073': {'pos': '名詞'},        # 掃除機（印刷の末尾で品詞列が欠けた）
}


def fix_dash(s):
    # PDFでは長音「ー」が全角ハイフン「－」になっている。カタカナの後なら長音、それ以外（－目 など）は「～」。
    out = []
    for i, ch in enumerate(s):
        if ch == '－':
            ch = 'ー' if i and (KATA.match(s[i - 1]) or s[i - 1] == 'ー') else '～'
        out.append(ch)
    return ''.join(out)


def columns(pdf):
    # 2ページ目の行区切り（細い矩形）の左端が列の境目。1ページ目は見出しがあるので使わない。
    xs = sorted({round(r['x0'], 1) for r in pdf.pages[1].rects if r['height'] < 2})
    edges = [x - 3 for x in xs[1:5]]
    return list(zip(COLS, [0] + edges, edges + [10000]))


def text_of(chars, main=None):
    cs = [c for c in chars if main is None or (c['size'] >= 12) == main]
    cs.sort(key=lambda c: (round(c['top'] / 4), c['x0']))
    return ''.join(c['text'] for c in cs).strip()


def extract(path, level):
    pdf = pdfplumber.open(path)
    cols = columns(pdf)
    items, cur = [], None
    for page in pdf.pages:
        seps = sorted({round(r['top']) for r in page.rects
                       if r['height'] < 2 and abs(r['x0'] - 18) < 1 and r['x1'] < 60})
        bounds = [-1e9] + seps + [1e9]
        regions = []
        for top, bottom in zip(bounds, bounds[1:]):
            region = [c for c in page.chars if top <= c['top'] < bottom and 30 < c['top'] < 835]
            # 最終ページの出典URLは表の外の小さな文字なので落とす
            if region and not ('langoal' in ''.join(c['text'] for c in region) and not any(c['size'] >= 12 for c in region)):
                regions.append(region)
        for i, region in enumerate(regions):
            first, last = i == 0, i == len(regions) - 1
            cells = {}
            for c in region:
                for name, a, b in cols:
                    if a <= c['x0'] < b:
                        cells.setdefault(name, []).append(c)
                        break
            num = text_of(cells.get('num', []))
            # ページをまたぐ行の扱い:
            # ・ページ先頭の番号なし区画は、前ページ最後の行の続き。
            # ・ページ末の番号なし区画は、番号が次ページに印刷される新しい行の始まり（番号は次ページ先頭で受け取る）。
            if num.isdigit():
                if first and cur and cur['n'] is None:
                    cur['n'] = int(num)
                else:
                    if cur:
                        items.append(cur)
                    cur = {'n': int(num), 'w': '', 'r': '', 'pos': ''}
            elif last and not first and cur is not None:
                items.append(cur)
                cur = {'n': None, 'w': '', 'r': '', 'pos': ''}
            if cur is None:
                continue
            cur['w'] += text_of(cells.get('word', []), True)
            cur['r'] += text_of(cells.get('yomi', []))
            cur['pos'] += text_of(cells.get('pos', []))
    if cur:
        items.append(cur)
    out = []
    for it in items:
        if it['n'] is None:  # 表の見出し行など
            continue
        w = re.sub(r'\s+', '', fix_dash(it['w']))
        r = re.sub(r'\s+', '', fix_dash(re.sub(r'https?://\S*|/vocabulary\S*', '', it['r']))) or w
        if not KANA_ONLY.match(r):
            # 読みの列にかな以外が入るのは、印刷時に画面のポップアップが重なって崩れた行（N4 #9）。収録しない。
            print(f'  skip {level} #{it["n"]}: {w} / {r}', file=sys.stderr)
            continue
        row = {'id': f'{level}-{it["n"]:04d}', 'lv': level, 'n': it['n'], 'w': w, 'r': r, 'pos': it['pos'].strip()}
        row.update(FIXES.get(row['id'], {}))
        out.append(row)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n5', required=True)
    ap.add_argument('--n4', required=True)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'vocab.json'))
    a = ap.parse_args()
    words = extract(a.n5, 'N5') + extract(a.n4, 'N4')
    problems = [x for x in words if not x['w'] or not x['pos']]
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(words)} words → {a.out}')
    for lv in ('N5', 'N4'):
        nums = [x['n'] for x in words if x['lv'] == lv]
        missing = sorted(set(range(1, max(nums) + 1)) - set(nums))
        print(f'  {lv}: {len(nums)} words, last #{max(nums)}, missing {missing[:10]}')
    if problems:
        print('要確認（語・品詞が空）:', file=sys.stderr)
        for x in problems:
            print('  ', x, file=sys.stderr)


if __name__ == '__main__':
    main()
