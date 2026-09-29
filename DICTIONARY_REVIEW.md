# 動詞辞書の確認記録

2026-09-29。全件校閲の完了報告ではなく、次の担当が継続するための記録。

|項目|処理|
|---|---|
|pouvoir|別動詞 repouvoir の活用が同じ見出しに混入していた。pu / peux 系の行だけを採用。|
|moudre|émoudre・remoudre の活用の混入を除去。moulu / mouds 系を採用。|
|clore / éclore|forclore / déclore の活用が同じ見出しに入っていたため、別語の行を除去。|
|accroître / décroître|accrû・décrû等の不適切なアクセントを含む行を除去。accru / décru、accrois / décrois系を採用。|
|dormir / parfumer / alterner|元の助動詞情報に誤り・重複があるため、avoirを用いる。|
|ressortir|「再び出る」と「管轄・所属」の活用を混ぜず、切り替えて参照する。|
|départir / faillir|複数の活用型を混ぜずに保持。型の使用範囲について追加の校閲余地あり。|
|aboucher / adultérer|英語の参考データだけでは古語に見えるが、現代の専門用法がある。執筆済みの現代用法を古語タグだけで除外しない。|
|annhiler / ambiencer / débouloner / décolléter / décrpyter / déficler|綴りや活用対応を要確認として保持。正規の活用として表示しない。|
|barbarouffer|いたずら由来の可能性が指摘されているため、専門用語として採用しない。検索用に要確認として保持。|
|exagérer|活用全体に混入した語頭 éx- を ex- に修正。未来・条件法の é/è の両綴りは維持。|
|prévaloir|接続法の prévaille 系を prévale 系へ修正。|
|vêtir / revêtir / dévêtir / survêtir|現在 nous の vêtions 系を vêtons 系へ修正。半過去の vêtions 系は正しいので保持。|
|croître|crurent → crûrent、crussions → crûssions 等のアクセントを修正。|
|confire / déconfire / circoncire|接続法半過去の余分な -is- を除去。confisse / confît 等。|
|luire / reluire|接続法半過去の三人称単数 luisît / reluisît を修正。|
|haïr / rapiécer / réarranger|トレマ、セディーユ、g の音を保つ e の欠落・誤記を修正。|
|parqueter など16語|無音の e の前でアクセントも子音重複も欠落していた形を修正。1990年改訂で認められる è＋単子音形を採用。正しい伝統綴りは置換しない。|
|sevrer / halener / hydrogéner / anhéler / réfréner / refréner / régénérer|語幹の e/è、é/è の誤りを時制・人称ごとに修正。|
|réemployer / atermoyer / volleyer|前二者の無音 e 前の y→i、volleyer の y 保持を修正。|
|dépecer / redépecer|未来・条件法・命令法の dépèc- 系を修正。|
|traire とその派生語 / braire / s’efforcer|命令法二人称単数の語尾を修正。braire の非三人称は通常まれであり、使用制限の整理は継続課題。|
|déchoir|古い条件法系列の décherraint を décherraient に修正。現代の通常形は déchoiraient。|

個々の修正前後・時制・人称・根拠URLは `verb_dictionary/conjugation-corrections.json`。適用規則は `conjugation_corrections.py` に分離し、元のCSVは保存している。`partially-corrected` は一部の誤りを訂正した印で、全活用の校閲完了を意味しない。

`editorial/conjugation-reference-audit.json` は別の公開データと比較した差分候補。単純時制の8系列を比較するが、双方にある同じ誤り・未収録形・複合時制・用法の制限は判定できない。一致数を正答数とみなさない。古い綴り（ruisseller / cuider / resver / gascher / connoître / reconnoître / estre）、許容される異綴り（paître）、複数の活用型（départir）、辞書間でアクセント表記が異なる recroître は一律に置換していない。

残る重点確認：助動詞が語義で変わる動詞、欠如動詞・人称制限、歴史的綴りの活用。florir はAcadémieの語義本文で使用形を限定する一方、同サイトの活用表は全系列を表示するため、本文を優先して半過去・現在分詞・不定詞だけをアプリに掲載した。braire と déchoir には使用範囲の注記を追加した。

確認先の例：

- [Académie française：accroître](https://www.dictionnaire-academie.fr/article/A9A0327)
- [Académie française：décroître](https://www.dictionnaire-academie.fr/article/A9D0657)
- [Académie française：ressortir（管轄・所属）](https://www.dictionnaire-academie.fr/article/A9R2131)
- [Académie française：s’abstenir](https://www.dictionnaire-academie.fr/article/A9A0178)
- [Wiktionnaire：départir](https://fr.wiktionary.org/wiki/d%C3%A9partir)
- [Larousse：éclore](https://www.larousse.com/conjugaison/francais/%C3%A9clore/3595)
- [Académie française：prévaloir](https://www.dictionnaire-academie.fr/conjuguer/A9P4254)
- [Académie française：confire](https://www.dictionnaire-academie.fr/conjuguer/A9C3514)
- [OQLF：-eler / -eter の綴り](https://vitrinelinguistique.oqlf.gouv.qc.ca/23169/lorthographe/rectifications-de-lorthographe/rectifications-liees-aux-consonnes-doubles/rectifications-liees-a-la-conjugaison-des-verbes-en-eler-et-en-eter)
- [Académie française：florir](https://www.dictionnaire-academie.fr/article/A9F1040)

éclore は avoir / être の両用がある。現状は原表にある avoir の系列のみで、両系列の選択UIは未実装。ほかにも助動詞が語義や他動詞・自動詞の違いで変わる動詞は精査が必要。

## 検証の範囲

以下はUI刷新前の辞書拡張版の記録。今回のUI・音読追加版では実ブラウザーで再確認し、オフラインでの再読み込み・辞書詳細・文法図解・音読本文まで確認済み。新しい確認範囲は `UI_RELEASE_NOTES.md`。

データ件数・重複・必須項目、主要な混入訂正、検索の正規化、出題除外の判定、複合時制の組み立て、他のアプリのキャッシュを削除しないことを回帰確認した。確認結果は `verb_dictionary/test-report.json`。

実画面でホーム、動詞辞書、意味・例文、活用の切替、地方語の検索、文法図解を確認。辞書全体の保存完了を確認した後、確認用サーバーを停止してもホームと未閲覧だった地方語 abader の詳細が表示された。

上記の実画面確認は最終パッケージ確定前の版で実施。2026-09-29の最終版は全5,346件の構造・代表的な活用・出題除外・検索・キャッシュの自動チェック、JavaScript構文チェック、ZIP整合性検査を通過した。ただし最終版を再度ブラウザーで開く検査は、ローカルサーバーの起動制限と file URL のブラウザー保護制限により実施できなかった。

日本語・英語の全訳・全例文の独立した二次校閲は未完了。元の既存1,172語も今回全件を翻訳し直したわけではない。

## 参照資料

英語Wiktionaryのフランス語動詞データをKaikkiから取得し、語義の照合に用いた。5,346見出し中5,321見出しに参照が見つかったが、この件数は翻訳完了数ではない。

- [Kaikki French dictionary](https://kaikki.org/dictionary/French/)
- [Wiktionary copyright information](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)

`editorial/authoring-part-*.json` に含む参考語義・タグはWiktionary由来（CC BY-SA / GFDL、各項目のURLを記録）。アプリの新規例文は独自作成。配布用 `site/` には研究用の生の辞書ダンプを含めない。提供CSVの由来はユーザー提供ファイルとして記録している。
