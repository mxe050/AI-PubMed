import { useState } from "react";
import type { AppSettings, PubMedArticle } from "../types";
import { extractPmidsCategorized } from "../utils/extractPmidsCategorized";
import type { ExtractedPmid } from "../utils/extractPmidsCategorized";
import { extractUrls, extractDois } from "../utils/extractCitations";
import { extractCitationCandidates } from "../utils/extractCitationCandidates";
import { verifyPmidsWithAbstracts } from "../api/verifyPmidsWithAbstracts";
import {
  verifyCitationCandidates,
  type CitationVerifyResult,
} from "../api/verifyCitationCandidates";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";
import { getEvidenceBadge, getRetractionStatus } from "../utils/evidenceLevel";
import { checkMetadataMatch } from "../utils/metadataMatch";

interface Props {
  settings: AppSettings;
}

interface VerifiedItem {
  extracted: ExtractedPmid;
  article?: PubMedArticle; // undefined if not verified
}

export function FactCheckTab({ settings }: Props) {
  const [aiResponse, setAiResponse] = useState("");
  const [hasRun, setHasRun] = useState(false);

  const [items, setItems] = useState<VerifiedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Citation candidate verification (titles, author+year)
  const [citationResults, setCitationResults] = useState<
    CitationVerifyResult[]
  >([]);
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationError, setCitationError] = useState<string | null>(null);

  const extractedPmids = extractPmidsCategorized(aiResponse);
  const extractedUrls = extractUrls(aiResponse);
  const extractedDois = extractDois(aiResponse);
  const citationExtraction = extractCitationCandidates(aiResponse);
  const extractedCitations = citationExtraction.candidates;
  const skippedAuthorYearOnly = citationExtraction.skippedAuthorYearOnly;
  const combinedAuthorYearCount = citationExtraction.combinedAuthorYearCount;

  const explicitCount = extractedPmids.filter(
    (e) => e.confidence === "explicit"
  ).length;
  const urlPmidCount = extractedPmids.filter(
    (e) => e.confidence === "pubmed_url"
  ).length;
  const bareCount = extractedPmids.filter(
    (e) => e.confidence === "bare_number"
  ).length;

  function handleClear() {
    if (!aiResponse && items.length === 0 && citationResults.length === 0) {
      return;
    }
    if (
      !confirm("貼り付けた内容と検証結果をすべてクリアして最初からやり直しますか？")
    ) {
      return;
    }
    setAiResponse("");
    setHasRun(false);
    setItems([]);
    setError(null);
    setCitationResults([]);
    setCitationError(null);
    setLoading(false);
    setCitationLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const [aiCheckPromptCopied, setAiCheckPromptCopied] = useState(false);

  function buildAiFactCheckPrompt(): string {
    return `あなたは医学・学術文献のファクトチェック専門家です。
以下の AI 回答に含まれる**すべての引用情報**（PMID、DOI、論文タイトル、著者名、雑誌名、年、URL など）について、**実際にウェブを検索・PubMed を検索・URL にアクセス**して、実在を確認してください。

# 絶対ルール（厳守）

1. **「ありそう」「おそらく実在」「記憶では存在する」と書くのは禁止**です。実際に検索して確認してください。
2. **PubMed で検索した結果を必ず明示**してください。
   - PMID が示されている場合：\`pubmed.ncbi.nlm.nih.gov/<PMID>/\` にアクセスして実在を確認
   - PMID がない場合：タイトル全文または「著者名+年」で PubMed 検索
3. **URL は実際にアクセス**して、200 OK で開けるか、内容が引用と一致するかを確認してください。
4. **見つからなかった引用は必ず「なかった」「未確認」「捏造の可能性」と明記**してください。
   - 「もしかしたら別の検索式で見つかるかも」のような曖昧表現は禁止
5. **PubMed の通常検索で見つからなければ、Google Scholar / Crossref / 出版社サイト**でも追加検索してください。
6. ファクトチェックの結果として、**元の AI 回答テキストをそのまま再掲**し、**各引用箇所にインライン注釈**（[✓ PMID実在] / [✗ 存在しない] / [⚠ メタデータ不一致] 等）を付けてください。

---

# ファクトチェック対象（元のAI回答）

\`\`\`
${aiResponse}
\`\`\`

---

# 出力フォーマット

## 1. 元のAI回答（インライン注釈付き）
元の回答テキストをそのまま再掲し、引用部分の直後に \`[✓...]\` / \`[✗...]\` / \`[⚠...]\` 形式で注釈を入れてください。

例：
> 「Smith et al. (2020) は〜と報告した [✓ PubMed実在: PMID 12345678 — Smith JH et al. 'Title here.' NEJM 2020]」
> 「Tanaka et al. (2019) の研究では〜 [✗ なかった: PubMed・Google Scholar 共に該当論文なし。捏造の可能性が高い]」
> 「https://example.com/paper.pdf [⚠ URLは存在するが、内容は引用と一致しない（タイトル不一致）]」

## 2. 引用ごとの詳細表

| 元の引用テキスト | 種類 | 確認結果 | 確認URL/PMID | 備考 |
|---|---|---|---|---|

種類欄：PMID / DOI / タイトル / 著者+年 / URL / その他

確認結果欄：
- ✓ 実在確認済み
- ✗ なかった（PubMed・Google Scholar・Web で確認できず）
- ⚠ 一部一致（PMID は実在するがメタデータが一致しない 等）

## 3. 「なかった」リスト（最重要）

以下の引用は確認できませんでした：

| 元の引用テキスト | 検索した方法 | 結果 |
|---|---|---|

ここでは推測を入れず、**「PubMed で X を検索 → 該当なし」「Google Scholar で Y を検索 → 該当なし」**のように事実だけを書いてください。

## 4. 「URL なかった」リスト

| URL | アクセス結果 | 内容一致 |
|---|---|---|

## 5. ファクトチェック総合判定

- 実在確認できた引用：N 件
- なかった（捏造の可能性）：N 件
- メタデータ不一致：N 件
- 確認できなかった URL：N 件

**結論**：本AI回答の信頼性に関するあなたの判断（捏造が多い / 概ね正確 / 部分的にハルシネーションあり 等）を率直に書いてください。

---

# 重要な再確認

- 「なかった」と判定した引用は、本当に実際に PubMed・Google Scholar・Web で検索して見つからなかったものだけにしてください。
- 検索していないのに「なかった」と書くことは禁止です。
- 検索したが見つからなかったものは「**なかった**」と必ず明記してください。「不明」や「曖昧」では不十分です。
`;
  }

  async function handleCopyAiCheckPrompt() {
    const text = buildAiFactCheckPrompt();
    try {
      await navigator.clipboard.writeText(text);
      setAiCheckPromptCopied(true);
      setTimeout(() => setAiCheckPromptCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setAiCheckPromptCopied(true);
      setTimeout(() => setAiCheckPromptCopied(false), 2000);
    }
  }

  async function handleStart() {
    setHasRun(true);
    setItems([]);
    setError(null);
    setCitationResults([]);
    setCitationError(null);

    const limiter = createNcbiRateLimiter(settings);

    // 1) PMID-based verification
    if (extractedPmids.length > 0) {
      setLoading(true);
      try {
        const verified = await verifyPmidsWithAbstracts(
          extractedPmids.map((e) => e.pmid),
          settings,
          limiter
        );
        const verifiedMap = new Map(verified.map((a) => [a.pmid, a]));
        const merged: VerifiedItem[] = extractedPmids.map((e) => {
          const article = verifiedMap.get(e.pmid);
          return {
            extracted: e,
            article: article && article.verified ? article : undefined,
          };
        });
        setItems(merged);
      } catch (e) {
        setError(e instanceof Error ? e.message : "PubMed検索に失敗しました");
      } finally {
        setLoading(false);
      }
    }

    // 2) Citation candidate verification (titles, author+year)
    if (extractedCitations.length > 0) {
      setCitationLoading(true);
      try {
        const results = await verifyCitationCandidates(
          extractedCitations,
          settings,
          limiter
        );
        setCitationResults(results);
      } catch (e) {
        setCitationError(
          e instanceof Error ? e.message : "タイトル・著者照合に失敗しました"
        );
      } finally {
        setCitationLoading(false);
      }
    }
  }

  const verified = items.filter((i) => i.article);
  const unverified = items.filter((i) => !i.article);

  // Retraction summary across verified
  const retractionFlags = verified
    .map((v) => ({
      pmid: v.article!.pmid,
      status: getRetractionStatus(v.article!),
    }))
    .filter(
      (r) =>
        r.status.isRetracted ||
        r.status.isRetractionNotice ||
        r.status.hasExpressionOfConcern ||
        r.status.hasErratum ||
        r.status.isDuplicate
    );

  return (
    <div className="fact-check-tab">
      <header className="fact-check-header">
        <h2>
          <span className="tab-main-dot" aria-hidden="true">●</span>
          AI出力ファクトチェック（メイン機能）
        </h2>
        <p className="hint">
          このタブは <strong>3段階のチェック</strong>{" "}
          を提供します。すべて自動化されるわけではなく、最終判断は人間の役目です。
        </p>
        <ol className="fact-check-overview">
          <li>
            <strong>Step 1: PMID実在性チェック</strong>{" "}
            — AI回答内のPMID候補をPubMedで照合し、実在を判定（自動）
          </li>
          <li>
            <strong>Step 2: 引用メタデータ一致チェック</strong>{" "}
            — AI回答中の年・DOI・著者・雑誌名と、PubMedメタデータの照合（自動）
          </li>
          <li>
            <strong>Step 3: 引用が主張を支持しているかの検証</strong>{" "}
            — 各論文ごとに「主張検証プロンプト」を生成 → 外部AIで検証（手動）
          </li>
        </ol>
      </header>

      <section className="fact-check-section">
        <h3>1. AI回答を貼り付け</h3>
        <p className="hint">
          外部AIに質問してから、その回答全体をここに貼り付けてください。
        </p>
        <textarea
          value={aiResponse}
          onChange={(e) => setAiResponse(e.target.value)}
          rows={12}
          placeholder="ChatGPT / Claude / Gemini などからのAI回答全体をここに貼り付けてください..."
          style={{ width: "100%" }}
        />

        {aiResponse && (
          <div className="detected-summary">
            <p>
              <strong>抽出された候補：</strong>
            </p>
            <ul>
              <li>
                明示PMID（"PMID 12345"形式）: <strong>{explicitCount}</strong> 件
              </li>
              <li>
                PubMed URL由来 PMID: <strong>{urlPmidCount}</strong> 件
              </li>
              <li>
                裸の数字（5〜9桁の数字。誤検出含む）: <strong>{bareCount}</strong> 件
              </li>
              <li>
                DOI候補: <strong>{extractedDois.length}</strong> 件
              </li>
              <li>
                URL: <strong>{extractedUrls.length}</strong> 件
              </li>
              <li>
                <strong>論文タイトル候補（PMID無し引用の照合用）</strong>:{" "}
                <strong>{extractedCitations.length}</strong> 件
                {combinedAuthorYearCount > 0 && (
                  <>
                    （うち {combinedAuthorYearCount} 件は近接の「著者+年」と統合してクエリ強化済み）
                  </>
                )}
              </li>
              {skippedAuthorYearOnly.length > 0 && (
                <li className="warning-text">
                  「著者+年」のみで近くにタイトルが無い引用:{" "}
                  <strong>{skippedAuthorYearOnly.length}</strong> 件
                  → <strong>ファクトチェック対象外</strong>（著者+年だけでは確実な照合不可能なため）
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="button-group">
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={!aiResponse.trim() || loading || citationLoading}
          >
            {loading || citationLoading
              ? "ファクトチェック中..."
              : "ファクトチェックを実行（PubMed照合）"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleCopyAiCheckPrompt}
            disabled={!aiResponse.trim()}
            title="AI（ChatGPT/Claude/Gemini等のWeb検索可能なモデル）に渡してファクトチェックさせるためのプロンプトをコピー"
          >
            {aiCheckPromptCopied
              ? "コピーしました"
              : "AIに渡すファクトチェック用プロンプトをコピー"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={
              !aiResponse && items.length === 0 && citationResults.length === 0
            }
          >
            🗑 すべてクリア
          </button>
        </div>

        <p className="hint">
          <strong>「AIに渡すファクトチェック用プロンプトをコピー」</strong>を押すと、
          上に貼り付けた内容をそのまま含み、外部AI（Web検索可能なモデル：ChatGPT with browsing、Claude with web、Gemini、Perplexity 等）に渡すためのファクトチェックプロンプトが生成されてクリップボードにコピーされます。
          AI が PubMed や Google Scholar や URL を実際に検索・アクセスしてファクトチェックを行います。
          見つからない引用は「なかった」と明示するよう指示しています。
        </p>
      </section>

      {hasRun && (
        <section className="fact-check-section">
          <h3>2. 総合チェック結果サマリー</h3>
          {loading && <p className="hint">PubMed APIで PMID 確認中...</p>}
          {citationLoading && (
            <p className="hint">
              PubMed APIで タイトル・著者+年 を照合中...（候補ごとに1〜数秒かかります）
            </p>
          )}
          {error && <p className="error-text">PMID照合: {error}</p>}
          {citationError && (
            <p className="error-text">タイトル・著者照合: {citationError}</p>
          )}

          {!loading &&
            !citationLoading &&
            extractedPmids.length === 0 &&
            extractedCitations.length === 0 && (
              <p>AI回答にPMID・タイトル候補・著者+年パターンは検出されませんでした。</p>
            )}

          {!loading &&
            !citationLoading &&
            extractedPmids.length === 0 &&
            extractedCitations.length > 0 && (
              <p className="hint">
                AI回答にPMIDは含まれていませんが、論文タイトル・著者+年の候補を{" "}
                <strong>{extractedCitations.length}</strong> 件検出しました。
                これらをPubMedで照合した結果は下のセクション「論文タイトル・著者+年でのPubMed照合」を参照してください。
              </p>
            )}

          {!loading && items.length > 0 && (
            <>
              <div className="verify-summary">
                <span className="verify-count verified">
                  ✓ PMID実在: {verified.length} 件
                </span>
                <span className="verify-count unverified">
                  ✗ PubMedで確認できず: {unverified.length} 件
                </span>
                {retractionFlags.length > 0 && (
                  <span className="verify-count retracted">
                    🚨 撤回・訂正・懸念表明あり: {retractionFlags.length} 件
                  </span>
                )}
              </div>

              {retractionFlags.length > 0 && (
                <div className="retraction-banner">
                  <h4>🚨 重大な警告：撤回・訂正・懸念表明のある論文を含みます</h4>
                  <ul>
                    {retractionFlags.map((r) => (
                      <li key={r.pmid}>
                        PMID {r.pmid} ：
                        {r.status.isRetracted && " 撤回論文 (Retracted Publication)"}
                        {r.status.isRetractionNotice && " 撤回通知 (Retraction Notice)"}
                        {r.status.hasExpressionOfConcern &&
                          " 懸念表明 (Expression of Concern)"}
                        {r.status.hasErratum && " 訂正あり (Erratum)"}
                        {r.status.isDuplicate && " 重複出版 (Duplicate Publication)"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="hint">
                注意：このアプリの「PMID実在チェック」と「メタデータ一致チェック」は自動で行われますが、
                <strong>「AIの主張がその論文に支持されているか」は別問題</strong>です。
                各カードの「主張検証プロンプト」を使い、外部AIに本文・抄録ベースの検証をさせてください。
              </p>
            </>
          )}
        </section>
      )}

      {hasRun && unverified.length > 0 && (
        <section className="fact-check-section">
          <h3>3. PubMedで確認できなかったPMID候補</h3>
          <div className="unverified-section">
            <p className="warning-text">
              以下のPMID候補はPubMedで見つかりませんでした。AIによる<strong>捏造引用</strong>
              の可能性があります。
              ただし、本文中の年号・症例数・ページ番号などを誤抽出した可能性もあります（特に「裸の数字」のみ）。
            </p>
            <table>
              <thead>
                <tr>
                  <th>候補</th>
                  <th>抽出方法</th>
                  <th>PubMed</th>
                  <th>前後の文脈</th>
                </tr>
              </thead>
              <tbody>
                {unverified.map((u) => (
                  <tr key={u.extracted.pmid}>
                    <td>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${u.extracted.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {u.extracted.pmid}
                      </a>
                    </td>
                    <td>
                      <ConfidenceTag confidence={u.extracted.confidence} />
                    </td>
                    <td>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/?term=${u.extracted.pmid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        手動検索
                      </a>
                    </td>
                    <td className="context-cell">{u.extracted.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hasRun && verified.length > 0 && (
        <section className="fact-check-section">
          <h3>4. PubMedで実在確認できたPMID</h3>
          <p className="hint">
            以下は実在が確認された論文です。
            <strong>
              実在＝主張の妥当性ではない
            </strong>
            ことに注意。Step 3の「主張検証プロンプト」を必ず利用してください。
          </p>
          <BulkTranslateButton articles={verified.map((v) => v.article!)} />
          <div className="verified-list">
            {verified.map((v) => (
              <FactCheckArticleCard
                key={v.article!.pmid}
                article={v.article!}
                extracted={v.extracted}
              />
            ))}
          </div>
        </section>
      )}

      {hasRun && extractedCitations.length > 0 && (
        <section className="fact-check-section">
          <h3>4-B. 論文タイトル・著者+年でのPubMed照合（PMID無し引用の確認）</h3>
          <p className="hint">
            AI 回答に PMID が含まれていなくても、引用符内のタイトル・「著者 et al. 年」形式の言及などからPubMed で実際に該当論文があるかを確認します。
            各候補に対して PubMed ESearch を実行し、上位ヒットを表示します。
            「ヒットあり」でも実際に AI が指す論文と一致するかは、タイトル・著者・年を照合してご自身で判断してください。
          </p>

          {citationLoading && (
            <p className="hint">PubMedで照合中...しばらくお待ちください。</p>
          )}

          {citationResults.length > 0 && (
            <div className="citation-results">
              {citationResults.map((r) => (
                <CitationResultCard key={r.candidate.id} result={r} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="fact-check-section">
        <h3>5. URL確認</h3>
        <p className="hint">
          AI回答内のURLを抽出します。各URLをクリックして、リンク先が実在し、AIの主張と一致する内容かを目視で確認してください。
          ブラウザのCORS制限により、自動でのURL存在確認はできません。
        </p>
        {extractedUrls.length === 0 ? (
          aiResponse ? (
            <p>AI回答にURLは含まれていませんでした。</p>
          ) : (
            <p className="hint">先にAI回答を貼り付けてください。</p>
          )
        ) : (
          <ul className="url-list">
            {extractedUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.95;
  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = new Set(
    Array.from(wordsA).filter((w) => wordsB.has(w))
  );
  const union = new Set([...Array.from(wordsA), ...Array.from(wordsB)]);
  return intersection.size / union.size;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function CitationResultCard({ result }: { result: CitationVerifyResult }) {
  const { candidate, hits, totalCount, error } = result;

  const typeLabel: Record<string, string> = {
    quoted_title: "引用符内タイトル",
    italic_title: "イタリック内タイトル",
    english_plain_title: "英語タイトル（平文）",
    title_year_pattern: "タイトル+年",
    author_year: "著者+年",
  };

  // Sort hits by title similarity to the candidate query (so closest-title match comes first).
  const sortedHits = [...hits]
    .map((h) => ({
      hit: h,
      sim: titleSimilarity(h.title ?? "", candidate.query),
    }))
    .sort((a, b) => b.sim - a.sim);

  const bestSim = sortedHits[0]?.sim ?? 0;
  const pubmedSearchUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(candidate.query)}`;
  const advancedSearchUrl = `https://pubmed.ncbi.nlm.nih.gov/advanced/?term=${encodeURIComponent(candidate.query)}`;

  const status = error
    ? "error"
    : hits.length === 0
      ? "no_hit"
      : "hit";

  return (
    <div className={`citation-card citation-${status}`}>
      <div className="citation-header">
        <span className="citation-type-tag">{typeLabel[candidate.type]}</span>
        <span className="citation-display">{candidate.display}</span>
        {status === "hit" && (
          <span className="citation-badge citation-badge-hit">
            ✓ {totalCount}件ヒット
          </span>
        )}
        {status === "no_hit" && (
          <span className="citation-badge citation-badge-no-hit">
            ✗ ヒットなし
          </span>
        )}
        {status === "error" && (
          <span className="citation-badge citation-badge-error">
            エラー
          </span>
        )}
      </div>

      <div className="citation-query-row">
        <code className="citation-query-inline">{candidate.query}</code>
        <button
          className="btn btn-secondary btn-small"
          onClick={() =>
            window.open(pubmedSearchUrl, "_blank", "noopener,noreferrer")
          }
        >
          🔍 このクエリでPubMedで検索
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={() =>
            window.open(advancedSearchUrl, "_blank", "noopener,noreferrer")
          }
        >
          Advanced Search
        </button>
      </div>

      <details className="citation-meta">
        <summary>AI回答中の前後文脈</summary>
        <p className="citation-context">{candidate.context}</p>
      </details>

      {status === "no_hit" && (
        <p className="warning-text">
          ⚠ この候補は PubMed に該当論文が見つかりませんでした。
          AI が捏造した（あるいはタイトル・著者の表記が不正確な）可能性があります。
          表記揺れも考慮し、必要に応じて手動で
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(candidate.query)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {" "}PubMed で確認
          </a>
          してください。
        </p>
      )}

      {status === "hit" && sortedHits.length > 0 && (
        <div className="citation-hits">
          <p className="hint">
            上位 {sortedHits.length} 件のヒット（タイトル類似度の高い順に並び替え）：
          </p>
          <table>
            <thead>
              <tr>
                <th>PMID</th>
                <th>タイトル</th>
                <th>著者</th>
                <th>雑誌・年</th>
                <th>類似度</th>
              </tr>
            </thead>
            <tbody>
              {sortedHits.map(({ hit: h, sim }) => (
                <tr key={h.pmid}>
                  <td>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${h.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {h.pmid}
                    </a>
                  </td>
                  <td>{h.title ?? "(タイトル未取得)"}</td>
                  <td>
                    {h.authors?.slice(0, 3).join(", ") ?? "-"}
                    {h.authors && h.authors.length > 3 && " et al."}
                  </td>
                  <td>
                    {h.journal ?? "-"} {h.year ? `(${h.year})` : ""}
                  </td>
                  <td className="similarity-cell">
                    {(sim * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bestSim < 0.5 && (
            <p className="warning-text">
              ⚠ 上位ヒットでもタイトル類似度が {Math.round(bestSim * 100)}% と低めです。
              AI が指す論文とは別の可能性があります。「このクエリでPubMedで検索」で件数を絞り込んで再確認してください。
            </p>
          )}
          <p className="hint">
            ※ ヒットがあっても AI の指す論文と一致するかは、タイトル・著者・年を目視で確認してください。
            ヒット件数が多い場合（{totalCount} 件）は曖昧マッチの可能性があります。
            上の「このクエリでPubMedで検索」ボタンで PubMed を直接開いて確認してください。
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="error-text">エラー: {error}</p>
      )}
    </div>
  );
}

function ConfidenceTag({
  confidence,
}: {
  confidence: ExtractedPmid["confidence"];
}) {
  if (confidence === "explicit")
    return <span className="conf-tag conf-explicit">明示PMID</span>;
  if (confidence === "pubmed_url")
    return <span className="conf-tag conf-url">URL由来</span>;
  return <span className="conf-tag conf-bare">裸の数字</span>;
}

function FactCheckArticleCard({
  article,
  extracted,
}: {
  article: PubMedArticle;
  extracted: ExtractedPmid;
}) {
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [showClaimCheckPrompt, setShowClaimCheckPrompt] = useState(false);
  const [copied, setCopied] = useState<"summary" | "claim" | null>(null);

  const badge = getEvidenceBadge(article.publicationTypes);
  const retraction = getRetractionStatus(article);
  const meta = checkMetadataMatch(extracted.context, article);

  const summaryPrompt = `以下はPubMedで取得した論文の抄録です。日本語で3〜5行に簡潔に要約してください。
要約には以下を含めてください：
- 研究目的
- 研究デザイン・対象
- 主要な結果
- 結論

# 重要な注意
- 以下に提供されたPubMed情報だけを根拠にしてください
- 外部知識や未提示の論文を追加しないでください
- 抄録に書かれていないことは「抄録からは不明」と明記してください
- 数値、対象集団、介入、比較群、アウトカムは原文に忠実に扱ってください

PMID: ${article.pmid}
Title: ${article.title ?? "(no title)"}
Journal: ${article.journal ?? ""}${article.year ? " (" + article.year + ")" : ""}
${article.authors?.length ? "Authors: " + article.authors.slice(0, 5).join(", ") + (article.authors.length > 5 ? " et al." : "") : ""}
${article.doi ? "DOI: " + article.doi : ""}
${article.publicationTypes?.length ? "Publication Types: " + article.publicationTypes.join(", ") : ""}

Abstract:
${article.abstractText ?? "(抄録は取得できませんでした)"}`;

  const claimCheckPrompt = `あなたは医学論文ファクトチェック支援AIです。
以下のAI回答中の主張と、PubMedから取得した論文情報を比較してください。

# 目的
- AI回答の主張が、この論文の抄録によって支持されているかを判定する
- 4段階で判定: 支持されている / 一部支持 / 支持されていない / 抄録だけでは判断不能
- 数値、対象集団、介入、アウトカム、研究デザインの不一致を指摘する

# 重要ルール
- 以下に提供されたPubMed情報だけを根拠にしてください
- 外部知識や未提示の論文を追加しないでください
- 抄録に書かれていないことは「抄録だけでは判断不能」としてください

# AI回答中の該当箇所（PMID周辺の文脈）
${extracted.context}

# PubMed情報
PMID: ${article.pmid}
Title: ${article.title ?? "(no title)"}
Journal: ${article.journal ?? ""}${article.year ? " (" + article.year + ")" : ""}
${article.authors?.length ? "Authors: " + article.authors.join(", ") : ""}
${article.doi ? "DOI: " + article.doi : ""}
${article.publicationTypes?.length ? "Publication Types: " + article.publicationTypes.join(", ") : ""}
${article.meshTerms?.length ? "MeSH: " + article.meshTerms.join("; ") : ""}

Abstract:
${article.abstractText ?? "(抄録は取得できませんでした — 本文確認が必要)"}

# 出力形式
1. 判定（支持 / 一部支持 / 支持されていない / 抄録だけでは判断不能）
2. 一致している点
3. 不一致または過剰解釈の可能性
4. 抄録だけでは判断できない点（フルテキスト確認が必要な項目）
5. 結論
`;

  async function handleCopy(kind: "summary" | "claim") {
    const text = kind === "summary" ? summaryPrompt : claimCheckPrompt;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="verified-article-card">
      {(retraction.isRetracted ||
        retraction.isRetractionNotice ||
        retraction.hasExpressionOfConcern ||
        retraction.isDuplicate) && (
        <div className="retraction-strong">
          🚨{" "}
          {retraction.isRetracted && "撤回論文 (Retracted Publication) "}
          {retraction.isRetractionNotice && "撤回通知 (Retraction Notice) "}
          {retraction.hasExpressionOfConcern &&
            "懸念表明 (Expression of Concern) "}
          {retraction.isDuplicate && "重複出版 (Duplicate Publication) "}
        </div>
      )}
      {retraction.hasErratum && !retraction.isRetracted && (
        <div className="retraction-mild">ℹ 訂正あり (Erratum)</div>
      )}

      <div className="vac-header">
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="vac-pmid"
        >
          PMID {article.pmid}
        </a>
        <ConfidenceTag confidence={extracted.confidence} />
        <span className={`evidence-badge evidence-${badge.color}`}>
          {badge.hint}
        </span>
        <span className="vac-meta">
          {article.year && <span>{article.year}</span>}
          {article.journal && <span>{article.journal}</span>}
        </span>
      </div>

      <div className="vac-title">{article.title ?? "(タイトル未取得)"}</div>

      {article.authors && article.authors.length > 0 && (
        <div className="vac-authors">
          {article.authors.slice(0, 5).join(", ")}
          {article.authors.length > 5 && " et al."}
        </div>
      )}

      {article.doi && (
        <div className="vac-doi">
          DOI:{" "}
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {article.doi}
          </a>
        </div>
      )}

      {/* Metadata match panel */}
      {meta.hasAnyCheck && (
        <div className="metadata-match">
          <strong>引用メタデータ一致：</strong>
          <ul>
            {meta.yearMatch && (
              <li className={meta.yearMatch.match ? "ok" : "ng"}>
                {meta.yearMatch.match ? "✓" : "⚠"} 年: AI={meta.yearMatch.aiClaim} /
                PubMed={meta.yearMatch.pubmed}
              </li>
            )}
            {meta.doiMatch && (
              <li className={meta.doiMatch.match ? "ok" : "ng"}>
                {meta.doiMatch.match ? "✓" : "⚠"} DOI: AI={meta.doiMatch.aiClaim} /
                PubMed={meta.doiMatch.pubmed}
              </li>
            )}
            {meta.firstAuthorMatch && (
              <li className={meta.firstAuthorMatch.match ? "ok" : "ng"}>
                {meta.firstAuthorMatch.match ? "✓" : "⚠"} 第一著者: PubMed={meta.firstAuthorMatch.pubmed}{" "}
                — AI回答内に
                {meta.firstAuthorMatch.match ? "出現あり" : "出現なし"}
              </li>
            )}
            {meta.journalMatch && (
              <li className={meta.journalMatch.match ? "ok" : "ng"}>
                {meta.journalMatch.match ? "✓" : "⚠"} 雑誌: PubMed={meta.journalMatch.pubmed}{" "}
                — AI回答内に
                {meta.journalMatch.match ? "出現あり" : "明示なし"}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* PMID context (AI text) */}
      <details className="pmid-context">
        <summary>AI回答中の前後文（このPMIDの周辺）</summary>
        <p>{extracted.context}</p>
      </details>

      {/* Abstract */}
      {article.abstractSections && article.abstractSections.length > 0 ? (
        <details className="vac-abstract" open>
          <summary>抄録（構造化）</summary>
          {article.abstractSections.map((s, i) => (
            <div key={i} className="abstract-section">
              {s.label && <strong>{s.label}: </strong>}
              <span>{s.text}</span>
            </div>
          ))}
        </details>
      ) : article.abstractText ? (
        <details className="vac-abstract" open>
          <summary>抄録</summary>
          <p>{article.abstractText}</p>
        </details>
      ) : (
        <p className="vac-no-abstract">
          ⚠ 抄録なし。タイトル・メタデータのみ確認済み。本文内容の検証にはフルテキスト確認が必要です。
        </p>
      )}

      {article.meshTerms && article.meshTerms.length > 0 && (
        <div className="vac-mesh">
          <strong>MeSH:</strong> {article.meshTerms.slice(0, 10).join("; ")}
        </div>
      )}

      {retraction.details.length > 0 && (
        <div className="comments-corrections">
          <strong>関連通知：</strong>
          <ul>
            {retraction.details.map((d, i) => (
              <li key={i}>
                {d.type}
                {d.pmid && (
                  <>
                    {" → "}
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${d.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PMID {d.pmid}
                    </a>
                  </>
                )}
                {d.note && <span className="cc-note"> {d.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-actions">
        <button
          className="btn btn-secondary btn-small"
          onClick={() => setShowSummaryPrompt((v) => !v)}
        >
          {showSummaryPrompt ? "要約プロンプトを隠す" : "抄録要約プロンプト"}
        </button>
        <button
          className="btn btn-primary btn-small"
          onClick={() => setShowClaimCheckPrompt((v) => !v)}
        >
          {showClaimCheckPrompt
            ? "主張検証プロンプトを隠す"
            : "主張検証プロンプト（Step 3）"}
        </button>
      </div>

      {showSummaryPrompt && article.abstractText && (
        <div className="prompt-box">
          <pre className="summary-prompt">{summaryPrompt}</pre>
          <button
            className="btn btn-primary btn-small"
            onClick={() => handleCopy("summary")}
          >
            {copied === "summary" ? "コピーしました" : "プロンプトをコピー"}
          </button>
        </div>
      )}

      {showClaimCheckPrompt && (
        <div className="prompt-box">
          <p className="hint">
            このプロンプトは、AI回答中の<strong>このPMID周辺の主張</strong>
            と、PubMed抄録の内容が一致するかを外部AIに検証させます。
          </p>
          <pre className="summary-prompt">{claimCheckPrompt}</pre>
          <button
            className="btn btn-primary btn-small"
            onClick={() => handleCopy("claim")}
          >
            {copied === "claim" ? "コピーしました" : "プロンプトをコピー"}
          </button>
        </div>
      )}
    </div>
  );
}

function BulkTranslateButton({ articles }: { articles: PubMedArticle[] }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const articleBlocks = articles
    .map((a, idx) => {
      const lines: string[] = [];
      lines.push(`--- [${idx + 1}] PMID ${a.pmid} ---`);
      lines.push(`Title: ${a.title ?? "(no title)"}`);
      if (a.journal)
        lines.push(`Journal: ${a.journal}${a.year ? " (" + a.year + ")" : ""}`);
      if (a.authors?.length) {
        lines.push(
          `Authors: ${a.authors.slice(0, 5).join(", ")}${
            a.authors.length > 5 ? " et al." : ""
          }`
        );
      }
      if (a.publicationTypes?.length) {
        lines.push(`Publication Types: ${a.publicationTypes.join(", ")}`);
      }
      if (a.meshTerms?.length) {
        lines.push(`MeSH: ${a.meshTerms.slice(0, 10).join("; ")}`);
      }
      lines.push(
        `Abstract:\n${a.abstractText ?? "(抄録は取得できませんでした)"}`
      );
      return lines.join("\n");
    })
    .join("\n\n");

  const bulkPrompt = `あなたは医学情報専門家です。以下に、PubMedから取得した ${articles.length} 件の論文の抄録があります。
すべての抄録を読み、次の2段階で日本語化してください。

# 重要ルール
- 以下に提供されたPubMed情報だけを根拠にしてください
- 外部知識や未提示の論文を追加しないでください
- 抄録に書かれていないことは「抄録だけでは不明」と明記してください
- 数値・PMID・固有名詞は原文のまま正確に転記してください

# 第1段階：各抄録の日本語訳と簡潔な要約
それぞれの抄録について、以下の形式で出力してください：

## [番号] PMID xxxxxxx — タイトル日本語訳
- 雑誌・年・著者
- **日本語要約（5〜8行）**：研究目的・対象・主要結果・結論を含む
- **キーポイント（箇条書き2〜4個）**：臨床的に重要な点
- **抄録だけでは判断不能な項目**（あれば箇条書き）

# 第2段階：全${articles.length}件のまとめ
全抄録を横断して以下を日本語で記述してください：

## 共通テーマ
複数の抄録に共通する主題、対象、介入、アウトカムをまとめてください。

## 結論の傾向
結果の方向性（賛成／反対／中立）、効果の大きさ、エビデンスの質を集約してください。
矛盾する結果がある場合は明示してください。

## 主要なエビデンスギャップ
これらの抄録から見えてくる、まだ明確になっていない論点や今後の研究課題を挙げてください。

## 臨床への示唆
医療現場でこれらのエビデンスをどう活用できるかを2〜4行でまとめてください。

---

# 抄録データ（${articles.length}件）

${articleBlocks}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bulkPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = bulkPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bulk-translate-box">
      <h5>全{articles.length}件の抄録を一括で翻訳＋まとめ</h5>
      <p className="hint">
        確認済み抄録{articles.length}件を、AIに「日本語訳＋個別要約＋全体まとめ」させるプロンプトを生成します。
        ChatGPT / Claude / Geminiなどに貼り付けてください。
      </p>
      <div className="button-group">
        <button className="btn btn-primary" onClick={handleCopy}>
          {copied ? "コピーしました" : "全抄録の翻訳＋まとめプロンプトをコピー"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowPrompt((v) => !v)}
        >
          {showPrompt ? "プロンプト本文を隠す" : "プロンプト本文を表示"}
        </button>
      </div>
      {showPrompt && <pre className="summary-prompt">{bulkPrompt}</pre>}
    </div>
  );
}
