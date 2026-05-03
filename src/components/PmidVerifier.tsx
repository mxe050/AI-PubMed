import { useState } from "react";
import type { AppSettings, PubMedArticle } from "../types";
import { extractPmids } from "../utils/extractPmids";
import { verifyPmids } from "../api/verifyPmids";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";

interface Props {
  settings: AppSettings;
  aiResponse: string;
}

export function PmidVerifier({ settings, aiResponse }: Props) {
  const [results, setResults] = useState<PubMedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectedPmids = extractPmids(aiResponse);

  async function handleVerify() {
    if (detectedPmids.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const limiter = createNcbiRateLimiter(settings);
      const verified = await verifyPmids(detectedPmids, settings, limiter);
      setResults(verified);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PMID確認に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (detectedPmids.length === 0) return null;

  const verifiedCount = results.filter((r) => r.verified).length;
  const unverifiedCount = results.filter((r) => !r.verified).length;

  return (
    <div className="pmid-verifier">
      <h3>PMID実在確認</h3>
      <p>
        AI回答から {detectedPmids.length} 個のPMID候補を検出しました：{" "}
        {detectedPmids.join(", ")}
      </p>

      <button
        className="btn btn-secondary"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? "確認中..." : "PubMed APIで実在確認"}
      </button>

      {error && <p className="error-text">{error}</p>}

      {results.length > 0 && (
        <div className="verify-results">
          <p>
            確認済み: {verifiedCount} 件 / 未確認: {unverifiedCount} 件
          </p>
          <table>
            <thead>
              <tr>
                <th>PMID</th>
                <th>状態</th>
                <th>タイトル</th>
              </tr>
            </thead>
            <tbody>
              {results.map((article) => (
                <tr
                  key={article.pmid}
                  className={article.verified ? "" : "unverified"}
                >
                  <td>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {article.pmid}
                    </a>
                  </td>
                  <td>
                    {article.verified ? (
                      <span className="badge-verified">確認済み</span>
                    ) : (
                      <span className="badge-unverified">未確認 / 不在</span>
                    )}
                  </td>
                  <td>{article.title ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
