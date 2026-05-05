// PubMed の author 配列の第一著者から「姓」だけを取り出す。
// 形式バリエーション：
//   "Tanaka T"           → "Tanaka"
//   "Tanaka, T"          → "Tanaka"
//   "Tanaka Taro"        → "Tanaka"
//   "T Tanaka"           → "Tanaka"   （西洋式の "F. LastName" は誤検出回避が難しい）
//   "van der Berg J"     → "van der Berg"
//   undefined / 空配列   → ""

export function extractFirstAuthorLastName(
  authors: string[] | undefined
): string {
  if (!authors || authors.length === 0) return "";
  const first = (authors[0] ?? "").trim();
  if (!first) return "";

  // "Lastname, FirstInitial" 形式（PubMed esummary の標準形）
  if (first.includes(",")) {
    return first.split(",")[0].trim();
  }

  // "Lastname FI" 形式（PubMed の通常表記、姓 + イニシャル）
  // イニシャルは通常 1〜3 文字の大文字。最後のトークンがイニシャル様であれば
  // 残りを姓として扱う。
  const tokens = first.split(/\s+/);
  if (tokens.length === 1) return tokens[0];

  const last = tokens[tokens.length - 1];
  // 全部大文字 + 1〜3 文字 → イニシャル
  if (/^[A-Z]{1,3}$/.test(last)) {
    return tokens.slice(0, -1).join(" ");
  }

  // それ以外（"Tanaka Taro" のようなフルネーム）は最初のトークンが姓と推定
  return tokens[0];
}

/** "Tanaka 2023" 形式の表示文字列を作る */
export function formatAuthorYear(
  authors: string[] | undefined,
  year: string | undefined
): string {
  const lastName = extractFirstAuthorLastName(authors);
  const y = (year ?? "").trim();
  if (!lastName && !y) return "";
  if (!lastName) return y;
  if (!y) return lastName;
  return `${lastName} ${y}`;
}
