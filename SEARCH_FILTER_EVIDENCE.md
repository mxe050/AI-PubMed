# Search filter evidence and limitations

最終更新: 2026-07-11（Asia/Tokyo）

## 重要な前提

- CPG/SR検索には日付制限を使用しない。最新CPGは全年代の候補取得後に版・有効性を判定する。
- CPGとSRは独立して実行し、各レコードの検索元を保持する。
- consensus statement等は正式CPGの代替語として検索しない。
- 公開済みフィルターから改変した式に、原研究の感度・precisionを転用しない。
- focused updateは基礎ガイドラインを自動的に全面置換しない。状態不明は `needs_manual_review` とする。
- 既知集合のrecallは完全な網羅性を保証しない。未審査集合からprecision/NNSを算出しない。
- PubMedでの書誌確認は、内容・推奨・主張の妥当性を保証しない。

## 採用した式

`CPG_QUERY = (TOPIC_QUERY) AND (("practice guideline"[pt] OR guideline*[ti]))`

`SR_QUERY = (TOPIC_QUERY) AND (((systematic[sb] OR "meta-analysis"[pt] OR "meta-analysis"[ti] OR "meta-analyses"[ti] OR "meta analysis"[ti] OR "meta analyses"[ti] OR metaanaly*[ti]) NOT (protocol*[ti] OR "scoping review"[pt] OR "scoping review*"[ti])))`

## Evidence table

| Search block | Exact syntax | Purpose | Source | DOI / official document | Database/interface | Published performance | Used exactly or modified | Reason for modification | Local validation result | Remaining limitations |
|---|---|---|---|---|---|---|---|---|---|---|
| CPG-1 (adopted) | `"practice guideline"[pt] OR guideline*[ti]` | 正式CPG候補の簡潔な高感度探索 | Lunny et al.; InterTASCを参照 | 10.1016/j.jclinepi.2019.09.022 | PubMed | この完全一致式の性能値なし | modified / locally unvalidated | consensus・position等を対象外にし、未索引タイトルを補う | 2026-07-11 全PubMed件数のみ実測。既知集合なし | CPG以外のguideline題名を含み得る。正式性・current状態は検索後確認 |
| CPG-2 | `"practice guideline"[pt] OR "clinical practice guideline*"[ti] OR "practice guideline*"[ti] OR "clinical guideline*"[ti] OR (guideline*[ti] NOT medline[sb])` | より狭い比較候補 | 本プロジェクト候補 | PubMed Help / MeSH | PubMed | 未検証 | candidate | MEDLINE索引前/非MEDLINEをタイトルで補完 | 件数のみ実測。CPG-1より少ないが既知集合未評価のため不採用 | 件数減少をprecision向上とは呼べない。既知CPGを失う可能性 |
| CADTH broad / MD Anderson原式 | 原式は本実装へ組み込まない | 公開CPGフィルター比較 | Lunny et al. | 10.1016/j.jclinepi.2019.09.022 | PubMed | 論文報告値は原式・検証集合に限定 | not used | 本目的で対象外のconsensus等を含み、低precision | 原式の付録を原文どおり再取得・再実行していない | 推測再構成を避けた。今後原式と検証集合を取得して比較 |
| SR_CORE (adopted) | `systematic[sb] OR "meta-analysis"[pt] OR ... OR metaanaly*[ti]` | SR・meta-analysis・NMAの基本集合 | NLM Systematic Reviews Filter Strategy; PubMed Help | NLM official documents | PubMed | 結合式全体の性能値なし | modified | systematic[sb]だけでなくMeta-Analysis PT/タイトルを補完 | 件数・Query Translation実測。既知集合なし | systematic[sb]自体が2018年式。全文判定なしでは適格性不明 |
| Network Meta-Analysis PT | SR_COREの`"meta-analysis"[pt]`に包含 | NMA回収 | NLM MeSH Browser 2026; PubMed Help | Meta-Analysis D017418 / Network Meta-Analysis D000099094 | PubMed | 性能値なし | hierarchy used exactly | Network Meta-AnalysisはMeta-Analysisの下位。`[pt]`は下位PTを自動展開 | 公式階層確認済み | 索引前レコードはタイトル語等に依存 |
| SR_SENSITIVITY_EXTENSION | 検索DB語 AND selection/eligibility語（抄録） | COREで漏れる既知SRの追加候補 | Salvador-Oliván et al.を参照 | 10.1186/s12874-021-01438-x | PubMed | 本ブロック単独の本プロジェクト性能なし | opt-in / disabled | 一次研究・方法論・narrative review等のノイズを避けCOREから分離 | `EXTENSION NOT CORE`件数のみ実測 | 人手判定までprecision/NNSを計算しない。既知集合で追加recallが確認された場合のみ使用 |
| SR_UMBRELLA_EXTENSION | `"umbrella review*"[ti] OR "overview of reviews"[ti] OR "review of reviews"[ti]` | reviews of reviews | プロトコルの適格基準 | title terms | PubMed | 未検証 | opt-in / disabled | 通常のSRとは別の適格性 | `EXTENSION NOT CORE`件数のみ実測 | 明示的に適格な場合のみ使用 |
| SR_RAPID_REVIEW_EXTENSION | `"rapid review*"[ti]` | rapid review | プロトコルの適格基準 | title term | PubMed | 未検証 | opt-in / disabled | 通常のSRとは別の適格性 | `EXTENSION NOT CORE`件数のみ実測 | 明示的に適格な場合のみ使用 |
| CPG_EXCLUSIONS | 空 | 陽性的CPG同定 | 本プロジェクト設計 | — | PubMed | — | local | consensus等をNOTで除外せず、そもそも包含語へ入れない | 静的テスト済み | 不適格候補は検索後の発行主体・文書種別確認が必要 |
| SR_EXCLUSIONS | `protocol*[ti] OR "scoping review"[pt] OR "scoping review*"[ti]` | 明示protocol/scoping review除外 | PubMed Help / NLM PT | NLM official documents | PubMed | 結合後性能なし | limited local exclusion | `scoping[ti]`単独やcomment/editorial等の危険なNOTを避ける | 静的テスト・件数実測 | 複合PT・誤索引は手動確認が必要 |

## Publication Type階層の確認

PubMed HelpはPublication Typeが階層化され、検索時に下位Publication Typeを自動包含し、`[pt:noexp]`で停止できると説明している。NLM MeSH Browser 2026ではNetwork Meta-Analysis (`V03.600.001`) がMeta-Analysis (`V03.600`) の下位にある。したがって既定SR_COREでは `"network meta-analysis"[pt]` を重複記載しない。

## 査読時に報告する事項

データベース/インターフェース、完全な検索式、最終検索日、日付制限なし、各拡張の有無、既知集合の作成方法、Query Translation、警告、重複除去時のprovenance保持、版判定の根拠を報告する。RCT以外をCochrane検証済みと記載しない。

## 参考資料

- NLM. Search Strategy Used to Create the PubMed Systematic Reviews Filter. 最終改訂2018年12月。
- NLM. PubMed Help: Publication Type `[pt]`, Systematic Reviews, Retraction filters.
- NLM MeSH Browser 2026. Meta-Analysis / Network Meta-Analysis.
- NCBI. E-utilities Usage Guidelines and API Keys.
- Lunny C, et al. J Clin Epidemiol. 2020;117:109-116. DOI: 10.1016/j.jclinepi.2019.09.022.
- Escobar Liquitay CM, et al. Cochrane Database Syst Rev. 2023;MR000054.

