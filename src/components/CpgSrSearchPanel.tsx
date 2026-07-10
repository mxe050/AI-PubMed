import { useMemo, useState } from 'react';
import type { AppSettings, PubMedSearchResult } from '../types';
import {
  CPG_FILTER,
  CPG_FILTER_CANDIDATE_2,
  SR_CORE,
  SR_EXCLUSIONS,
} from '../search/cpgSrFilters';
import { buildCpgQuery, buildSrQuery } from '../search/cpgSrQueries';
import { validatePubMedQuery } from '../search/queryValidator';
import { parseKnownPmids } from '../utils/knownPmidBenchmark';
import { PubMedSearchBox } from './PubMedSearchBox';
import { SrPubMedResultTable } from './SrPubMedResultTable';

interface Props {
  settings: AppSettings;
  topicQuery: string;
}

function Diagnostics({ query, kind }: { query: string; kind: 'cpg' | 'sr' }) {
  const result = useMemo(() => validatePubMedQuery(query, kind), [query, kind]);
  return (
    <div className={`query-validation ${result.valid ? 'is-valid' : 'has-error'}`}>
      <strong>{result.valid ? '構文検査：実行可能' : '構文検査：エラーあり'}</strong>
      {result.diagnostics.length > 0 && (
        <ul>
          {result.diagnostics.map((item, index) => (
            <li key={`${item.code}-${index}`}>
              [{item.severity}] {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CpgSrSearchPanel({ settings, topicQuery }: Props) {
  const [knownCpg, setKnownCpg] = useState('');
  const [knownSr, setKnownSr] = useState('');
  const [cpgResult, setCpgResult] = useState<PubMedSearchResult | null>(null);
  const [srResult, setSrResult] = useState<PubMedSearchResult | null>(null);

  const queries = useMemo(() => {
    if (!topicQuery.trim()) return { cpg: '', sr: '', error: '' };
    try {
      return {
        cpg: buildCpgQuery(topicQuery),
        sr: buildSrQuery(topicQuery),
        error: '',
      };
    } catch (error) {
      return {
        cpg: '',
        sr: '',
        error: error instanceof Error ? error.message : '検索式を生成できません',
      };
    }
  }, [topicQuery]);

  const cpgPmids = useMemo(() => parseKnownPmids(knownCpg), [knownCpg]);
  const srPmids = useMemo(() => parseKnownPmids(knownSr), [knownSr]);

  return (
    <section className="cpg-sr-independent-search" aria-labelledby="cpg-sr-heading">
      <h3 id="cpg-sr-heading">CPGとSRを独立して検索</h3>
      <div className="safety-note" role="note">
        <strong>全年代を検索します。</strong>
        出版年・登録年・「直近X年」の制限は追加しません。最新CPGは候補取得後に、発行機関のcurrent / superseded情報と版関係を確認して判定します。
      </div>
      <p className="hint">
        同じPMIDが両方に含まれる場合も検索元（CPG / SR）を失わず保持します。CPGとSRをOR結合した便宜的フィルターは、査読用の再現可能な検索として採用していません。
      </p>
      {queries.error && <p className="error-box" role="alert">{queries.error}</p>}

      <div className="cpg-sr-grid">
        <article className="filter-evidence-card">
          <h4>Clinical Practice Guideline</h4>
          <p>
            正式なCPGを陽性的に同定します。consensus statement、position statement、practice parameter、appropriate use criteria等は代替語として含めません。
          </p>
          <p><strong>採用候補（形式的簡素化・未検証）：</strong> <code>{CPG_FILTER}</code></p>
          <details>
            <summary>比較候補 CPG-2</summary>
            <code>{CPG_FILTER_CANDIDATE_2}</code>
            <p className="hint">プロジェクト固有の既知適格集合で比較するまで性能値を付けません。</p>
          </details>
          <label htmlFor="known-cpg-pmids">既知適格CPG PMID（任意）</label>
          <textarea
            id="known-cpg-pmids"
            rows={2}
            value={knownCpg}
            onChange={(event) => setKnownCpg(event.target.value)}
            placeholder="PMIDをカンマまたは改行で入力"
          />
          {cpgPmids.invalidTokens.length > 0 && (
            <p className="date-range-error" role="alert">認識できない値: {cpgPmids.invalidTokens.join(' / ')}</p>
          )}
          <label htmlFor="cpg-query">CPG_QUERY</label>
          <textarea id="cpg-query" readOnly rows={7} value={queries.cpg} />
          {queries.cpg && <Diagnostics query={queries.cpg} kind="cpg" />}
          <PubMedSearchBox
            settings={settings}
            searchString={queries.cpg}
            onResult={setCpgResult}
            retmax={100}
            buttonLabel="CPGを独立検索（上位100件プレビュー）"
            benchmarkPmids={cpgPmids.pmids}
            queryKind="cpg"
            retrievalSource="CPG"
            allowFullIdExport
          />
        </article>

        <article className="filter-evidence-card">
          <h4>Systematic review / meta-analysis</h4>
          <p>
            NLM公式subsetとMeta-Analysisの出版タイプ・タイトル語をCOREにします。抄録ヒューリスティック、umbrella、rapid reviewは既定では追加しません。
          </p>
          <p><strong>SR_CORE：</strong> <code>{SR_CORE}</code></p>
          <p><strong>SR_EXCLUSIONS：</strong> <code>{SR_EXCLUSIONS}</code></p>
          <p className="hint">
            Network Meta-AnalysisはMeta-Analysis出版タイプの下位語であり、[pt]は下位語を自動展開するため重複記載しません。
          </p>
          <label htmlFor="known-sr-pmids">既知適格SR PMID（任意）</label>
          <textarea
            id="known-sr-pmids"
            rows={2}
            value={knownSr}
            onChange={(event) => setKnownSr(event.target.value)}
            placeholder="PMIDをカンマまたは改行で入力"
          />
          {srPmids.invalidTokens.length > 0 && (
            <p className="date-range-error" role="alert">認識できない値: {srPmids.invalidTokens.join(' / ')}</p>
          )}
          <label htmlFor="sr-dedicated-query">SR_QUERY</label>
          <textarea id="sr-dedicated-query" readOnly rows={7} value={queries.sr} />
          {queries.sr && <Diagnostics query={queries.sr} kind="sr" />}
          <PubMedSearchBox
            settings={settings}
            searchString={queries.sr}
            onResult={setSrResult}
            retmax={100}
            buttonLabel="SRを独立検索（上位100件プレビュー）"
            benchmarkPmids={srPmids.pmids}
            queryKind="sr"
            retrievalSource="SR"
            allowFullIdExport
          />
        </article>
      </div>

      {cpgResult && <SrPubMedResultTable result={cpgResult} />}
      {srResult && <SrPubMedResultTable result={srResult} />}
      <p className="hint">
        上位100件表示はUIプレビューです。総件数を候補集合として記録し、完全取得を黙って100件へ切り捨てません。全件のスクリーニング・保存にはPubMed側の検索結果または検証スクリプトを使用してください。
      </p>
    </section>
  );
}
