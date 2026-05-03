export const revisionPrompt = `以下はPubMedで実行した検索結果です。
医学情報専門家として検索式を改善してください。

目的：
- 重要文献を落とさずにノイズを減らす
- MeSHと[tiab]のバランスを調整する
- 広すぎる語を削除または近接検索化する
- 漏れている同義語を追加する
- 検索式内の検索語は英語のみを使用する
- PubMedで使用可能な一文検索式として出力する

元の疑問：
{{question}}

実行した検索式：
{{executedSearchString}}

PubMed APIで取得した情報：
{{apiFeedbackBlock}}

ユーザーによる評価：
検索結果件数：
{{resultCount}}

上位20件中、関連が高そうな件数：
{{relevantCountTop20}}

ノイズとして多かった内容：
{{noiseDescription}}

追加したい検索語：
{{additionalKeywords}}

除外したい検索語：
{{termsToRemove}}

希望：
{{userGoal}}

出力してください：

# 1. 問題点の診断
# 2. 削除または修正すべき語
# 3. 追加すべき語
# 4. 修正版：広め検索式
# 5. 修正版：推奨バランス検索式
# 6. 修正版：ノイズ低減検索式
# 7. 最終推奨検索式
# 8. セルフチェック

PubMed検索式は、PubMedにコピー＆ペースト可能な一文で出力してください。`;
