import {
  CPG_FORBIDDEN_TERMS,
  FORBIDDEN_DATE_PATTERNS,
  FORBIDDEN_NOT_TARGETS,
  SR_SENSITIVITY_EXTENSION,
} from './cpgSrFilters';

export type QueryKind = 'general' | 'cpg' | 'sr' | 'sr_core';
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface QueryDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  target?: string;
  suggestion?: string;
  autoFixable: boolean;
  reference?: string;
}

export interface SearchValidationResult {
  valid: boolean;
  diagnostics: QueryDiagnostic[];
}

const KNOWN_TAGS = new Set([
  'ad', 'all', 'au', 'book', 'ca', 'cn', 'cois', 'conf', 'crdt', 'dp',
  'edat', 'epdat', 'fau', 'filter', 'gr', 'isbn', 'is', 'ip', 'la', 'lid',
  'lr', 'majr', 'mh', 'noexp', 'nm', 'ot', 'own', 'pa', 'pg', 'pmc',
  'pmid', 'ppdat', 'ps', 'pt', 'pubn', 'sb', 'sh', 'si', 'ti', 'tiab',
  'title', 'tw', 'uid', 'vi', 'pdat',
]);

function diagnostic(
  code: string,
  severity: DiagnosticSeverity,
  message: string,
  target?: string,
  suggestion?: string,
  reference?: string
): QueryDiagnostic {
  return { code, severity, message, target, suggestion, autoFixable: false, reference };
}

export function validatePubMedQuery(
  query: string,
  kind: QueryKind = 'general'
): SearchValidationResult {
  const diagnostics: QueryDiagnostic[] = [];
  const trimmed = query.trim();
  if (!trimmed) {
    diagnostics.push(diagnostic('EMPTY_QUERY', 'error', '検索式が空です。'));
    return { valid: false, diagnostics };
  }

  let depth = 0;
  let inQuote = false;
  for (let index = 0; index < query.length; index += 1) {
    const char = query[index];
    if (char === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth < 0) {
        diagnostics.push(diagnostic('UNBALANCED_PARENTHESES', 'error', '閉じ括弧が多すぎます。', String(index)));
        depth = 0;
      }
    }
  }
  if (depth !== 0) diagnostics.push(diagnostic('UNBALANCED_PARENTHESES', 'error', '括弧が対応していません。'));
  if (inQuote) diagnostics.push(diagnostic('UNBALANCED_QUOTES', 'error', 'ダブルクォートが対応していません。'));
  if (/\(\s*\)/.test(query)) diagnostics.push(diagnostic('EMPTY_GROUP', 'error', '空の括弧があります。'));

  if (/^\s*(?:AND|OR|NOT)\b|\b(?:AND|OR|NOT)\s*$/i.test(query) || /\b(?:AND|OR|NOT)\s+(?:AND|OR|NOT)\b/i.test(query)) {
    diagnostics.push(diagnostic('ORPHAN_BOOLEAN', 'error', 'Boolean演算子の位置が不正です。'));
  }
  const lowerBoolean = query.match(/\b(?:and|or|not)\b/g);
  if (lowerBoolean) diagnostics.push(diagnostic('LOWERCASE_BOOLEAN', 'warning', 'Boolean演算子は大文字で記述してください。', lowerBoolean.join(', '), 'AND / OR / NOTへ変更'));

  for (const match of query.matchAll(/\[([^\]]+)\]/g)) {
    const parts = match[1].toLowerCase().split(':');
    if (parts.some((part) => !KNOWN_TAGS.has(part))) {
      diagnostics.push(diagnostic('UNKNOWN_FIELD_TAG', 'error', `不明なフィールドタグです: [${match[1]}]`, match[0], 'PubMed HelpのSearch Field Descriptionsで確認'));
    }
  }

  for (const match of query.matchAll(/\b([^\s()"[\]]*\*[^\s()"[\]]*)/g)) {
    const prefix = match[1].split('*')[0].replace(/[^A-Za-z0-9]/g, '');
    if (prefix.length > 0 && prefix.length < 4) {
      diagnostics.push(diagnostic('SHORT_WILDCARD_PREFIX', 'warning', 'ワイルドカード前は原則4文字以上にしてください。', match[1]));
    }
  }
  if (/\[[^\]]*:~\d+\]/.test(query) && /\*/.test(query)) {
    diagnostics.push(diagnostic('PROXIMITY_WILDCARD', 'error', 'PubMed proximity検索内ではワイルドカードを使用できません。'));
  }

  for (const target of FORBIDDEN_NOT_TARGETS) {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\bNOT\\s+(?:\\([^)]*)?${escaped}`, 'i').test(query)) {
      diagnostics.push(diagnostic('DANGEROUS_NOT', 'error', `適格文献を失い得るNOT条件です: ${target}`, target, '自動除外せず状態フラグと監査ログで扱う'));
    }
  }

  if (kind === 'cpg' || kind === 'sr' || kind === 'sr_core') {
    for (const pattern of FORBIDDEN_DATE_PATTERNS) {
      const match = query.match(pattern);
      if (match) diagnostics.push(diagnostic('DATE_LIMIT_FORBIDDEN', 'error', 'CPG/SR検索に日付制限は使用できません。', match[0], '全年代を検索し、最新版は検索後に判定'));
    }
  }
  if (kind === 'cpg') {
    for (const term of CPG_FORBIDDEN_TERMS) {
      if (query.toLowerCase().includes(term)) diagnostics.push(diagnostic('CPG_FORBIDDEN_TERM', 'error', `CPG対象外の語が含まれています: ${term}`, term));
    }
    if (/systematic\s*\[sb\]|meta-analys/i.test(query)) diagnostics.push(diagnostic('CPG_SR_MIXED', 'error', 'CPG_QUERYにSRフィルターが混在しています。'));
  }
  if (kind === 'sr' || kind === 'sr_core') {
    if (/practice guideline|guideline\*?\[ti\]/i.test(query)) diagnostics.push(diagnostic('CPG_SR_MIXED', 'error', 'SR_QUERYにCPGフィルターが混在しています。'));
    if (kind === 'sr_core' && query.includes(SR_SENSITIVITY_EXTENSION)) diagnostics.push(diagnostic('SR_HEURISTIC_IN_CORE', 'error', '抄録ヒューリスティックはSR_COREへ含めず、独立拡張として評価してください。'));
    if (/\bscoping\[ti\]/i.test(query)) diagnostics.push(diagnostic('BROAD_SCOPING_EXCLUSION', 'error', 'scoping[ti]単独除外は広すぎます。', 'scoping[ti]', '"scoping review"[pt] OR "scoping review*"[ti]'));
  }

  if (/\b(?:P|I|C)\b.*\bAND\b.*\bO\b/i.test(query)) {
    diagnostics.push(diagnostic('OUTCOME_NARROWING', 'warning', 'Outcomeを必須ANDにすると重要文献を失う可能性があります。'));
  }
  if (/"[^"\n]+"(?:\[[^\]]+\])?/.test(query)) {
    diagnostics.push(diagnostic('QUOTED_ATM', 'info', '引用符またはフィールドタグによりAutomatic Term Mappingが抑制される場合があります。'));
  }

  return {
    valid: !diagnostics.some((item) => item.severity === 'error'),
    diagnostics,
  };
}
