// 分類結果を新しいブラウザタブに描画する
// CSV ダウンロード機能・チェックボックス選択機能付き

import type { ClassifiedCategory } from "./parseClassificationResponse";

export interface RenderContext {
  rawQuestion: string;
  pico: string;
  searchString: string;
  warnings: string[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderClassificationNewTab(
  categories: ClassifiedCategory[],
  ctx: RenderContext
): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "新しいタブを開けませんでした。ブラウザのポップアップブロック設定を確認してください。"
    );
    return;
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // データを window 上に持たせて CSV 生成で参照する
  const dataJson = JSON.stringify(categories);
  const ctxJson = JSON.stringify(ctx);

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>EBM Step 2 — 研究デザイン別 文献分類結果</title>
<style>
  :root {
    --color-primary: #1a56db;
    --color-primary-hover: #1544b0;
    --color-bg: #f8fafc;
    --color-surface: #ffffff;
    --color-border: #e2e8f0;
    --color-text: #1e293b;
    --color-text-secondary: #64748b;
    --color-warning: #d97706;
    --color-warning-bg: #fffbeb;
    --color-info-bg: #eff6ff;
    --radius: 8px;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Hiragino Sans", "Noto Sans JP", sans-serif;
    background: var(--color-bg);
    color: var(--color-text);
    line-height: 1.55;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 16px 60px;
  }
  h1 {
    color: var(--color-primary);
    font-size: 1.4rem;
    margin: 0 0 12px;
  }
  .meta-box {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin-bottom: 16px;
    font-size: 0.88rem;
  }
  .meta-box dt {
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-top: 6px;
  }
  .meta-box dt:first-child { margin-top: 0; }
  .meta-box dd {
    margin: 2px 0 0 0;
    word-break: break-word;
  }
  .warning-box {
    background: var(--color-warning-bg);
    border-left: 3px solid var(--color-warning);
    padding: 10px 14px;
    margin-bottom: 16px;
    border-radius: 4px;
    font-size: 0.88rem;
  }
  .actions-bar {
    position: sticky;
    top: 0;
    background: var(--color-bg);
    padding: 10px 0;
    margin-bottom: 12px;
    z-index: 10;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .btn {
    padding: 8px 14px;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 500;
  }
  .btn-primary {
    background: var(--color-primary);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
  .btn-secondary {
    background: #fff;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }
  .selected-count {
    margin-left: auto;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
  .category-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 14px 16px;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
  }
  .category-section h2 {
    margin: 0 0 8px;
    color: var(--color-primary);
    font-size: 1.1rem;
    border-bottom: 2px solid var(--color-primary);
    padding-bottom: 4px;
  }
  .category-toolbar {
    margin-bottom: 8px;
    font-size: 0.85rem;
  }
  .category-toolbar label {
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th, td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }
  th {
    background: var(--color-info-bg);
    font-weight: 600;
    color: var(--color-text);
  }
  tr:hover td {
    background: #fafbfc;
  }
  td.col-select { width: 40px; text-align: center; }
  td.col-pmid { width: 110px; }
  td.col-author { width: 130px; white-space: nowrap; }
  td.col-journal { width: 160px; }
  td.col-reputation { width: 180px; font-size: 0.8rem; color: var(--color-text-secondary); }
  td a {
    color: var(--color-primary);
    text-decoration: none;
  }
  td a:hover { text-decoration: underline; }

  @media print {
    .actions-bar, .category-toolbar, .col-select, th.col-select { display: none !important; }
    .category-section { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
    body { background: #fff; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>EBM Step 2 — 研究デザイン別 文献分類結果</h1>

  <dl class="meta-box">
    <dt>原質問</dt><dd id="meta-question"></dd>
    <dt>PICO</dt><dd id="meta-pico"></dd>
    <dt>検索式</dt><dd id="meta-search" style="font-family: 'SF Mono', Consolas, monospace; font-size: 0.82rem;"></dd>
    <dt>生成日時</dt><dd>${escapeHtml(today)}</dd>
  </dl>

  <div id="warnings"></div>

  <div class="actions-bar">
    <button class="btn btn-primary" id="btn-csv" disabled>選択した論文をCSVでダウンロード</button>
    <button class="btn btn-secondary" id="btn-select-all">全選択</button>
    <button class="btn btn-secondary" id="btn-clear-all">全解除</button>
    <span class="selected-count" id="selected-count">0 件選択中</span>
  </div>

  <div id="category-list"></div>
</div>

<script>
  const DATA = ${dataJson};
  const CTX = ${ctxJson};

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // メタ情報の挿入
  document.getElementById("meta-question").textContent = CTX.rawQuestion || "（未入力）";
  document.getElementById("meta-pico").textContent = CTX.pico || "（未入力）";
  document.getElementById("meta-search").textContent = CTX.searchString || "（未入力）";

  // 警告の挿入
  if (CTX.warnings && CTX.warnings.length > 0) {
    const warnDiv = document.getElementById("warnings");
    warnDiv.innerHTML = '<div class="warning-box"><strong>⚠ 一部の論文情報が正しく読み取れませんでした：</strong><ul>' +
      CTX.warnings.map(w => '<li>' + escapeHtml(w) + '</li>').join('') +
      '</ul></div>';
  }

  // カテゴリ別テーブルを描画
  const listDiv = document.getElementById("category-list");
  DATA.forEach((cat, ci) => {
    const sec = document.createElement("section");
    sec.className = "category-section";
    sec.innerHTML =
      '<h2>' + escapeHtml(cat.category) + '（' + cat.articles.length + '件）</h2>' +
      '<div class="category-toolbar">' +
        '<label><input type="checkbox" class="cat-toggle" data-cat="' + ci + '"> このカテゴリを全選択 / 全解除</label>' +
      '</div>' +
      '<table>' +
        '<thead><tr>' +
          '<th class="col-select">選択</th>' +
          '<th>PMID</th>' +
          '<th>著者_年</th>' +
          '<th>タイトル</th>' +
          '<th>雑誌</th>' +
          '<th>抄録要約（日本語）</th>' +
          '<th>評判</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cat.articles.map((a, ai) =>
            '<tr>' +
              '<td class="col-select"><input type="checkbox" class="art-check" data-cat="' + ci + '" data-art="' + ai + '"></td>' +
              '<td class="col-pmid"><a href="https://pubmed.ncbi.nlm.nih.gov/' + escapeHtml(a.pmid) + '/" target="_blank" rel="noreferrer">' + escapeHtml(a.pmid) + '</a></td>' +
              '<td class="col-author">' + escapeHtml(a.authorYear) + '</td>' +
              '<td>' + escapeHtml(a.title) + '</td>' +
              '<td class="col-journal">' + escapeHtml(a.journal) + '</td>' +
              '<td>' + escapeHtml(a.summary) + '</td>' +
              '<td class="col-reputation">' + escapeHtml(a.reputation) + '</td>' +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table>';
    listDiv.appendChild(sec);
  });

  function getSelected() {
    const sel = [];
    document.querySelectorAll('.art-check:checked').forEach(cb => {
      const ci = Number(cb.dataset.cat);
      const ai = Number(cb.dataset.art);
      sel.push({ category: DATA[ci].category, article: DATA[ci].articles[ai] });
    });
    return sel;
  }

  function updateSelectedCount() {
    const n = document.querySelectorAll('.art-check:checked').length;
    document.getElementById('selected-count').textContent = n + ' 件選択中';
    document.getElementById('btn-csv').disabled = n === 0;
  }

  document.querySelectorAll('.art-check').forEach(cb => {
    cb.addEventListener('change', updateSelectedCount);
  });

  document.querySelectorAll('.cat-toggle').forEach(cb => {
    cb.addEventListener('change', e => {
      const ci = e.target.dataset.cat;
      const checked = e.target.checked;
      document.querySelectorAll('.art-check[data-cat="' + ci + '"]').forEach(ac => {
        ac.checked = checked;
      });
      updateSelectedCount();
    });
  });

  document.getElementById('btn-select-all').addEventListener('click', () => {
    document.querySelectorAll('.art-check').forEach(cb => cb.checked = true);
    document.querySelectorAll('.cat-toggle').forEach(cb => cb.checked = true);
    updateSelectedCount();
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    document.querySelectorAll('.art-check').forEach(cb => cb.checked = false);
    document.querySelectorAll('.cat-toggle').forEach(cb => cb.checked = false);
    updateSelectedCount();
  });

  function csvCell(v) {
    const s = String(v ?? '');
    if (/[",\\n\\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  document.getElementById('btn-csv').addEventListener('click', () => {
    const selected = getSelected();
    if (selected.length === 0) return;
    const header = ['カテゴリ', 'PMID', '著者_年', 'タイトル', '雑誌', '抄録要約', '評判'];
    const rows = selected.map(s => [
      s.category, s.article.pmid, s.article.authorYear,
      s.article.title, s.article.journal, s.article.summary, s.article.reputation
    ]);
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\\r\\n');
    // Excel が UTF-8 を正しく開けるよう BOM を付ける
    const bom = '\\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = 'ebm_classification_' + today + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
