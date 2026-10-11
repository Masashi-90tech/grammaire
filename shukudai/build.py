"""宿題メーカーを1つのHTMLにまとめる。

  python3 build.py            → dist/shukudai.html（単語データ入り。オフラインで開ける）

単語データ data/vocab.json は extract_vocab.py で PDF から作る（公開リポジトリには入れていない）。
"""
import datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')


def read(*p):
    with open(os.path.join(HERE, *p), encoding='utf-8') as f:
        return f.read()


def main():
    vocab_path = os.path.join(HERE, 'data', 'vocab.json')
    if not os.path.exists(vocab_path):
        sys.exit('data/vocab.json がありません。先に extract_vocab.py --n5 … --n4 … で PDF から作ってください。')
    vocab = json.loads(read('data', 'vocab.json'))
    assert len(vocab) > 1500, f'語数が少なすぎます: {len(vocab)}'
    ids = [v['id'] for v in vocab]
    assert len(ids) == len(set(ids)), 'id が重複しています'
    html = read('src', 'template.html')
    # JSON を <script> に埋め込むので </ を逃がす
    vocab_js = json.dumps(vocab, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    build = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    for key, value in (('/*@@STYLE@@*/', read('src', 'style.css')), ('/*@@UNITS@@*/', read('src', 'units.js')), ('/*@@LIB@@*/', read('src', 'lib.js')),
                       ('/*@@APP@@*/', read('src', 'app.js')), ('/*@@VOCAB@@*/', vocab_js), ('/*@@BUILD@@*/', build)):
        assert html.count(key) == 1, key
        html = html.replace(key, value)
    os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
    out = os.path.join(HERE, 'dist', 'shukudai.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'{out}  {len(html.encode("utf-8")) // 1024}KB  単語{len(vocab)}語  {build}')


if __name__ == '__main__':
    main()
