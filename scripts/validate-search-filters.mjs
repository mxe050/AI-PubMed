import { readFile, writeFile } from 'node:fs/promises';

const CPG_1 = '("practice guideline"[pt] OR guideline*[ti])';
const CPG_2 = '("practice guideline"[pt] OR "clinical practice guideline*"[ti] OR "practice guideline*"[ti] OR "clinical guideline*"[ti] OR (guideline*[ti] NOT medline[sb]))';
const SR_CORE = '(systematic[sb] OR "meta-analysis"[pt] OR "meta-analysis"[ti] OR "meta-analyses"[ti] OR "meta analysis"[ti] OR "meta analyses"[ti] OR metaanaly*[ti])';
const SR_EXCLUSIONS = '(protocol*[ti] OR "scoping review"[pt] OR "scoping review*"[ti])';
const SR_SENSITIVITY = '((search*[tiab] OR medline[tiab] OR pubmed[tiab] OR embase[tiab] OR cochrane[tiab] OR scopus[tiab] OR "web of science"[tiab] OR "data sources"[tiab]) AND ("study selection"[tiab] OR "selection criteria"[tiab] OR "eligibility criteria"[tiab] OR "inclusion criteria"[tiab] OR "exclusion criteria"[tiab]))';
const SR_UMBRELLA = '("umbrella review*"[ti] OR "overview of reviews"[ti] OR "review of reviews"[ti])';
const SR_RAPID = '("rapid review*"[ti])';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}
const topic = args.get('--topic') || 'all[sb]';
const output = args.get('--output') || 'SEARCH_FILTER_VALIDATION.csv';
const email = args.get('--email') || process.env.NCBI_EMAIL || '';
const apiKey = process.env.NCBI_API_KEY || '';
const interval = apiKey ? 110 : 350;

async function knownPmids(path) {
  if (!path) return [];
  const text = await readFile(path, 'utf8');
  return [...new Set(text.match(/\b\d{1,9}\b/g) || [])];
}

const knownCpg = await knownPmids(args.get('--known-cpg'));
const knownSr = await knownPmids(args.get('--known-sr'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function esearch(term) {
  const body = new URLSearchParams({
    db: 'pubmed', term, retmode: 'json', retmax: '0', usehistory: 'y',
    tool: 'ai_pubmed_filter_validation',
  });
  if (email) body.set('email', email);
  if (apiKey) body.set('api_key', apiKey);
  let error;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
        { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }
      );
      if (response.ok) {
        const json = await response.json();
        const result = json.esearchresult || {};
        return {
          count: Number(result.count || 0),
          translation: result.querytranslation || '',
          warning: JSON.stringify(result.warninglist || {}),
          error: JSON.stringify(result.errorlist || {}),
        };
      }
      error = new Error(`HTTP ${response.status}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (caught) {
      error = caught;
    }
    await sleep(interval * 2 ** attempt + Math.floor(Math.random() * 100));
  }
  throw error || new Error('ESearch failed');
}

function q(filter) {
  return `(${topic}) AND (${filter})`;
}

const candidates = [
  { id: 'CPG-1', query: q(CPG_1), known: knownCpg, baseline: null, limitation: '形式的簡素化・未検証候補' },
  { id: 'CPG-2', query: q(CPG_2), known: knownCpg, baseline: 'CPG-1', limitation: '形式的簡素化・未検証候補' },
  { id: 'SR_CORE', query: q(SR_CORE), known: knownSr, baseline: null, limitation: '候補式全体の性能は未検証' },
  { id: 'SR_DEFAULT', query: q(`(${SR_CORE} NOT ${SR_EXCLUSIONS})`), known: knownSr, baseline: 'SR_CORE', limitation: 'scoping review/protocolの限定除外' },
  { id: 'SR_SENSITIVITY_EXTENSION_NOT_CORE', query: q(`(${SR_SENSITIVITY} NOT ${SR_CORE})`), known: knownSr, baseline: null, contribution: true, limitation: '適格率・precision・NNSは人手判定なしでは算出不可' },
  { id: 'SR_UMBRELLA_EXTENSION_NOT_CORE', query: q(`(${SR_UMBRELLA} NOT ${SR_CORE})`), known: knownSr, baseline: null, contribution: true, limitation: 'プロトコルで適格な場合のみ使用' },
  { id: 'SR_RAPID_EXTENSION_NOT_CORE', query: q(`(${SR_RAPID} NOT ${SR_CORE})`), known: knownSr, baseline: null, contribution: true, limitation: 'プロトコルで適格な場合のみ使用' },
];

const results = new Map();
for (const candidate of candidates) {
  await sleep(interval);
  try {
    const search = await esearch(candidate.query);
    let retrieved = '';
    if (candidate.known.length > 0) {
      const pmidBlock = candidate.known.map((pmid) => `${pmid}[pmid]`).join(' OR ');
      await sleep(interval);
      retrieved = (await esearch(`(${candidate.query}) AND (${pmidBlock})`)).count;
    }
    results.set(candidate.id, { ...candidate, ...search, retrieved, status: 'executed' });
  } catch (error) {
    results.set(candidate.id, {
      ...candidate, count: '', translation: '', warning: '',
      error: error instanceof Error ? error.message : String(error),
      retrieved: '', status: 'failed',
    });
  }
}

for (const item of results.values()) {
  const baseline = item.baseline ? results.get(item.baseline) : undefined;
  if (!baseline || item.status !== 'executed' || baseline.status !== 'executed') continue;
  try {
    await sleep(interval);
    item.added = (await esearch(`(${item.query}) NOT (${baseline.query})`)).count;
    await sleep(interval);
    item.lost = (await esearch(`(${baseline.query}) NOT (${item.query})`)).count;
    item.excludedKnown =
      typeof item.retrieved === 'number' && typeof baseline.retrieved === 'number'
        ? Math.max(0, baseline.retrieved - item.retrieved)
        : '';
  } catch (error) {
    item.warning = [item.warning, `comparison_failed: ${error instanceof Error ? error.message : String(error)}`]
      .filter(Boolean).join(' / ');
  }
}

const header = [
  'filter_id','filter_version','topic_query','search_query','query_translation',
  'total_results','known_eligible_total','known_eligible_retrieved','known_set_recall',
  'added_vs_current','lost_vs_current','additional_contribution','excluded_known_records',
  'executed_at','execution_status','warning','limitation',
];
function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
const executedAt = new Date().toISOString();
const rows = [...results.values()].map((item) => {
  const knownTotal = item.known.length || '';
  const recall = item.known.length > 0 && item.retrieved !== ''
    ? item.retrieved / item.known.length
    : '';
  return [
    item.id, '2026-07-11', topic, item.query, item.translation, item.count,
    knownTotal, item.retrieved, recall, item.added ?? '', item.lost ?? '',
    item.contribution && item.status === 'executed' ? item.count : item.added ?? '',
    item.excludedKnown ?? '', executedAt,
    item.status, [item.warning, item.error].filter(Boolean).join(' / '), item.limitation,
  ].map(csv).join(',');
});
await writeFile(output, [header.join(','), ...rows].join('\n') + '\n', 'utf8');
process.stdout.write(`Wrote ${rows.length} rows to ${output}\n`);
