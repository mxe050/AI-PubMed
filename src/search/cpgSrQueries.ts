import {
  CPG_EXCLUSIONS,
  CPG_FILTER,
  FORBIDDEN_DATE_PATTERNS,
  buildSrFilter,
  type SrFilterOptions,
} from './cpgSrFilters';

export type RetrievalSource = 'CPG' | 'SR';

export interface RetrievalProvenance {
  source: RetrievalSource;
  query: string;
  retrievedAt: string;
}

function normalizeTopicQuery(topicQuery: string): string {
  const topic = topicQuery.trim();
  if (!topic) throw new Error('TOPIC_QUERY is required');
  if (FORBIDDEN_DATE_PATTERNS.some((pattern) => pattern.test(topic))) {
    throw new Error('CPG/SR検索のTOPIC_QUERYに日付制限は使用できません');
  }
  return topic;
}

export function buildCpgQuery(topicQuery: string): string {
  const topic = normalizeTopicQuery(topicQuery);
  const exclusion = CPG_EXCLUSIONS ? ` NOT ${CPG_EXCLUSIONS}` : '';
  return `(${topic}) AND (${CPG_FILTER})${exclusion}`;
}

export function buildSrQuery(
  topicQuery: string,
  options: SrFilterOptions = {}
): string {
  const topic = normalizeTopicQuery(topicQuery);
  return `(${topic}) AND (${buildSrFilter(options)})`;
}

export interface ProvenanceRecord {
  pmid: string;
  retrievalSources: RetrievalSource[];
  provenance: RetrievalProvenance[];
}

/** Merge duplicate PMIDs without losing which independent query retrieved them. */
export function mergeRetrievalProvenance(
  records: ProvenanceRecord[]
): ProvenanceRecord[] {
  const merged = new Map<string, ProvenanceRecord>();
  for (const record of records) {
    const current = merged.get(record.pmid);
    if (!current) {
      merged.set(record.pmid, {
        ...record,
        retrievalSources: [...new Set(record.retrievalSources)],
        provenance: [...record.provenance],
      });
      continue;
    }
    current.retrievalSources = [
      ...new Set([...current.retrievalSources, ...record.retrievalSources]),
    ];
    const seen = new Set(
      current.provenance.map((item) => `${item.source}\u0000${item.query}\u0000${item.retrievedAt}`)
    );
    for (const item of record.provenance) {
      const key = `${item.source}\u0000${item.query}\u0000${item.retrievedAt}`;
      if (!seen.has(key)) {
        current.provenance.push(item);
        seen.add(key);
      }
    }
  }
  return [...merged.values()];
}

