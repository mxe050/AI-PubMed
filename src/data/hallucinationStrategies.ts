// 「低モデル用ハルシネーション防止プロンプト」モードで表示する比較表データ。
//
// 元データ：OpenAI / Anthropic / Google(Gemini) の公式・準公式ガイドラインから
// 整理した 36 項目 × 3 プロバイダ。横長表よりも扱いやすいよう、
// 1 行 = (項目, プロバイダ) の **正規化テーブル** に変換した。
// 「記載なし」（recorded: false）の行は表示／非表示を切り替えられる。

export type HsProvider = "OpenAI" | "Anthropic" | "Google/Gemini";

export interface HsRow {
  id: number;
  category: string;
  item: string;
  provider: HsProvider;
  policy: string;
  reason: string;
  recorded: boolean;
}

const NA = "記載なし";

function row(
  id: number,
  category: string,
  item: string,
  provider: HsProvider,
  policy: string,
  reason: string
): HsRow {
  const recorded = policy !== NA && reason !== NA;
  return { id, category, item, provider, policy, reason, recorded };
}

export const hallucinationStrategies: HsRow[] = [
  // 1. AIの回答を最終情報源にしない
  row(1, "verification", "AIの回答を最終情報源にしない", "OpenAI",
    "ChatGPTは有用な下書き・補助として使い、重要情報は信頼できる情報源で確認することを推奨。",
    "モデルは自信ありげに誤情報、架空の引用、存在しない文献を出す可能性があるため。"),
  row(1, "verification", "AIの回答を最終情報源にしない", "Anthropic",
    "高リスクな判断では、Claudeの回答も必ず検証すべきとする。",
    "ハルシネーションは完全には排除できず、重要情報は人間または外部ソースで確認する必要があるため。"),
  row(1, "verification", "AIの回答を最終情報源にしない", "Google/Gemini",
    "人間による厳格な手動評価、後処理、監視を重視。",
    "AIモデルは不正確・偏った・問題のある出力を生成し得るため、最終確認なしではリスクが残るため。"),

  // 2. 重要情報を信頼できる情報源で確認する
  row(2, "verification", "重要情報を信頼できる情報源で確認する", "OpenAI",
    "引用、データ、技術情報、外部文書への参照は必ず確認することを推奨。",
    "PMID、DOI、引用、数値などはモデルがもっともらしく捏造しやすいため。"),
  row(2, "verification", "重要情報を信頼できる情報源で確認する", "Anthropic",
    "各主張に引用や根拠を付けさせ、検証可能にすることを推奨。",
    "根拠がない主張を後から撤回させることで、虚偽情報を減らせるため。"),
  row(2, "verification", "重要情報を信頼できる情報源で確認する", "Google/Gemini",
    "Grounding with Google Searchなどにより、検証可能なソースに接続することを推奨。",
    "モデルの知識カットオフを超えた情報や不確実な情報を、リアルタイム情報で補えるため。"),

  // 3. 検索・外部ツールを使う
  row(3, "grounding", "検索・外部ツールを使う", "OpenAI",
    "正確性が重要な場合、検索、Deep Research、ファイル検索などの利用を推奨。",
    "内部知識だけでは最新情報や正確な出典確認ができないため。"),
  row(3, "grounding", "検索・外部ツールを使う", "Anthropic",
    "検索、引用確認、外部知識制限などにより内部記憶への依存を下げる。",
    "内部記憶に頼ること自体がハルシネーションの構造的原因になり得るため。"),
  row(3, "grounding", "検索・外部ツールを使う", "Google/Gemini",
    "Google Search、Vertex AI Search、RAG、Google Maps、コード実行などのツール利用を推奨。",
    "外部データや計算ツールに接続することで、事実・計算・最新情報の誤りを減らせるため。"),

  // 4. RAG・グラウンディング
  row(4, "grounding", "RAG・グラウンディング", "OpenAI",
    "参照文書や検索結果を与え、その範囲に基づいて回答させるRAGの利用を推奨。",
    "モデルの推測ではなく、取得済みデータに回答を固定できるため。"),
  row(4, "grounding", "RAG・グラウンディング", "Anthropic",
    "提供文書だけを使い、一般知識を使わないよう明示することを推奨。",
    "内部知識と文脈情報の混同を防ぎ、回答を文書内の事実に接地できるため。"),
  row(4, "grounding", "RAG・グラウンディング", "Google/Gemini",
    "Grounding with Google Search、Vertex AI Search、RAGを明確に推奨。",
    "LLMの回答を現実の情報源に結びつけることで、作り話や事実誤認を減らせるため。"),

  // 5. 内部記憶だけで出典・論文情報を出させない
  row(5, "grounding", "内部記憶だけで出典・論文情報を出させない", "OpenAI",
    "医学・学術用途では、論文情報はPubMed等で確認済みのものだけを出す設計が望ましい。",
    "モデルは実在しない論文名・著者名・DOIを合成する可能性があるため。"),
  row(5, "grounding", "内部記憶だけで出典・論文情報を出させない", "Anthropic",
    "外部知識制限、引用確認、直接引用を使うことで、内部記憶依存を避ける。",
    "「記憶しているつもり」の情報が実際には合成物である可能性があるため。"),
  row(5, "grounding", "内部記憶だけで出典・論文情報を出させない", "Google/Gemini",
    "提供文脈またはGoogle Search等に基づく回答を重視。",
    "内部知識だけでは、古い情報・不正確情報・キメラ的合成が生じるため。"),

  // 6. 「わからない」と言う許可
  row(6, "uncertainty", "「わからない」と言う許可", "OpenAI",
    "不明な場合は推測せず、不明と述べるよう指示するのが有効。",
    "モデルはユーザーに答えようとして、情報不足でも補完する傾向があるため。"),
  row(6, "uncertainty", "「わからない」と言う許可", "Anthropic",
    "Claudeに「I don't know」と言う許可を明示することを強く推奨。",
    "不確実な情報を確実であるかのように提示する典型的ハルシネーションを抑えるため。"),
  row(6, "uncertainty", "「わからない」と言う許可", "Google/Gemini",
    "文脈に答えがなければ「情報は利用できない」と述べる指示を提示。",
    "文脈にない情報を推測で埋めることを防ぐため。"),

  // 7. 不明時の代替動作を明示する
  row(7, "uncertainty", "不明時の代替動作を明示する", "OpenAI",
    "「出力しない」「検索式を提示する」など、代わりに何をするかを書くことを推奨。",
    "禁止だけではモデルが代替行動を選べず、推測で埋める可能性があるため。"),
  row(7, "uncertainty", "不明時の代替動作を明示する", "Anthropic",
    "不明な場合の応答、引用が見つからない場合の撤回を明示する。",
    "根拠のない主張を残さないため。"),
  row(7, "uncertainty", "不明時の代替動作を明示する", "Google/Gemini",
    "不明な場合は情報なしと述べる、または追加確認・ツール使用を行う設計が望ましい。",
    "情報不足時の創作を防ぎ、ユーザーに確認行動を促せるため。"),

  // 8. 指示を具体的に書く
  row(8, "prompt-design", "指示を具体的に書く", "OpenAI",
    "明確・具体的・詳細な指示を推奨。目的、制約、長さ、形式を明示する。",
    "「正確に」だけでは不十分で、モデルが何を守るべきか判断しにくいため。"),
  row(8, "prompt-design", "指示を具体的に書く", "Anthropic",
    "役割と行動規則を明確にし、引用・文書制限・検証手順を具体化する。",
    "役割だけでは弱く、具体的な行動ルールが必要なため。"),
  row(8, "prompt-design", "指示を具体的に書く", "Google/Gemini",
    "明確で具体的な指示を推奨。Gemini 3では直接的で構造化された指示を推奨。",
    "指示の自由度が高いほど、モデルが予測不能な補完をしやすいため。"),

  // 9. 指示と入力を区切る
  row(9, "prompt-design", "指示と入力を区切る", "OpenAI",
    "###、三重引用符、Markdown、XMLタグなどで指示と文脈を分けることを推奨。",
    "モデルが命令、入力データ、出力条件を混同するのを防ぐため。"),
  row(9, "prompt-design", "指示と入力を区切る", "Anthropic", NA, NA),
  row(9, "prompt-design", "指示と入力を区切る", "Google/Gemini",
    "XMLタグやMarkdown見出しを使い、指示・文脈・タスクを分離することを推奨。",
    "モデルが文脈と指示を区別しやすくなり、誤解や混入を減らせるため。"),

  // 10. 出力形式を固定する
  row(10, "format", "出力形式を固定する", "OpenAI",
    "期待する出力形式を例示することを推奨。Structured Outputsも有効。",
    "自由記述の中に未確認情報が紛れ込むことを防ぎやすいため。"),
  row(10, "format", "出力形式を固定する", "Anthropic",
    "箇条書き、引用付き回答、検証可能な形式にすることが有効。",
    "各主張を監査可能にし、根拠のない情報を発見しやすくするため。"),
  row(10, "format", "出力形式を固定する", "Google/Gemini",
    "Response formatやStructured outputを推奨。JSON Schemaの利用も推奨。",
    "出力を安定化し、後処理・検証・誤情報検出をしやすくするため。"),

  // 11. 直接引用を使う
  row(11, "citation", "直接引用を使う", "OpenAI", NA, NA),
  row(11, "citation", "直接引用を使う", "Anthropic",
    "長文書タスクでは、まず逐語的な引用を抽出してから回答することを推奨。",
    "回答を実際の本文に接地させ、文脈にない情報の生成を減らせるため。"),
  row(11, "citation", "直接引用を使う", "Google/Gemini",
    "根拠提示や文脈に基づく回答は推奨されるが、「まず直接引用を抽出」としての明示は記載なし。", NA),

  // 12. 引用・出典を付けて検証可能にする
  row(12, "citation", "引用・出典を付けて検証可能にする", "OpenAI",
    "重要情報はソース確認を推奨。ただし、引用自体も検証対象とする。",
    "架空の引用や存在しない出典が生成されることがあるため。"),
  row(12, "citation", "引用・出典を付けて検証可能にする", "Anthropic",
    "各主張に引用・根拠を付けさせ、引用が見つからなければ撤回させることを推奨。",
    "回答の監査可能性を高め、根拠のない主張を除外できるため。"),
  row(12, "citation", "引用・出典を付けて検証可能にする", "Google/Gemini",
    "Google Search Groundingにより、検証可能なソースの提示を可能にする。",
    "リアルタイム情報と検証可能な根拠に接続することで、事実性を高めるため。"),

  // 13. 段階的思考・推論
  row(13, "reasoning", "段階的思考・推論", "OpenAI",
    "複雑なタスクでは、計画、分解、検証を行わせることが有効。ただし内部推論をそのまま出す必要はない。",
    "一度に答えさせると、論理飛躍や確認漏れが起きやすいため。"),
  row(13, "reasoning", "段階的思考・推論", "Anthropic",
    "Chain-of-thought verificationを推奨。最終回答前にステップごとの推論を確認させる。",
    "誤った前提や論理の飛躍を発見しやすくするため。"),
  row(13, "reasoning", "段階的思考・推論", "Google/Gemini",
    "複雑なタスクは分解・チェーン化を推奨。Gemini 2.5/3は内部思考を使うため、通常は外部に詳細推論を書かせる必要はないとする。",
    "タスクを分割することで、処理の混乱や文脈破綻を減らせるため。"),

  // 14. タスクを分解する
  row(14, "reasoning", "タスクを分解する", "OpenAI",
    "複雑な処理ではステップやワークフローを明示することが有効。",
    "確認、検索、要約、出力を分けることで誤混入を減らせるため。"),
  row(14, "reasoning", "タスクを分解する", "Anthropic", NA, NA),
  row(14, "reasoning", "タスクを分解する", "Google/Gemini",
    "複雑なプロンプトはコンポーネントに分解し、チェーンプロンプト化することを推奨。",
    "一つの大きな処理より、段階処理の方が論理の飛躍や混乱を抑えられるため。"),

  // 15. 確信度ラベルを付ける
  row(15, "uncertainty", "確信度ラベルを付ける", "OpenAI",
    "提示文では有効策として扱うが、OpenAI公式ではモデルの自信は信頼性そのものではないと注意。",
    "モデルは誤答にも高い自信を示すため、確信度だけに依存すると危険なため。"),
  row(15, "uncertainty", "確信度ラベルを付ける", "Anthropic",
    "提示文では確信度明示を有効策として整理。公式ドキュメント上の主要推奨としては記載なし。",
    "不確かな情報を同じトーンで提示する問題を抑えるため。"),
  row(15, "uncertainty", "確信度ラベルを付ける", "Google/Gemini", NA, NA),

  // 16. 役割設定・責任の明確化
  row(16, "prompt-design", "役割設定・責任の明確化", "OpenAI",
    "developer messageやsystem/developer指示で、役割・目的・制約を明示することを推奨。",
    "モデルの応答基準を「何か答える」から「条件を守って答える」へ寄せるため。"),
  row(16, "prompt-design", "役割設定・責任の明確化", "Anthropic",
    "正確さを優先する役割設定は有効だが、具体的ルールと組み合わせる必要がある。",
    "役割は動機づけ、ルールは行動制約として働くため。"),
  row(16, "prompt-design", "役割設定・責任の明確化", "Google/Gemini",
    "System instructionで役割、制約、出力形式を明示することを推奨。",
    "モデルのふるまいを用途に合わせ、不要な自由度を減らすため。"),

  // 17. ネガティブプロンプティング・禁止事項
  row(17, "prompt-design", "ネガティブプロンプティング・禁止事項", "OpenAI",
    "「してはいけない」だけでなく、「代わりに何をするか」を書くことを推奨。",
    "禁止だけではモデルが次の行動を誤り、補完する可能性があるため。"),
  row(17, "prompt-design", "ネガティブプロンプティング・禁止事項", "Anthropic",
    "提示文では悪い例を示して失敗パターンを避けることを有効策として整理。公式主要項目としては記載なし。",
    "具体的な失敗例を示すことで、モデルが回避すべきパターンを認識しやすくなるため。"),
  row(17, "prompt-design", "ネガティブプロンプティング・禁止事項", "Google/Gemini",
    "制約として「何をする/しない」を明示することを推奨。",
    "望ましくない出力経路を先回りして制限するため。"),

  // 18. temperatureを低くする
  row(18, "params", "temperatureを低くする", "OpenAI",
    "事実確認、抽出、正確なQ&Aではtemperature 0が望ましいと説明。",
    "創造性やばらつきを下げ、安定した出力にするため。"),
  row(18, "params", "temperatureを低くする", "Anthropic",
    "公式のハルシネーション低減ページでは記載なし。", NA),
  row(18, "params", "temperatureを低くする", "Google/Gemini",
    "Geminiでは低温度は決定的・非開放的な応答に向くと説明。ただしGemini 3ではデフォルト温度維持を強く推奨する注意もある。",
    "低温度はランダム性を下げる一方、モデルによっては性能劣化やループなどの予期せぬ挙動もあるため、用途ごとに調整が必要。"),

  // 19. モデルパラメータを調整する
  row(19, "params", "モデルパラメータを調整する", "OpenAI",
    "temperatureなどを用途に応じて調整。",
    "タスクに応じて創造性・安定性のバランスを制御するため。"),
  row(19, "params", "モデルパラメータを調整する", "Anthropic",
    "公式ハルシネーション低減ページでは記載なし。", NA),
  row(19, "params", "モデルパラメータを調整する", "Google/Gemini",
    "temperature、topP、topK、max tokens、stop sequencesなどの実験を推奨。",
    "パラメータにより出力の多様性・決定性・長さが変わり、誤出力にも影響するため。"),

  // 20. 評価セット・Evalsで検証する
  row(20, "eval", "評価セット・Evalsで検証する", "OpenAI",
    "本番ではevalsを作り、プロンプトやモデル変更時に性能を測ることを推奨。",
    "モデル変更やプロンプト変更でハルシネーション傾向が変わるため。"),
  row(20, "eval", "評価セット・Evalsで検証する", "Anthropic",
    "継続的な評価を重視。Best-of-N、反復検証も推奨。",
    "ハルシネーションはドメインや入力で変わるため、継続測定が必要なため。"),
  row(20, "eval", "評価セット・Evalsで検証する", "Google/Gemini",
    "Safety benchmarking、adversarial testing、評価データセット、複数回テストを推奨。",
    "AI出力は同じ入力でも変わり得るため、通常テストと敵対的テストで弱点を見つける必要があるため。"),

  // 21. モデルスナップショットを固定する
  row(21, "params", "モデルスナップショットを固定する", "OpenAI",
    "本番では特定のモデルスナップショットに固定し、一貫性を保つことを推奨。",
    "モデル更新で同じプロンプトの挙動が変わる可能性があるため。"),
  row(21, "params", "モデルスナップショットを固定する", "Anthropic", NA, NA),
  row(21, "params", "モデルスナップショットを固定する", "Google/Gemini", NA, NA),

  // 22. 継続的改善・反復
  row(22, "eval", "継続的改善・反復", "OpenAI",
    "プロンプト、評価、モデル選定を反復改善することを推奨。",
    "一度のプロンプトで完全に抑制することは難しいため。"),
  row(22, "eval", "継続的改善・反復", "Anthropic",
    "Iterative refinementを推奨。出力を再入力して検証・修正する。",
    "初回回答に含まれる矛盾や不確実性を後続プロンプトで発見できるため。"),
  row(22, "eval", "継続的改善・反復", "Google/Gemini",
    "Prompt engineeringは反復的であり、プロンプトの言い換え、順序変更、テストを推奨。",
    "用途ごとに安全・正確に動く入力形式を実験で見つける必要があるため。"),

  // 23. Best-of-N / 複数回答比較
  row(23, "eval", "Best-of-N / 複数回答比較", "OpenAI", NA, NA),
  row(23, "eval", "Best-of-N / 複数回答比較", "Anthropic",
    "同じプロンプトを複数回実行し、出力の不一致を確認するBest-of-N verificationを推奨。",
    "出力間の不一致は、ハルシネーションや不安定な推論の兆候になり得るため。"),
  row(23, "eval", "Best-of-N / 複数回答比較", "Google/Gemini",
    "同じプロンプトでも異なる出力が出るため、複数回テストが必要と説明。Best-of-Nとしての明示は記載なし。",
    "稀な問題出力を検出するには複数回の評価が必要なため。"),

  // 24. 長文脈への特別な注意
  row(24, "context", "長文脈への特別な注意", "OpenAI",
    "長いコンテキストでは必要情報を与え、文脈範囲を制約することが重要。",
    "文脈が大きいと確認漏れや不要情報の混入が起きやすいため。"),
  row(24, "context", "長文脈への特別な注意", "Anthropic",
    "長文書では直接引用を先に抽出し、文脈に根拠づけることを推奨。",
    "長文脈では内部記憶と文脈情報が混ざりやすいため。"),
  row(24, "context", "長文脈への特別な注意", "Google/Gemini",
    "長文脈では、文脈を先に置き、質問・指示を最後に置き、明確な橋渡し文を使うことを推奨。",
    "大量文脈の中で、モデルがどの情報に基づくべきかを明確にするため。"),

  // 25. few-shot例を入れる
  row(25, "format", "few-shot例を入れる", "OpenAI",
    "期待する出力形式を例で示すことを推奨。",
    "モデルが望ましいパターンを理解しやすくなるため。"),
  row(25, "format", "few-shot例を入れる", "Anthropic", NA, NA),
  row(25, "format", "few-shot例を入れる", "Google/Gemini",
    "few-shot例を常に含めることを推奨。特に形式・範囲・表現の制御に有効。",
    "例があるとモデルが正解パターンを学び、出力のぶれを減らせるため。"),

  // 26. 構造化出力・JSON Schema
  row(26, "format", "構造化出力・JSON Schema", "OpenAI",
    "Structured Outputsにより、JSONなどの構造をスキーマに従わせることを推奨。",
    "出力の逸脱や余計な情報混入を抑え、機械的検証を可能にするため。"),
  row(26, "format", "構造化出力・JSON Schema", "Anthropic",
    "公式ハルシネーション低減ページでは記載なし。", NA),
  row(26, "format", "構造化出力・JSON Schema", "Google/Gemini",
    "複雑なJSON形式ではstructured output機能を推奨。",
    "フォーマットを安定させ、後処理や検証を容易にするため。"),

  // 27. 計算・数値処理はコード実行に任せる
  row(27, "tools", "計算・数値処理はコード実行に任せる", "OpenAI",
    "ツール利用が可能なら計算やデータ処理に外部ツールを使う設計が望ましい。",
    "モデル単体では計算・数値・引用整合性を誤ることがあるため。"),
  row(27, "tools", "計算・数値処理はコード実行に任せる", "Anthropic", NA, NA),
  row(27, "tools", "計算・数値処理はコード実行に任せる", "Google/Gemini",
    "Geminiのcode execution toolを、算術・カウント・計算が必要な場合に使うことを推奨。",
    "モデルの暗算や推測ではなく、実行結果に基づけるため。"),

  // 28. 最新日付・知識カットオフを意識させる
  row(28, "context", "最新日付・知識カットオフを意識させる", "OpenAI",
    "OpenAIは知識カットオフがあり、検索なしでは最新情報を取り込めないと説明。",
    "最新論文、撤回情報、ガイドライン変更を内部知識だけで扱えないため。"),
  row(28, "context", "最新日付・知識カットオフを意識させる", "Anthropic", NA, NA),
  row(28, "context", "最新日付・知識カットオフを意識させる", "Google/Gemini",
    "Gemini 3 Flash向けに、現在年や知識カットオフをsystem instructionに入れる例を提示。",
    "時間依存クエリで古い前提に基づく誤答を防ぐため。"),

  // 29. 安全リスク評価・ユースケース別リスク評価
  row(29, "safety", "安全リスク評価・ユースケース別リスク評価", "OpenAI",
    "重要情報や高リスク領域では検証を強めるべきとする。",
    "医学・法律などでは誤情報の影響が大きいため。"),
  row(29, "safety", "安全リスク評価・ユースケース別リスク評価", "Anthropic",
    "高リスク判断では検証が必要。",
    "ハルシネーションが重大な結果につながり得るため。"),
  row(29, "safety", "安全リスク評価・ユースケース別リスク評価", "Google/Gemini",
    "アプリの安全リスクを理解し、深刻度・可能性・緩和策を検討することを推奨。",
    "用途ごとに許容できるリスクが異なり、必要な対策量も変わるため。"),

  // 30. 手動評価・人間の確認
  row(30, "human-review", "手動評価・人間の確認", "OpenAI",
    "重要情報は人間が信頼できる情報源で確認することを推奨。",
    "AI出力は補助であり、最終的な正確性は一次情報で確認すべきため。"),
  row(30, "human-review", "手動評価・人間の確認", "Anthropic",
    "Critical informationは常に検証すべきとする。",
    "技術的にハルシネーションを完全にゼロにできないため。"),
  row(30, "human-review", "手動評価・人間の確認", "Google/Gemini",
    "Post-processing、rigorous manual evaluation、人間レビューを重視。",
    "AIが不正確・有害・予期しない出力を出す可能性が残るため。"),

  // 31. ユーザーフィードバックと監視
  row(31, "ops", "ユーザーフィードバックと監視", "OpenAI", NA, NA),
  row(31, "ops", "ユーザーフィードバックと監視", "Anthropic", NA, NA),
  row(31, "ops", "ユーザーフィードバックと監視", "Google/Gemini",
    "ユーザーからのフィードバック収集、使用状況の監視を推奨。",
    "事前テストでは見つからない問題を運用中に発見し、改善するため。"),

  // 32. 安全フィルタ・有害入力のブロック
  row(32, "safety", "安全フィルタ・有害入力のブロック", "OpenAI", NA, NA),
  row(32, "safety", "安全フィルタ・有害入力のブロック", "Anthropic", NA, NA),
  row(32, "safety", "安全フィルタ・有害入力のブロック", "Google/Gemini",
    "入力ブロック、出力フィルタ、安全設定、分類器によるリスク判定を推奨。",
    "有害・攻撃的・不適切な入力や出力を抑え、誤情報以外の安全リスクも下げるため。"),

  // 33. プロンプトインジェクション・悪用対策
  row(33, "safety", "プロンプトインジェクション・悪用対策", "OpenAI", NA, NA),
  row(33, "safety", "プロンプトインジェクション・悪用対策", "Anthropic", NA, NA),
  row(33, "safety", "プロンプトインジェクション・悪用対策", "Google/Gemini",
    "deliberate misuseやprompt injectionへの防御、利用制限、ユーザーIDなどのセーフガードを推奨。",
    "悪意ある入力により、モデルが本来の指示を無視して危険・誤情報を出すのを防ぐため。"),

  // 34. 低リスクな機能設計に寄せる
  row(34, "safety", "低リスクな機能設計に寄せる", "OpenAI", NA, NA),
  row(34, "safety", "低リスクな機能設計に寄せる", "Anthropic", NA, NA),
  row(34, "safety", "低リスクな機能設計に寄せる", "Google/Gemini",
    "機能を低リスクな範囲に限定することを推奨。例：ゼロから文章作成ではなく、下書き拡張や言い換えにする。",
    "タスク範囲を狭め、人間の監督を増やすほど、誤情報の影響範囲を小さくできるため。"),

  // 35. 誠実さを訓練レベルで組み込む
  row(35, "training", "誠実さを訓練レベルで組み込む", "OpenAI", NA, NA),
  row(35, "training", "誠実さを訓練レベルで組み込む", "Anthropic",
    "提示文では、誠実さを訓練段階で組み込むことが重要と整理。",
    "プロンプトは会話内の対症療法であり、訓練はモデルの根本傾向を変えるため。"),
  row(35, "training", "誠実さを訓練レベルで組み込む", "Google/Gemini", NA, NA),

  // 36. 「役に立とうとする圧力」への対処
  row(36, "training", "「役に立とうとする圧力」への対処", "OpenAI", NA, NA),
  row(36, "training", "「役に立とうとする圧力」への対処", "Anthropic",
    "提示文では、誤答より正直な不知を評価する設計が重要と整理。",
    "「何か答えなければならない」という圧力がハルシネーションの根源になり得るため。"),
  row(36, "training", "「役に立とうとする圧力」への対処", "Google/Gemini", NA, NA),
];

/** カテゴリ ID → 日本語ラベル */
export const HS_CATEGORY_LABEL: Record<string, string> = {
  verification: "1. 検証・確認",
  grounding: "2. グラウンディング・外部接続",
  uncertainty: "3. 不確実性の表明",
  "prompt-design": "4. プロンプト設計",
  format: "5. 出力形式",
  citation: "6. 引用・出典",
  reasoning: "7. 段階的思考・分解",
  params: "8. モデルパラメータ",
  eval: "9. 評価・反復",
  context: "10. 文脈管理",
  tools: "11. 外部ツール",
  safety: "12. 安全策",
  "human-review": "13. 人間レビュー",
  ops: "14. 運用監視",
  training: "15. 訓練レベル",
};

export interface HsReference {
  label: string;
  url: string;
}

export const HS_REFERENCES: HsReference[] = [
  {
    label: "OpenAI Help: Does ChatGPT tell the truth?",
    url: "https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth",
  },
  {
    label: "OpenAI Help: Best practices for prompt engineering with the OpenAI API",
    url: "https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api",
  },
  {
    label: "OpenAI Developers: Prompt engineering",
    url: "https://developers.openai.com/api/docs/guides/prompt-engineering",
  },
  {
    label: "Anthropic Claude Docs: Reduce hallucinations",
    url: "https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations",
  },
  {
    label: "Google Gemini API Docs: Safety and factuality guidance",
    url: "https://ai.google.dev/gemini-api/docs/safety-guidance",
  },
  {
    label: "Google Gemini API Docs: Prompt design strategies",
    url: "https://ai.google.dev/gemini-api/docs/prompting-strategies",
  },
  {
    label: "Google Cloud Vertex AI: Grounding overview",
    url: "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/overview",
  },
];
