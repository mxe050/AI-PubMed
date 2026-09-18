import type { PubMedSearchResult, KnownPmidBenchmarkResult } from "../types";
import type { SrTermsByElement } from "./parseSrTermsFromAiResponse";
import type { SrPopulationPreparationContext } from "../prompts/srPopulationReconsideration";

export interface SrSearchProtocol {
  question: string;
  pico: Record<string, string>;
  terms: SrTermsByElement;
  filter: { key: string; label: string; expression: string };
  populationRelation: string;
  populationReason: string;
  preparation: SrPopulationPreparationContext | null;
}

export interface SrSearchRecord {
  id: string;
  searchedAt: string;
  database: "PubMed";
  platform: "NCBI E-utilities";
  query: string;
  queryTranslation: string;
  count: number;
  retrievedPmids: string[];
  warnings: string[];
  benchmark?: KnownPmidBenchmarkResult;
  protocol: SrSearchProtocol;
  note: string;
}

// Keep the exact executed query and an immutable protocol snapshot, never credentials.
export function createSrSearchRecord(
  result: PubMedSearchResult, protocol: SrSearchProtocol,
): SrSearchRecord {
  return structuredClone({
    id: result.id,
    searchedAt: result.fetchedAt,
    database: "PubMed",
    platform: "NCBI E-utilities",
    query: result.query,
    queryTranslation: result.queryTranslation ?? "",
    count: result.count,
    retrievedPmids: result.idList,
    warnings: [...new Set([
      ...(result.warningList ?? []), ...(result.errorList ?? []),
      ...(result.warnings ?? []), ...(result.error ? [result.error] : []),
    ])],
    benchmark: result.knownPmidBenchmark,
    protocol,
    note: "",
  });
}

export function describeBenchmark(benchmark?: KnownPmidBenchmarkResult): string {
  if (!benchmark?.requestedPmids.length) return "未実施（キー論文の指定なし）";
  if (benchmark.error) return `確認不能：${benchmark.error}`;
  if (benchmark.warnings?.length) return "要再確認（照合時の警告あり）";
  return `${benchmark.matchedPmids.length} / ${benchmark.requestedPmids.length}件回収`;
}

export const SR_HANDOFF_CHECKS = [
  { id: "eligibility", label: "PICO・適格基準と検索範囲の整合性を確認した" },
  { id: "vocabulary", label: "MeSH・類義語・綴り違いとAND / ORの構造を確認した" },
  { id: "details", label: "PubMedのSearch Details・Warningsを確認した" },
  { id: "benchmark", label: "キー論文の回収を確認した（未実施なら理由を記録した）" },
  { id: "limits", label: "C・O・研究デザイン・言語・期間の制限と理由を確認した" },
  { id: "sources", label: "他のDB・試験登録・引用追跡などの追加検索を計画した" },
  { id: "peer", label: "情報専門家への検索式レビュー依頼を検討した" },
] as const;

export type SrHandoffChecks = Record<string, boolean>;

export function buildSrJournalMarkdown(
  records: SrSearchRecord[], checks: SrHandoffChecks, notes: string,
): string {
  const sections = records.map((record, index) => {
    const { protocol } = record;
    const terms = Object.entries(protocol.terms).flatMap(([element, rows]) =>
      rows.map((term) =>
        `- ${element}${term.populationGroup ? `/${term.populationGroup}` : ""} [${term.enabled ? "ON" : "OFF"}] ${term.term}${term.fieldTag}：${term.reason}`
      )
    );
    return [
      `## 検索 ${index + 1}`,
      `- 検索日時（UTC）：${record.searchedAt}`,
      "- データベース：PubMed / プラットフォーム：NCBI E-utilities",
      `- ヒット件数（重複除去前）：${record.count}`,
      `- 取得したPMID：${record.retrievedPmids.length}件（プレビュー。全件取得を意味しません）`,
      "- 表示順：relevance",
      `- キー論文回収：${describeBenchmark(record.benchmark)}`,
      `- 研究デザイン：${protocol.filter.label}`,
      `- フィルター式：${protocol.filter.expression || "追加なし"}`,
      `- Pの結合：${protocol.populationRelation || "単一P"}`,
      `- Pの結合を選んだ理由：${protocol.populationReason || "未記録"}`,
      `- 変更理由・判断メモ：${record.note || "未記録"}`,
      "", "### この検索時点の疑問・PICO", protocol.question || "未入力",
      ...Object.entries(protocol.pico).map(([key, value]) => `- ${key}：${value || "未入力"}`),
      "", "### 実行した検索式", record.query,
      "", "### PubMedによる解釈", record.queryTranslation || "取得なし",
      "", "### 警告", ...(record.warnings.length ? record.warnings : ["取得した応答に警告なし（妥当性の保証ではありません）"]),
      "", "### キー論文照合",
      `回収：${record.benchmark?.matchedPmids.join(", ") || "記録なし"}`,
      `未回収候補：${record.benchmark?.missedPmids.join(", ") || "記録なし"}`,
      "照合にエラーや警告がある場合、未回収とは断定しないこと。",
      "", "### 取得PMID（部分集合）", record.retrievedPmids.join(", ") || "0件",
      "", "### 検索語の選択状態", ...terms,
      "", "### 定義・適格基準（この検索時点）",
      protocol.preparation?.selectedDefinitions || "定義の記録なし",
      protocol.preparation?.eligibilityCriteria || "適格基準の記録なし",
      "", "### 参考にした既存SRの検索式",
      protocol.preparation?.existingSearchStrategy || "記録なし",
    ].join("\n");
  });
  return [
    "# SR検索記録・引き継ぎメモ", "",
    "本記録はこの画面のAPI検索のみです。外部PubMedでの操作は自動記録されません。",
    "ヒット件数と取得件数は別です。各検索の件数を足してPRISMAの総数にしないでください。",
    "これは検索記録の補助であり、SRの完成・PRISMA-S準拠・PRESS査読通過を保証しません。",
    "", ...sections, "", "## 提出前の自己確認",
    ...SR_HANDOFF_CHECKS.map((item) => `- [${checks[item.id] ? "x" : " "}] ${item.label}`),
    "", "## 他のDB・追加検索・未完了の作業", notes || "未記録",
    "", "## 方法論の参照",
    "- Cochrane Handbook Chapter 4: https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04",
    "- PRISMA-S (2021): https://doi.org/10.1186/s13643-020-01542-z",
  ].join("\n");
}
