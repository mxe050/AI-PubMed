// AI回答から ===CLASSIFICATION_START=== ... ===CLASSIFICATION_END=== ブロックを抽出して
// カテゴリ別の論文リストにパースする。

export interface ClassifiedArticle {
  pmid: string;
  authorYear: string;
  title: string;
  journal: string;
  summary: string;
  reputation: string;
}

export interface ClassifiedCategory {
  category: string;
  articles: ClassifiedArticle[];
}

export interface ParseClassificationResult {
  ok: boolean;
  categories: ClassifiedCategory[];
  partial: boolean;
  warnings: string[];
  reason?: string;
}

const FIELD_RE = /([A-Za-zァ-ヿ぀-ゟ一-鿿]+)\s*[:：]\s*([^|]+?)(?=\s*\|\s*[A-Za-zァ-ヿ぀-ゟ一-鿿]+\s*[:：]|$)/g;

function parseLineToArticle(line: string): ClassifiedArticle | null {
  const fields: Record<string, string> = {};
  let m: RegExpExecArray | null;
  FIELD_RE.lastIndex = 0;
  while ((m = FIELD_RE.exec(line)) !== null) {
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    fields[key] = val;
  }
  // PMID は数字だけ抽出（"PMID: 12345"でも"PMID 12345"でも対応）
  const pmidRaw = fields["pmid"] ?? "";
  const pmidMatch = pmidRaw.match(/\d{4,9}/);
  if (!pmidMatch) return null;

  return {
    pmid: pmidMatch[0],
    authorYear: fields["著者年"] ?? fields["authoryear"] ?? "",
    title: fields["タイトル"] ?? fields["title"] ?? "",
    journal: fields["雑誌"] ?? fields["journal"] ?? "",
    summary: fields["要約"] ?? fields["summary"] ?? "",
    reputation: fields["評判"] ?? fields["reputation"] ?? "",
  };
}

export function parseClassificationResponse(
  text: string
): ParseClassificationResult {
  const warnings: string[] = [];
  if (!text || !text.trim()) {
    return {
      ok: false,
      categories: [],
      partial: false,
      warnings: [],
      reason: "AI回答が空です",
    };
  }

  const blockMatch = text.match(
    /===\s*CLASSIFICATION_START\s*===([\s\S]*?)===\s*CLASSIFICATION_END\s*===/
  );
  if (!blockMatch) {
    return {
      ok: false,
      categories: [],
      partial: false,
      warnings: [],
      reason:
        "===CLASSIFICATION_START=== と ===CLASSIFICATION_END=== が見つかりませんでした。AIの回答にこれらのマーカーが含まれているか確認してください。",
    };
  }

  const lines = blockMatch[1]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const categories: ClassifiedCategory[] = [];
  let current: ClassifiedCategory | null = null;
  let unparsedCount = 0;

  for (const line of lines) {
    if (/^PMID\s*[:：]/i.test(line)) {
      if (!current) {
        // PMID 行が来たがカテゴリ未定義 → 「未分類」へ
        current = { category: "未分類", articles: [] };
        categories.push(current);
        warnings.push(
          "カテゴリ見出しなしで論文行が出現しました（「未分類」に集約）"
        );
      }
      const article = parseLineToArticle(line);
      if (article) {
        current.articles.push(article);
      } else {
        unparsedCount++;
      }
    } else {
      // カテゴリ見出し行
      const cat = line.replace(/^[#\-*\s]+/, "").trim();
      if (cat) {
        current = { category: cat, articles: [] };
        categories.push(current);
      }
    }
  }

  // 空カテゴリは除去
  const nonEmpty = categories.filter((c) => c.articles.length > 0);

  if (unparsedCount > 0) {
    warnings.push(
      `${unparsedCount} 件の論文行を完全にパースできませんでした`
    );
  }

  if (nonEmpty.length === 0) {
    return {
      ok: false,
      categories: [],
      partial: false,
      warnings,
      reason:
        "ブロックは見つかりましたが、論文行を1件もパースできませんでした",
    };
  }

  return {
    ok: true,
    categories: nonEmpty,
    partial: warnings.length > 0,
    warnings,
  };
}
